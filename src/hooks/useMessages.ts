import { useState, type MutableRefObject } from "react";
import type { Chat, Message, User } from "@/lib/types";
import { messageApi } from "@/lib/api/messageApi";
import { chatApi } from "@/lib/api/chatApi";
import { websocketService } from "@/lib/services/websocketService";
import { mapMessage } from "@/lib/mappers";
import { formatLocalTime } from "@/lib/time";

type SetChats = (fn: Chat[] | ((prev: Chat[]) => Chat[])) => void;

export function useMessageState(
  userRef: MutableRefObject<User>,
  setChats: SetChats,
) {
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, Message[]>
  >({});

  const getMessages = (chatId: string) => messagesByChat[chatId] ?? [];

  const loadMessages = async (chatId: string): Promise<Message[]> => {
    try {
      const history = await messageApi.getChatMessages(chatId);
      const msgs = history.map(mapMessage).reverse();
      setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }));
      return msgs;
    } catch {
      return messagesByChat[chatId] ?? [];
    }
  };

  const subscribeChat = (chatId: string, cb: (msgs: Message[]) => void) => {
    return websocketService.subscribeToChat(chatId, (event) => {
      const payload = event.payload;
      if (!payload) return;

      setMessagesByChat((prev) => {
        const current = prev[chatId] ?? [];
        let next = current;

        if (event.type === "NEW_MESSAGE") {
          const msg = mapMessage(payload);
          next = current.some((m) => m.id === msg.id)
            ? current
            : [...current, msg];
          setChats((cs) =>
            cs.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    lastMessage: msg.content,
                    lastTime: formatLocalTime(msg.createdAt),
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
        } else if (event.type === "MESSAGE_READ") {
          // Backend payload: { chatId, messageId, readByUserId }
          // The reader (other user) has read every message up to messageId.
          // Flip status to "read" on our own messages with id <= messageId.
          const p = payload as any;
          const readByUserId = String(p.readByUserId);
          const upToId = Number(p.messageId);
          const me = userRef.current.id;
          if (readByUserId !== me && !Number.isNaN(upToId)) {
            next = current.map((m) =>
              m.senderId === me && Number(m.id) <= upToId && m.status !== "read"
                ? { ...m, status: "read" }
                : m,
            );
          }
        } else if (event.type === "TYPING") {
          const p = payload as any;
          // Ignore our own typing event — we're subscribed to the same /topic
          if (String(p?.userId) === userRef.current.id) {
            cb(next);
            return prev;
          }
          const isTyping = Boolean(p?.isTyping ?? true);
          setChats((cs) =>
            cs.map((c) => (c.id === chatId ? { ...c, typing: isTyping } : c)),
          );
        }

        cb(next);
        return { ...prev, [chatId]: next };
      });
    });
  };

  const sendMessage = (chatId: string, text: string, replyToId?: string) =>
    websocketService.sendMessage(chatId, text, replyToId);

  const sendFile = async (chatId: string, file: File) => {
    const response = await messageApi.sendFile(Number(chatId), file);

    if ("attachments" in response) {
      return;
    }

    if ("status" in response) return;
  };

  const sendTyping = (chatId: string, isTyping: boolean) =>
    websocketService.sendTyping(chatId, isTyping);

  const markAsRead = (chatId: string, messageId: string) =>
    websocketService.markAsRead(chatId, messageId);

  const editMessage = async (messageId: string, content: string) => {
    await messageApi.editMessage(Number(messageId), content);
  };

  const deleteMessage = async (messageId: string, chatId: string) => {
    await messageApi.deleteMessage(messageId);
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== messageId),
    }));
  };

  const pinMessage = async (chatId: string, messageId: string) => {
    await chatApi.pinMessage(chatId, messageId);
  };

  const unpinMessage = async (chatId: string, messageId: string) => {
    await chatApi.unpinMessage(chatId, messageId);
  };

  return {
    getMessages,
    loadMessages,
    subscribeChat,
    sendMessage,
    sendFile,
    sendTyping,
    markAsRead,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
  };
}
