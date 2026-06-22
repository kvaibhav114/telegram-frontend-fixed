import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Chat, Message, CallState, CallType, Notification, ChatType } from "@/lib/types";
import type { MessageResponse } from "@/lib/api/chatApi";
import { getAuthToken } from "@/lib/api/apiClient";
import { userApi, mapProfileToUser } from "@/lib/api/userApi";
import { chatApi } from "@/lib/api/chatApi";
import { callApi } from "@/lib/api/callApi";
import { messageApi } from "@/lib/api/messageApi";
import { notificationApi } from "@/lib/api/notificationApi";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toMessage(r: MessageResponse): Message {
  return {
    id: String(r.id), chatId: String(r.chatId), senderId: String(r.senderId),
    senderName: r.senderName ?? "", senderAvatarUrl: r.senderAvatarUrl ?? `https://i.pravatar.cc/150?u=${r.senderId}`,
    type: r.type ?? "TEXT", content: r.content ?? "",
    replyToId: r.replyToId ? String(r.replyToId) : null, replyToContent: r.replyToContent ?? null,
    isEdited: r.isEdited ?? false, createdAt: r.createdAt ?? new Date().toISOString(), status: "sent",
  };
}

const EMPTY_USER: User = { id: "0", username: "", displayName: "Loading...", email: "", bio: "", avatarUrl: "", isOnline: false, lastSeenAt: null };

interface AppCtx {
  user: User;
  chats: Chat[];
  notifications: Notification[];
  unreadNotifCount: number;
  getMessages: (chatId: string) => Message[];
  searchUsers: (query: string) => Promise<User[]>;
  openChatWithUser: (peer: User) => Promise<Chat>;
  getUserById: (id: string) => User | undefined;
  getChatById: (id: string) => Chat | undefined;
  call: CallState;
  startCall: (peer: User, type: CallType) => Promise<void>;
  acceptCall: () => void;
  endCall: () => void;
  subscribeChat: (chatId: string, cb: (msgs: Message[]) => void) => () => void;
  sendMessage: (chatId: string, text: string, replyToId?: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string, messageId: string) => void;
  loadMessages: (chatId: string) => Promise<Message[]>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  unpinMessage: (chatId: string, messageId: string) => Promise<void>;
  createGroup: (type: ChatType, title: string, memberIds: number[], description?: string) => Promise<Chat>;
  addMemberToChat: (chatId: string, userId: string) => Promise<void>;
  removeMemberFromChat: (chatId: string, userId: string) => Promise<void>;
  markNotificationsRead: () => void;
  refreshNotifications: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(EMPTY_USER);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [call, setCall] = useState<CallState>({ state: "idle" });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const callRef = useRef(call);
  const userRef = useRef(user);

  const updateCall = (next: CallState) => { callRef.current = next; setCall(next); };
  useEffect(() => { userRef.current = user; }, [user]);

  const upsertUser = (u: User) => setUsers((prev) => ({ ...prev, [u.id]: u }));

  const getPeer = (senderId: number): User =>
    users[String(senderId)] ?? {
      id: String(senderId), username: "", displayName: `User ${senderId}`,
      email: "", bio: "", avatarUrl: `https://i.pravatar.cc/150?u=${senderId}`,
      isOnline: true, lastSeenAt: null,
    };

  function mapChatResponse(c: any, meId: string): Chat {
    const other = c.type === "PRIVATE" ? c.members.find((m: any) => String(m.userId) !== meId) : null;
    return {
      id: String(c.id), type: c.type,
      title: c.type === "PRIVATE" ? (other?.displayName ?? "Unknown") : (c.title ?? "Group"),
      description: c.description ?? "",
      avatarUrl: c.type === "PRIVATE" ? (other?.avatarUrl ?? `https://i.pravatar.cc/150?u=${other?.userId}`) : (c.avatarUrl ?? ""),
      inviteLink: c.inviteLink ?? null,
      members: c.members.map((m: any) => ({
        userId: String(m.userId), username: m.username, displayName: m.displayName,
        avatarUrl: m.avatarUrl ?? `https://i.pravatar.cc/150?u=${m.userId}`, role: m.role, isOnline: m.isOnline,
      })),
      lastMessage: c.lastMessage?.content ?? "", lastTime: formatTime(c.lastMessage?.createdAt),
      unread: c.unreadCount ?? 0, typing: false,
    };
  }

  // Load initial data
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const meResp = await userApi.getMe();
        const me = mapProfileToUser(meResp);
        if (!alive) return;
        setUser(me); upsertUser(me);

        const chatPage = await chatApi.getChats();
        if (!alive) return;
        setChats(chatPage.content.map((c) => mapChatResponse(c, me.id)));

