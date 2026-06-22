import { apiFetch } from "./apiClient";
import type { Notification } from "../types";

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
}

export const notificationApi = {
  getAll: (page = 0, size = 30) =>
    apiFetch<NotificationPage>(`/api/notifications?page=${page}&size=${size}`),

  getUnread: () =>
    apiFetch<Notification[]>("/api/notifications/unread"),

  countUnread: () =>
    apiFetch<number>("/api/notifications/unread/count"),

  markAsRead: (id: number) =>
    apiFetch(`/api/notifications/${id}/read`, { method: "POST" }),

  markAllAsRead: () =>
    apiFetch("/api/notifications/read-all", { method: "POST" }),
};
