import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User, Chat, Message, CallState, CallType } from "@/lib/types";
import type { MessageResponse } from "@/lib/api/chatApi";
import type { WsEvent } from "@/lib/services/websocketService";
import { getAuthToken } from "@/lib/api/apiClient";
import { userApi, mapProfileToUser } from "@/lib/api/userApi";
import { chatApi } from "@/lib/api/chatApi";
import { callApi } from "@/lib/api/callApi";
import { messageApi } from "@/lib/api/messageApi";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toMessage(r: MessageResponse): Message {
  return {
    id: String(r.id),
    chatId: String(r.chatId),
    senderId: String(r.senderId),
    senderName: r.senderName ?? "",
    senderAvatarUrl:
      r.senderAvatarUrl ?? `https://i.pravatar.cc/150?u=${r.senderId}`,
    type: r.type ?? "TEXT",
    content: r.content ?? "",
    replyToId: r.replyToId ? String(r.replyToId) : null,
    replyToContent: r.replyToContent ?? null,
    isEdited: r.isEdited ?? false,
    createdAt: r.createdAt ?? new Date().toISOString(),
    status: "sent",
  };
}

const EMPTY_USER: User = {
  id: "0",
  username: "",
  displayName: "Loading...",
  email: "",
  bio: "",
  avatarUrl: "",
  isOnline: false,
  lastSeenAt: null,
};

// ── Context type ─────────────────────────────────────────────────────

interface AppCtx {
  user: User;
  chats: Chat[];
  getMessages: (chatId: string) => Message[];
  searchUsers: (query: string) => Promise<User[]>;
  openChatWithUser: (peer: User) => Promise<Chat>;
  getUserById: (id: string) => User | undefined;
  getChatById: (id: string) => Chat | undefined;
  call: CallState;
  startCall: (peer: User, type: CallType) => Promise<void>;
  acceptCall: () => void;
  endCall: () => void;
  // Chat event handling for ChatWindow
  subscribeChat: (chatId: string, cb: (msgs: Message[]) => void) => () => void;
  sendMessage: (chatId: string, text: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string, messageId: string) => void;
  loadMessages: (chatId: string) => Promise<Message[]>;
}