        // Load notifications
        try {
          const count = await notificationApi.countUnread();
          setUnreadNotifCount(count);
        } catch {}

        websocketService.connect(Number(me.id), token);
      } catch (err) { console.error("Failed to load initial data", err); }
    })();

    const handleTokenChange = () => websocketService.reconnect();
    window.addEventListener("telegrok-auth-token-changed", handleTokenChange);
    return () => { alive = false; window.removeEventListener("telegrok-auth-token-changed", handleTokenChange); websocketService.disconnect(); webrtcService.reset(); };
  }, []);

  // Notification WebSocket
  useEffect(() => {
    return websocketService.onNotification(() => {
      setUnreadNotifCount((c) => c + 1);
    });
  }, []);

  // Call signaling (same as before, simplified)
  useEffect(() => {
    const unsub = websocketService.onSignal(async (msg) => {
      const p = msg.payload as Record<string, unknown> | undefined;
      const senderId = Number(msg.senderId ?? p?.callerId ?? 0);
      const callId = String(msg.callId ?? p?.callId ?? "");
      const resolveCallType = (): CallType => {
        if (p?.callType === "VOICE" || p?.callType === "VIDEO") return p.callType as CallType;
        return "VIDEO";
      };

      if (msg.type === "CALL_REQUEST" || msg.type === "INCOMING_CALL") {
        updateCall({ state: "incoming", peer: getPeer(senderId), type: resolveCallType(), callId });
        return;
      }
      if (msg.type === "CALL_ACCEPT" || msg.type === "CALL_ACCEPTED") {
        const active = callRef.current;
        if (active.state !== "outgoing") return;
        updateCall({ state: "active", peer: active.peer, type: active.type, callId: active.callId });
        try { await webrtcService.startLocalMedia(active.type); } catch { webrtcService.reset(); updateCall({ state: "idle" }); return; }
        const pc = webrtcService.createPeerConnection();
        pc.onicecandidate = (e) => { if (e.candidate) websocketService.sendSignal({ callId: active.callId, receiverId: senderId, type: "ICE_CANDIDATE", payload: JSON.stringify(e.candidate) }); };
        webrtcService.attachLocalTracks();
        const offer = await webrtcService.createOffer();
        websocketService.sendSignal({ callId: active.callId, receiverId: senderId, type: "OFFER", payload: JSON.stringify(offer) });
        return;
      }
      if (msg.type === "ICE_CANDIDATE") {
        const c = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        if (c?.candidate) await webrtcService.addIceCandidate(c);
        return;
      }
      if (msg.type === "OFFER") {
        const active = callRef.current;
        if (active.state === "idle") return;
        updateCall({ state: "active", peer: active.peer, type: active.type, callId });
        try { await webrtcService.startLocalMedia(active.type); } catch { webrtcService.reset(); updateCall({ state: "idle" }); return; }
        const pc = webrtcService.createPeerConnection();
        pc.onicecandidate = (e) => { if (e.candidate) websocketService.sendSignal({ callId, receiverId: senderId, type: "ICE_CANDIDATE", payload: JSON.stringify(e.candidate) }); };
        webrtcService.attachLocalTracks();
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        const answer = await webrtcService.createAnswer();
        websocketService.sendSignal({ callId, receiverId: senderId, type: "ANSWER", payload: JSON.stringify(answer) });
        return;
      }
      if (msg.type === "ANSWER") {
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        return;
      }
      if (["CALL_REJECT","CALL_REJECTED","CALL_END","CALL_ENDED","CALL_CANCELLED","CALL_MISSED"].includes(msg.type)) {
        webrtcService.reset(); updateCall({ state: "idle" });
      }
    });
    return unsub;
  }, [users]);

  const value: AppCtx = {
    user, chats, notifications, unreadNotifCount,
    getUserById: (id) => users[id],
    getChatById: (id) => chats.find((c) => c.id === id),
    getMessages: (chatId) => messagesByChat[chatId] ?? [],

    loadMessages: async (chatId) => {
      try {
        const history = await messageApi.getChatMessages(chatId);
        const msgs = history.map(toMessage).reverse();
        setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }));
        return msgs;
      } catch { return messagesByChat[chatId] ?? []; }
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
            next = current.some((m) => m.id === msg.id) ? current : [...current, msg];
            setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, lastMessage: msg.content, lastTime: formatTime(msg.createdAt), unread: msg.senderId !== userRef.current.id ? c.unread + 1 : c.unread } : c));
          } else if (event.type === "MESSAGE_EDITED") {
            const msgId = String(payload.id);
            next = current.map((m) => m.id === msgId ? { ...m, content: payload.content, isEdited: true } : m);
          } else if (event.type === "MESSAGE_DELETED") {
            const msgId = String((payload as any).messageId || payload.id);
            next = current.filter((m) => m.id !== msgId);
          } else if (event.type === "TYPING") {
            const isTyping = Boolean((payload as any)?.isTyping ?? true);
            setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, typing: isTyping } : c));
          }
          cb(next);
          return { ...prev, [chatId]: next };
        });
      });
    },

    sendMessage: (chatId, text, replyToId) => websocketService.sendMessage(chatId, text, replyToId),
    sendTyping: (chatId, isTyping) => websocketService.sendTyping(chatId, isTyping),
    markAsRead: (chatId, messageId) => {
      websocketService.markAsRead(chatId, messageId);
      setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)));
    },

    editMessage: async (messageId, content) => {
      await messageApi.editMessage(Number(messageId), content);
    },

    deleteMessage: async (messageId, chatId) => {
      await messageApi.deleteMessage(messageId);
      setMessagesByChat((prev) => ({ ...prev, [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== messageId) }));
    },

    pinMessage: async (chatId, messageId) => {
      await chatApi.pinMessage(chatId, messageId);
    },

    unpinMessage: async (chatId, messageId) => {
      await chatApi.unpinMessage(chatId, messageId);
    },

    searchUsers: async (query) => {
      if (!query.trim()) return [];
      try {
        const results = await userApi.searchUsers(query);
        const mapped = results.map(mapProfileToUser);
        mapped.forEach(upsertUser);
        return mapped;
      } catch { return []; }
    },

    openChatWithUser: async (peer) => {
      const existing = chats.find((c) => c.type === "PRIVATE" && c.members.some((m) => m.userId === peer.id));
      if (existing) return existing;
      try {
        const chatResp = await chatApi.createChat("PRIVATE", [Number(peer.id)]);
        const newChat = mapChatResponse(chatResp, user.id);
        setChats((prev) => [newChat, ...prev]);
        return newChat;
      } catch {
        const fallback: Chat = { id: peer.id, type: "PRIVATE", title: peer.displayName, description: "", avatarUrl: peer.avatarUrl, inviteLink: null, members: [], lastMessage: "", lastTime: "", unread: 0, typing: false };
        setChats((prev) => [fallback, ...prev]);
        return fallback;
      }
    },

    createGroup: async (type, title, memberIds, description) => {
      const resp = await chatApi.createChat(type, memberIds, title, description);
      const newChat = mapChatResponse(resp, user.id);
      setChats((prev) => [newChat, ...prev]);
      return newChat;
    },

    addMemberToChat: async (chatId, userId) => {
      await chatApi.addMember(chatId, userId);
    },

    removeMemberFromChat: async (chatId, userId) => {
      await chatApi.removeMember(chatId, userId);
      setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, members: c.members.filter((m) => m.userId !== userId) } : c));
    },

    call,
    startCall: async (peer, type) => {
      if (callRef.current.state !== "idle" || !user.id || user.id === "0" || peer.id === user.id) return;
      try {
        const resp = await callApi.initiate(Number(peer.id), type);
        updateCall({ state: "outgoing", peer, type, callId: String(resp.callId) });
        websocketService.sendSignal({ callId: resp.callId, receiverId: Number(peer.id), type: "CALL_REQUEST", payload: JSON.stringify({ callType: type }) });
      } catch (err) { console.error("Failed to initiate call", err); }
    },
    acceptCall: () => {
      const c = callRef.current;
      if (c.state !== "incoming") return;
      callApi.accept(c.callId).catch(console.error);
      websocketService.sendSignal({ callId: c.callId, receiverId: Number(c.peer.id), type: "CALL_ACCEPT", payload: JSON.stringify({ callType: c.type }) });
      updateCall({ state: "active", peer: c.peer, type: c.type, callId: c.callId });
    },
    endCall: () => {
      const c = callRef.current;
      if (c.state !== "idle") {
        websocketService.sendSignal({ callId: c.callId, receiverId: Number(c.peer.id), type: "CALL_END", payload: "{}" });
        (c.state === "outgoing" ? callApi.cancel(c.callId) : callApi.end(c.callId)).catch(console.error);
      }
      webrtcService.reset(); updateCall({ state: "idle" });
    },

    markNotificationsRead: () => {
      notificationApi.markAllAsRead().catch(console.error);
      setUnreadNotifCount(0);
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    },

    refreshNotifications: () => {
      notificationApi.getAll(0, 50).then((page) => setNotifications(page.content)).catch(console.error);
      notificationApi.countUnread().then(setUnreadNotifCount).catch(console.error);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}
