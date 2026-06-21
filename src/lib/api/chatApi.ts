import { apiFetch } from "./apiClient";
import type { ChatType, MemberRole, MessageType } from "../types";

export interface ChatMemberResponse {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
  isOnline: boolean;
  joinedAt: string;
}

export interface MessageResponse {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl: string | null;
  type: MessageType;
  content: string;
  replyToId: number | null;
  replyToContent: string | null;
  isEdited: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface ChatResponse {
  id: number;
  type: ChatType;
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  inviteLink: string | null;
  createdById: number;
  createdAt: string;
  members: ChatMemberResponse[];
  lastMessage: MessageResponse | null;
  unreadCount: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const chatApi = {
  getChats: (page = 0, size = 50) =>
    apiFetch<Page<ChatResponse>>(`/api/chats?page=${page}&size=${size}`),

  getChatById: (chatId: number | string) =>
    apiFetch<ChatResponse>(`/api/chats/${chatId}`),

  createChat: (type: ChatType, memberIds: number[], title?: string, description?: string) =>
    apiFetch<ChatResponse>("/api/chats", {
      method: "POST",
      body: JSON.stringify({ type, memberIds, title, description }),
    }),

  addMember: (chatId: number | string, userId: number | string) =>
    apiFetch(`/api/chats/${chatId}/members/${userId}`, { method: "POST" }),

  removeMember: (chatId: number | string, userId: number | string) =>
    apiFetch(`/api/chats/${chatId}/members/${userId}`, { method: "DELETE" }),
};
