import { Client } from "@stomp/stompjs";
import { API_BASE_URL, getAuthToken } from "@/lib/api/apiClient";
import type { MessageResponse } from "@/lib/api/chatApi";

export interface WsEvent<T = unknown> {
  type: string;
  payload?: T;
  chatId?: string | number;
  callId?: string | number;
  transferId?: string | number;
  senderId?: string | number;
  receiverId?: string | number;
}

type SignalHandler = (event: WsEvent) => void;
type CallEventHandler = (event: WsEvent) => void;
type ChatHandler = (event: WsEvent<MessageResponse>) => void;
type NotificationHandler = (event: WsEvent) => void;
type ChatEventHandler = (event: WsEvent) => void;
type FileTransferHandler = (event: WsEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private signalHandlers = new Set<SignalHandler>();
  private callEventHandlers = new Set<CallEventHandler>();
  private chatHandlers = new Map<string, Set<ChatHandler>>();
  private chatSubs = new Map<string, { unsubscribe: () => void }>();
  private notificationHandlers = new Set<NotificationHandler>();
  private chatEventHandlers = new Set<ChatEventHandler>();
  private fileTransferHandlers = new Set<FileTransferHandler>();
  private fileTransferSignalHandlers = new Set<SignalHandler>();
  private userId: number | null = null;

  /** WebRTC media signaling only (OFFER / ANSWER / ICE_CANDIDATE). */
  onSignal(handler: SignalHandler) {
    this.signalHandlers.add(handler);
    return () => { this.signalHandlers.delete(handler); };
  }

  /** Call lifecycle events (INCOMING_CALL, PARTICIPANT_*, CALL_ENDED, …). */
  onCallEvent(handler: CallEventHandler) {
    this.callEventHandlers.add(handler);
    return () => { this.callEventHandlers.delete(handler); };
  }

  sendSignal(msg: Record<string, unknown>) {
    if (!this.client?.connected) return;
    this.client.publish({ destination: "/app/call.signal", body: JSON.stringify(msg) });
  }

  sendFileTransferSignal(msg: Record<string, unknown>) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/filetransfer.signal",
      body: JSON.stringify(msg),
    });
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.add(handler);
    return () => { this.notificationHandlers.delete(handler); };
  }

  onChatEvent(handler: ChatEventHandler) {
    this.chatEventHandlers.add(handler);
    return () => { this.chatEventHandlers.delete(handler); };
  }

  onFileTransferEvent(handler: FileTransferHandler) {
    this.fileTransferHandlers.add(handler);
    return () => {
      this.fileTransferHandlers.delete(handler);
    };
  }

  onFileTransferSignal(handler: SignalHandler) {
    this.fileTransferSignalHandlers.add(handler);
    return () => {
      this.fileTransferSignalHandlers.delete(handler);
    };
  }

  subscribeToChat(chatId: string, cb: ChatHandler) {
    const set = this.chatHandlers.get(chatId) ?? new Set();
    set.add(cb);
    this.chatHandlers.set(chatId, set);
    this.attachChat(chatId);
    return () => {
      set.delete(cb);
      if (set.size === 0) {
        this.chatHandlers.delete(chatId);
        this.chatSubs.get(chatId)?.unsubscribe();
        this.chatSubs.delete(chatId);
      }
    };
  }

  sendMessage(chatId: string, content: string, replyToId?: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        chatId: Number(chatId),
        content,
        type: "TEXT",
        ...(replyToId ? { replyToId: Number(replyToId) } : {}),
      }),
    });
  }

  sendTyping(chatId: string, isTyping: boolean) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ chatId: Number(chatId), isTyping }),
    });
  }

  markAsRead(chatId: string, messageId: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/chat.read",
      body: JSON.stringify({ chatId: Number(chatId), messageId: Number(messageId) }),
    });
  }

  connect(userId: number, token?: string | null) {
    const authToken = token ?? getAuthToken();
    if (!authToken || this.client?.active) return;
    this.userId = userId;
    const wsUrl = API_BASE_URL.replace(/^http(s?)/, "ws$1") + "/ws";

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${authToken}` },
      onConnect: () => {
        for (const chatId of this.chatHandlers.keys()) this.attachChat(chatId);

        // Call lifecycle → onCallEvent handlers.
        this.client?.subscribe("/user/queue/calls", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.callEventHandlers.forEach((h) => h(event));
        });
        // WebRTC media signaling → onSignal handlers.
        this.client?.subscribe("/user/queue/signal", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.signalHandlers.forEach((h) => h(event));
        });
        this.client?.subscribe("/user/queue/notifications", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.notificationHandlers.forEach((h) => h(event));
        });
        this.client?.subscribe("/user/queue/chat-events", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.chatEventHandlers.forEach((h) => h(event));
        });
        // File transfers still use the signal channel.
        this.client?.subscribe("/user/queue/file-transfers", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          if (isRtcSignalType(event.type)) {
            this.fileTransferSignalHandlers.forEach((h) => h(event));
            return;
          }
          this.fileTransferHandlers.forEach((h) => h(event));
        });
      },
      onStompError: (frame) => console.error("STOMP error", frame),
      onWebSocketError: (e) => console.error("WS error", e),
    });
    this.client.activate();
  }

  disconnect() {
    this.chatSubs.forEach((sub) => sub.unsubscribe());
    this.chatSubs.clear();
    this.client?.deactivate();
    this.client = null;
    this.userId = null;
  }

  reconnect() {
    if (this.userId == null) return;
    const uid = this.userId;
    this.disconnect();
    this.connect(uid, getAuthToken());
  }

  private attachChat(chatId: string) {
    if (!this.client?.connected || this.chatSubs.has(chatId)) return;
    const sub = this.client.subscribe(`/topic/chat/${chatId}`, (frame) => {
      const event = JSON.parse(frame.body) as WsEvent<MessageResponse>;
      this.chatHandlers.get(chatId)?.forEach((cb) => cb(event));
    });
    this.chatSubs.set(chatId, { unsubscribe: () => sub.unsubscribe() });
  }
}

function isRtcSignalType(type: string) {
  return type === "OFFER" || type === "ANSWER" || type === "ICE_CANDIDATE";
}

export const websocketService = new WebSocketService();
