import { Client } from "@stomp/stompjs";
import { API_BASE_URL, getAuthToken } from "@/lib/api/apiClient";
import type { MessageResponse } from "@/lib/api/chatApi";

export interface WsEvent<T = unknown> {
  type: string;
  payload?: T;
  chatId?: string | number;
  callId?: string | number;
  senderId?: string | number;
  receiverId?: string | number;
}

type SignalHandler = (event: WsEvent) => void;
type ChatHandler = (event: WsEvent<MessageResponse>) => void;
type NotificationHandler = (event: WsEvent) => void;
type ChatEventHandler = (event: WsEvent) => void;

class WebSocketService {
  private client: Client | null = null;
  private signalHandlers = new Set<SignalHandler>();
  private chatHandlers = new Map<string, Set<ChatHandler>>();
  private chatSubs = new Map<string, { unsubscribe: () => void }>();
  private notificationHandlers = new Set<NotificationHandler>();
  private chatEventHandlers = new Set<ChatEventHandler>();
  private userId: number | null = null;

  onSignal(handler: SignalHandler) {
    this.signalHandlers.add(handler);
    return () => { this.signalHandlers.delete(handler); };
  }

  sendSignal(msg: Record<string, unknown>) {
    this.client?.publish({ destination: "/app/call.signal", body: JSON.stringify(msg) });
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.add(handler);
    return () => { this.notificationHandlers.delete(handler); };
  }

  
  onChatEvent(handler: ChatEventHandler) {
    this.chatEventHandlers.add(handler);
    return () => { this.chatEventHandlers.delete(handler); };
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
    this.client?.publish({
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
    this.client?.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ chatId: Number(chatId), isTyping }),
    });
  }

  markAsRead(chatId: string, messageId: string) {
    this.client?.publish({
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
        // Re-attach chat subs
        for (const chatId of this.chatHandlers.keys()) this.attachChat(chatId);
        // Calls
        this.client?.subscribe("/user/queue/calls", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.signalHandlers.forEach((h) => h(event));
        });
        this.client?.subscribe("/user/queue/signal", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.signalHandlers.forEach((h) => h(event));
        });
        // Notifications
        this.client?.subscribe("/user/queue/notifications", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.notificationHandlers.forEach((h) => h(event));
        });
        // Per-user chat events (e.g. ADDED_TO_CHAT)
        this.client?.subscribe("/user/queue/chat-events", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.chatEventHandlers.forEach((h) => h(event));
        });
        // File transfers
        this.client?.subscribe("/user/queue/file-transfers", (frame) => {
          const event = JSON.parse(frame.body) as WsEvent;
          this.signalHandlers.forEach((h) => h(event));
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

export const websocketService = new WebSocketService();