const Ctx = createContext<AppCtx | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(EMPTY_USER);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, Message[]>
  >({});
  const [call, setCall] = useState<CallState>({ state: "idle" });
  const callRef = useRef(call);
  const userRef = useRef(user);

  useEffect(() => {
    callRef.current = call;
  }, [call]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── User helpers ────────────────────────────────────────────────

  const upsertUser = (u: User) => setUsers((prev) => ({ ...prev, [u.id]: u }));

  const getPeer = (senderId: number): User =>
    users[String(senderId)] ?? {
      id: String(senderId),
      username: "",
      displayName: `User ${senderId}`,
      email: "",
      bio: "",
      avatarUrl: `https://i.pravatar.cc/150?u=${senderId}`,
      isOnline: true,
      lastSeenAt: null,
    };

  // ── Load initial data ──────────────────────────────────────────

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let alive = true;

    (async () => {
      try {
        // Fetch current user
        const meResp = await userApi.getMe();
        const me = mapProfileToUser(meResp);
        if (!alive) return;
        setUser(me);
        upsertUser(me);

        // Fetch chats
        const chatPage = await chatApi.getChats();
        if (!alive) return;

        const loadedChats: Chat[] = chatPage.content.map((c) => {
          const other =
            c.type === "PRIVATE"
              ? c.members.find((m) => String(m.userId) !== me.id)
              : null;

          return {
            id: String(c.id),
            type: c.type,
            title:
              c.type === "PRIVATE"
                ? (other?.displayName ?? "Unknown")
                : (c.title ?? "Group"),
            description: c.description ?? "",
            avatarUrl:
              c.type === "PRIVATE"
                ? (other?.avatarUrl ??
                  `https://i.pravatar.cc/150?u=${other?.userId}`)
                : (c.avatarUrl ?? ""),
            members: c.members.map((m) => ({
              userId: String(m.userId),
              username: m.username,
              displayName: m.displayName,
              avatarUrl:
                m.avatarUrl ?? `https://i.pravatar.cc/150?u=${m.userId}`,
              role: m.role,
              isOnline: m.isOnline,
            })),
            lastMessage: c.lastMessage?.content ?? "",
            lastTime: formatTime(c.lastMessage?.createdAt),
            unread: c.unreadCount ?? 0,
            typing: false,
          };
        });

        setChats(loadedChats);

        // Connect WebSocket
        websocketService.connect(Number(me.id), token);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    })();

    const handleTokenChange = () => websocketService.reconnect();
    window.addEventListener("telegrok-auth-token-changed", handleTokenChange);

    return () => {
      alive = false;
      window.removeEventListener(
        "telegrok-auth-token-changed",
        handleTokenChange,
      );
      websocketService.disconnect();
      webrtcService.reset();
    };
  }, []);

  // ── Call signaling ─────────────────────────────────────────────

  useEffect(() => {
    const unsub = websocketService.onSignal(async (msg) => {
      const senderId = Number(msg.senderId ?? 0);
      const parsePayload = (p: unknown) => {
        if (typeof p !== "string") return null;
        try {
          return JSON.parse(p) as { callType?: CallType };
        } catch {
          return null;
        }
      };

      if (msg.type === "CALL_REQUEST") {
        const payload = parsePayload(msg.payload);
        setCall({
          state: "incoming",
          peer: getPeer(senderId),
          type: payload?.callType === "VOICE" ? "VOICE" : "VIDEO",
          callId: String(msg.callId),
        });
        return;
      }

      if (msg.type === "CALL_ACCEPT") {
        const active = callRef.current;
        if (active.state !== "outgoing") return;

        setCall({
          state: "active",
          peer: active.peer,
          type: active.type,
          callId: active.callId,
        });
        try {
          await webrtcService.startLocalMedia(active.type);
        } catch {
          webrtcService.reset();
          setCall({ state: "idle" });
          return;
        }
        const pc = webrtcService.createPeerConnection();

        pc.onicecandidate = (e) => {
          if (!e.candidate) return;
          websocketService.sendSignal({
            callId: active.callId,
            receiverId: senderId,
            type: "ICE_CANDIDATE",
            payload: JSON.stringify(e.candidate),
          });
        };

        webrtcService.attachLocalTracks();
        const offer = await webrtcService.createOffer();
        websocketService.sendSignal({
          callId: active.callId,
          receiverId: senderId,
          type: "OFFER",
          payload: JSON.stringify(offer),
        });
        return;
      }

      if (msg.type === "ICE_CANDIDATE") {
        const c =
          typeof msg.payload === "string"
            ? JSON.parse(msg.payload as string)
            : msg.payload;
        if (c?.candidate) await webrtcService.addIceCandidate(c);
        return;
      }

      if (msg.type === "OFFER") {
        const active = callRef.current;
        if (active.state === "idle") return;
        const callType = active.type;
        const peer = active.peer;

        setCall({
          state: "active",
          peer,
          type: callType,
          callId: String(msg.callId),
        });
        try {
          await webrtcService.startLocalMedia(callType);
        } catch {
          webrtcService.reset();
          setCall({ state: "idle" });
          return;
        }
        const pc = webrtcService.createPeerConnection();

        pc.onicecandidate = (e) => {
          if (!e.candidate) return;
          websocketService.sendSignal({
            callId: String(msg.callId),
            receiverId: senderId,
            type: "ICE_CANDIDATE",
            payload: JSON.stringify(e.candidate),
          });
        };

        webrtcService.attachLocalTracks();
        const desc =
          typeof msg.payload === "string"
            ? JSON.parse(msg.payload as string)
            : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        const answer = await webrtcService.createAnswer();
        websocketService.sendSignal({
          callId: String(msg.callId),
          receiverId: senderId,
          type: "ANSWER",
          payload: JSON.stringify(answer),
        });
        return;
      }

      if (msg.type === "ANSWER") {
        const desc =
          typeof msg.payload === "string"
            ? JSON.parse(msg.payload as string)
            : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        return;
      }

      if (msg.type === "CALL_REJECT" || msg.type === "CALL_END") {
        webrtcService.reset();
        setCall({ state: "idle" });
      }
    });

    return unsub;
  }, [users]);

  // ── Public API ─────────────────────────────────────────────────

  const value: AppCtx = {
    user,
    chats,

    getUserById: (id) => users[id],
    getChatById: (id) => chats.find((c) => c.id === id),

    getMessages: (chatId) => messagesByChat[chatId] ?? [],

    loadMessages: async (chatId) => {
      try {
        const history = await messageApi.getChatMessages(chatId);
        const msgs = history.map(toMessage).reverse();
        setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }));
        return msgs;
      } catch (err) {
        console.error("Failed to load messages", err);
        return messagesByChat[chatId] ?? [];
      }
    },

    subscribeChat: (chatId, cb) => {
      return websocketService.subscribeToChat(chatId, (event) => {
        const payload = event.payload;
        if (!payload) return;

        setMessagesByChat((prev) => {
          const current = prev[chatId] ?? [];
          let next = current;

          if (event.type === "NEW_MESSAGE") {
            const msg = toMessage(payload);
            next = current.some((m) => m.id === msg.id)
              ? current
              : [...current, msg];

            // Update chat preview
            setChats((cs) =>
              cs.map((c) =>
                c.id === chatId
                  ? {
                      ...c,
                      lastMessage: msg.content,
                      lastTime: formatTime(msg.createdAt),
                      unread:
                        msg.senderId !== userRef.current.id
                          ? c.unread + 1
                          : c.unread,
                    }
                  : c,
              ),
            );
          } else if (event.type === "MESSAGE_EDITED") {
            const msgId = String(payload.id);
            next = current.map((m) =>
              m.id === msgId
                ? { ...m, content: payload.content, isEdited: true }
                : m,
            );
          } else if (event.type === "MESSAGE_DELETED") {
            const msgId = String((payload as any).messageId || payload.id);
            next = current.filter((m) => m.id !== msgId);
          } else if (event.type === "TYPING") {
            const isTyping = Boolean((payload as any)?.isTyping ?? true);
            setChats((cs) =>
              cs.map((c) => (c.id === chatId ? { ...c, typing: isTyping } : c)),
            );
          }

          const updated = { ...prev, [chatId]: next };
          cb(next);
          return updated;
        });
      });
    },

    sendMessage: (chatId, text) => websocketService.sendMessage(chatId, text),
    sendTyping: (chatId, isTyping) =>
      websocketService.sendTyping(chatId, isTyping),

    markAsRead: (chatId, messageId) => {
      websocketService.markAsRead(chatId, messageId);
      setChats((cs) =>
        cs.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
      );
    },

    searchUsers: async (query) => {
      if (!query.trim()) return [];
      try {
        const results = await userApi.searchUsers(query);
        const mapped = results.map(mapProfileToUser);
        mapped.forEach(upsertUser);
        return mapped;
      } catch (err) {
        console.error("Search failed", err);
        return [];
      }
    },

    openChatWithUser: async (peer) => {
      // Check if a chat already exists
      const existing = chats.find(
        (c) =>
          c.type === "PRIVATE" && c.members.some((m) => m.userId === peer.id),
      );
      if (existing) return existing;

      // Create a private chat via API
      try {
        const chatResp = await chatApi.createChat("PRIVATE", [Number(peer.id)]);
        const newChat: Chat = {
          id: String(chatResp.id),
          type: "PRIVATE",
          title: peer.displayName,
          description: "",
          avatarUrl: peer.avatarUrl,
          members: chatResp.members.map((m) => ({
            userId: String(m.userId),
            username: m.username,
            displayName: m.displayName,
            avatarUrl: m.avatarUrl ?? "",
            role: m.role,
            isOnline: m.isOnline,
          })),
          lastMessage: "",
          lastTime: "",
          unread: 0,
          typing: false,
        };
        setChats((prev) => [newChat, ...prev]);
        return newChat;
      } catch {
        // Fallback: create local placeholder
        const fallback: Chat = {
          id: peer.id,
          type: "PRIVATE",
          title: peer.displayName,
          description: "",
          avatarUrl: peer.avatarUrl,
          members: [],
          lastMessage: "",
          lastTime: "",
          unread: 0,
          typing: false,
        };
        setChats((prev) => [fallback, ...prev]);
        return fallback;
      }
    },

    call,

    startCall: async (peer, type) => {
      if (callRef.current.state !== "idle") return;
      try {
        const resp = await callApi.initiate(Number(peer.id), type);
        const callId = String(resp.callId);
        setCall({ state: "outgoing", peer, type, callId });
        websocketService.sendSignal({
          callId: resp.callId,
          receiverId: Number(peer.id),
          type: "CALL_REQUEST",
          payload: JSON.stringify({ callType: type }),
        });
      } catch (err) {
        console.error("Failed to initiate call", err);
      }
    },

    acceptCall: () => {
      const c = callRef.current;
      if (c.state !== "incoming") return;
      callApi.accept(c.callId).catch(console.error);
      setCall({ state: "active", peer: c.peer, type: c.type, callId: c.callId });
    },

    endCall: () => {
      const c = callRef.current;
      if (c.state !== "idle") {
        const apiCall =
          c.state === "outgoing"
            ? callApi.cancel(c.callId)
            : callApi.end(c.callId);
        apiCall.catch(console.error);
      }
      webrtcService.reset();
      setCall({ state: "idle" });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}
