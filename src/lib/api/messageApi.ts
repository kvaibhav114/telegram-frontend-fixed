import { apiFetch } from "./apiClient";
import type { MessageResponse } from "./chatApi";

export const messageApi = {
  getChatMessages: (chatId: number | string, page = 0, size = 50) =>
    apiFetch<MessageResponse[]>(`/api/messages/chat/${chatId}?page=${page}&size=${size}`),

  sendMessage: (chatId: number, content: string, type = "TEXT", replyToId?: number) =>
    apiFetch<MessageResponse>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ chatId, content, type, replyToId }),
    }),

  editMessage: (messageId: number, content: string) =>
    apiFetch<MessageResponse>("/api/messages", {
      method: "PUT",
      body: JSON.stringify({ messageId, content }),
    }),

  deleteMessage: (messageId: number | string) =>
    apiFetch(`/api/messages/${messageId}`, { method: "DELETE" }),

  markAsRead: (chatId: number | string, messageId: number | string) =>
    apiFetch(`/api/messages/chat/${chatId}/read/${messageId}`, { method: "POST" }),
};
