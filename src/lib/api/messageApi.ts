import { apiFetch } from "./apiClient";
import type { MessageResponse } from "./chatApi";
import type { FileTransferStatus } from "../types";

export interface FileTransferResponse {
  transferId?: number | string;
  messageId?: number | string | null;
  attachmentId?: number | string | null;
  chatId?: number | string;
  senderId?: number | string;
  receiverId?: number | string;
  fileName?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  sizeBytes?: number | null;
  status: FileTransferStatus;
}

export const messageApi = {
  getChatMessages: (chatId: number | string, page = 0, size = 50) =>
    apiFetch<MessageResponse[]>(
      `/api/messages/chat/${chatId}?page=${page}&size=${size}`,
    ),

  sendMessage: (
    chatId: number,
    content: string,
    type = "TEXT",
    replyToId?: number,
  ) =>
    apiFetch<MessageResponse>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ chatId, content, type, replyToId }),
    }),

  sendFile: (chatId: number, file: File) => {
    const form = new FormData();

    form.append("chatId", String(chatId));
    form.append("file", file);

    return apiFetch<MessageResponse | FileTransferResponse>("/api/messages/file", {
      method: "POST",
      body: form,
    });
  },

  editMessage: (messageId: number, content: string) =>
    apiFetch<MessageResponse>("/api/messages", {
      method: "PUT",
      body: JSON.stringify({ messageId, content }),
    }),

  deleteMessage: (messageId: number | string) =>
    apiFetch(`/api/messages/${messageId}`, { method: "DELETE" }),

  markAsRead: (chatId: number | string, messageId: number | string) =>
    apiFetch(`/api/messages/chat/${chatId}/read/${messageId}`, {
      method: "POST",
    }),
};
