import { useState, type MutableRefObject } from "react";
import type { Chat, ChatType, User } from "@/lib/types";
import { chatApi } from "@/lib/api/chatApi";
import { mapChat } from "@/lib/mappers";

function getPrivatePeerId(chat: Chat, meId: string): string | null {
  if (chat.type !== "PRIVATE") return null;
  return chat.members.find((m) => m.userId !== meId)?.userId ?? null;
}

function getChatKey(chat: Chat, meId: string): string {
  const peerId = getPrivatePeerId(chat, meId);
  return chat.type === "PRIVATE" && peerId ? `PRIVATE:${peerId}` : `${chat.type}:${chat.id}`;
}

function mergeChatsByPeer(chats: Chat[], meId: string): Chat[] {
  const merged = new Map<string, Chat>();
  for (const chat of chats) merged.set(getChatKey(chat, meId), chat);
  return Array.from(merged.values());
}

export function useChatState(userRef: MutableRefObject<User>) {
  const [chats, setChatsRaw] = useState<Chat[]>([]);

  const setChats = (next: Chat[] | ((prev: Chat[]) => Chat[])) => {
    setChatsRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      return mergeChatsByPeer(resolved, userRef.current.id);
    });
  };

  const openChatWithUser = async (peer: User, meId: string): Promise<Chat> => {
    const existing = chats.find((c) => c.type === "PRIVATE" && c.members.some((m) => m.userId === peer.id));
    if (existing) return existing;

    try {
      const resp = await chatApi.createChat("PRIVATE", [Number(peer.id)]);
      const newChat = mapChat(resp, meId);
      setChats((prev) => [newChat, ...prev]);
      return newChat;
    } catch {
      const refreshed = await chatApi.getChats();
      const mapped = refreshed.content.map((c) => mapChat(c, meId));
      const normalized = mergeChatsByPeer(mapped, meId);
      setChats(normalized);
      const resolved = normalized.find((c) => c.type === "PRIVATE" && c.members.some((m) => m.userId === peer.id));
      if (!resolved) throw new Error("Could not open chat with this user.");
      return resolved;
    }
  };

  const createGroup = async (type: ChatType, title: string, memberIds: number[], meId: string, description?: string): Promise<Chat> => {
    const resp = await chatApi.createChat(type, memberIds, title, description);
    const newChat = mapChat(resp, meId);
    setChats((prev) => [newChat, ...prev]);
    return newChat;
  };

  const addMember = async (chatId: string, userId: string) => {
    await chatApi.addMember(chatId, userId);
    // Re-fetch the chat to get the updated member list.
    try {
      const refreshed = await chatApi.getChatById(chatId);
      const updated = mapChat(refreshed, userRef.current.id);
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
    } catch {}
  };

  const removeMember = async (chatId: string, userId: string) => {
    await chatApi.removeMember(chatId, userId);
    setChats((cs) => cs.map((c) => c.id === chatId ? { ...c, members: c.members.filter((m) => m.userId !== userId) } : c));
  };

  return { chats, setChats, openChatWithUser, createGroup, addMember, removeMember };
}