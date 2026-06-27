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

export interface PinnedMessageResponse {
  id: number;
  chatId: number;
  message: MessageResponse;
  pinnedById: number;
  pinnedByName: string;
  pinnedAt: string;
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

  // ── NEW: Promote / Demote ─────────────────────────────────────────
  changeMemberRole: (chatId: number | string, userId: number | string, newRole: MemberRole) =>
    apiFetch<{ message: string }>(`/api/chats/${chatId}/members/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ newRole }),
    }),

  // Invite links
  joinViaInviteLink: (inviteLink: string) =>
    apiFetch<ChatResponse>(`/api/chats/join?inviteLink=${encodeURIComponent(inviteLink)}`, { method: "POST" }),

  regenerateInviteLink: (chatId: number | string) =>
    apiFetch<{ inviteLink: string }>(`/api/chats/${chatId}/invite-link/regenerate`, { method: "POST" }),

  // Pinned messages
  getPinnedMessages: (chatId: number | string) =>
    apiFetch<PinnedMessageResponse[]>(`/api/chats/${chatId}/pins`),

  pinMessage: (chatId: number | string, messageId: number | string) =>
    apiFetch<PinnedMessageResponse>(`/api/chats/${chatId}/pins/${messageId}`, { method: "POST" }),

  unpinMessage: (chatId: number | string, messageId: number | string) =>
    apiFetch(`/api/chats/${chatId}/pins/${messageId}`, { method: "DELETE" }),
};