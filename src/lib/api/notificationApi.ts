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

  countUnread: async (): Promise<number> => {
    const res = await apiFetch<{ count: number }>("/api/notifications/unread/count");
    return typeof res === "number" ? res : res?.count ?? 0;
  },

  markAsRead: (id: number) =>
    apiFetch(`/api/notifications/${id}/read`, { method: "PUT" }),

  markAllAsRead: () =>
    apiFetch("/api/notifications/read-all", { method: "PUT" }),
};
