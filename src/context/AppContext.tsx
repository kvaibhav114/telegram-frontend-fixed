import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  User,
  Chat,
  Message,
  CallState,
  CallType,
  Notification,
  ChatType,
} from "@/lib/types";
import { getAuthToken } from "@/lib/api/apiClient";
import { userApi } from "@/lib/api/userApi";
import { chatApi } from "@/lib/api/chatApi";
import { notificationApi } from "@/lib/api/notificationApi";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";
import { mapUser, mapChat, mapMessage } from "@/lib/mappers";
import { useCallSignaling } from "@/hooks/useCalls";
import { useChatState } from "@/hooks/useChats";
import { useMessageState } from "@/hooks/useMessages";

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

export interface AppCtx {
  user: User;
  setUser: (u: User) => void;
  chats: Chat[];
  notifications: Notification[];
  unreadNotifCount: number;
  getMessages: (chatId: string) => Message[];
  searchUsers: (query: string) => Promise<User[]>;
  openChatWithUser: (peer: User) => Promise<Chat>;
  getUserById: (id: string) => User | undefined;
  getChatById: (id: string) => Chat | undefined;
  call: CallState;
  startCall: (peers: User[], type: CallType) => Promise<void>;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  subscribeChat: (chatId: string, cb: (msgs: Message[]) => void) => () => void;
  sendMessage: (chatId: string, text: string, replyToId?: string) => void;
  sendFile: (chatId: string, file: File) => Promise<any>;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string, messageId: string) => void;
  loadMessages: (chatId: string) => Promise<Message[]>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  unpinMessage: (chatId: string, messageId: string) => Promise<void>;
  createGroup: (
    type: ChatType,
    title: string,
    memberIds: number[],
    description?: string,
  ) => Promise<Chat>;
  addMemberToChat: (chatId: string, userId: string) => Promise<void>;
  removeMemberFromChat: (chatId: string, userId: string) => Promise<void>;
  markNotificationsRead: () => void;
  refreshNotifications: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(EMPTY_USER);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const upsertUser = (u: User) => setUsers((prev) => ({ ...prev, [u.id]: u }));

  // Delegated hooks
  const chatState = useChatState(userRef);
  const msgState = useMessageState(userRef, chatState.setChats);
  const callState = useCallSignaling(user, users, userRef);

  // Load initial data
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const me = mapUser(await userApi.getMe());
        if (!alive) return;
        setUser(me);
        upsertUser(me);

        const chatPage = await chatApi.getChats();
        if (!alive) return;
        chatState.setChats(chatPage.content.map((c) => mapChat(c, me.id)));

        try {
          setUnreadNotifCount(await notificationApi.countUnread());
        } catch {}

        websocketService.connect(Number(me.id), token);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    })();

    const onTokenChange = () => websocketService.reconnect();
    window.addEventListener("telegrok-auth-token-changed", onTokenChange);
    return () => {
      alive = false;
      window.removeEventListener("telegrok-auth-token-changed", onTokenChange);
      websocketService.disconnect();
      webrtcService.reset();
    };
  }, []);


  useEffect(
    () =>
      websocketService.onNotification(() => setUnreadNotifCount((c) => c + 1)),
    [],
  );


  useEffect(
    () =>
      websocketService.onChatEvent((event) => {
        if (event.type === "ADDED_TO_CHAT" && event.payload) {
          const newChat = mapChat(event.payload as any, userRef.current.id);
          chatState.setChats((prev) =>
            prev.some((c) => c.id === newChat.id) ? prev : [newChat, ...prev],
          );
        }
      }),
    [],
  );

  const value: AppCtx = {
    user,
    setUser,
    chats: chatState.chats,
    notifications,
    unreadNotifCount,
    getUserById: (id) => users[id],
    getChatById: (id) => chatState.chats.find((c) => c.id === id),
    getMessages: msgState.getMessages,
    loadMessages: msgState.loadMessages,
    subscribeChat: msgState.subscribeChat,
    sendMessage: msgState.sendMessage,
    sendFile: msgState.sendFile,
    sendTyping: msgState.sendTyping,
    markAsRead: (chatId, messageId) => {
      msgState.markAsRead(chatId, messageId);
      chatState.setChats((cs) =>
        cs.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
      );
    },
    editMessage: msgState.editMessage,
    deleteMessage: msgState.deleteMessage,
    pinMessage: msgState.pinMessage,
    unpinMessage: msgState.unpinMessage,

    searchUsers: async (query) => {
      if (!query.trim()) return [];
      try {
        const results = (await userApi.searchUsers(query)).map(mapUser);
        results.forEach(upsertUser);
        return results;
      } catch {
        return [];
      }
    },

    openChatWithUser: (peer) => chatState.openChatWithUser(peer, user.id),
    createGroup: (type, title, memberIds, desc) =>
      chatState.createGroup(type, title, memberIds, user.id, desc),
    addMemberToChat: chatState.addMember,
    removeMemberFromChat: chatState.removeMember,

    call: callState.call,
    startCall: callState.startCall,
    acceptCall: callState.acceptCall,
    rejectCall: callState.rejectCall,
    endCall: callState.endCall,

    markNotificationsRead: () => {
      notificationApi.markAllAsRead().catch(console.error);
      setUnreadNotifCount(0);
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    },
    refreshNotifications: () => {
      notificationApi
        .getAll(0, 50)
        .then((page) => setNotifications(page.content))
        .catch(console.error);
      notificationApi
        .countUnread()
        .then(setUnreadNotifCount)
        .catch(console.error);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}