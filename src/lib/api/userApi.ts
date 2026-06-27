import { apiFetch } from "./apiClient";
import type { User } from "../types";

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

// Re-export the shared mapper so existing imports still work
export { mapUser as mapProfileToUser } from "@/lib/mappers";

export const userApi = {
  getMe: () =>
    apiFetch<UserProfileResponse>("/api/users/me"),

  getUser: (id: string | number) =>
    apiFetch<UserProfileResponse>(`/api/users/${id}`),

  searchUsers: (query: string) =>
    apiFetch<UserProfileResponse[]>(`/api/users/search?query=${encodeURIComponent(query)}`),

  // ── NEW: Profile Update ───────────────────────────────────────────
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    apiFetch<UserProfileResponse>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<UserProfileResponse>("/api/users/me/avatar", {
      method: "POST",
      body: formData,
    });
  },

  // ── NEW: Delete Account ───────────────────────────────────────────
  deleteAccount: () =>
    apiFetch<{ message: string }>("/api/users/me", { method: "DELETE" }),

  // ── NEW: Block / Unblock ──────────────────────────────────────────
  blockUser: (userId: string | number) =>
    apiFetch<{ message: string }>(`/api/users/${userId}/block`, { method: "POST" }),

  unblockUser: (userId: string | number) =>
    apiFetch<{ message: string }>(`/api/users/${userId}/block`, { method: "DELETE" }),

  getBlockedUsers: () =>
    apiFetch<UserProfileResponse[]>("/api/users/blocked"),
};