import { apiFetch } from "./apiClient";
import type { User } from "../types";

// Backend returns this shape
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

export function mapProfileToUser(p: UserProfileResponse): User {
  const id = String(p.id);
  return {
    id,
    username: p.username ?? "",
    displayName: p.displayName ?? p.username ?? `User ${id}`,
    email: p.email ?? "",
    bio: p.bio ?? "",
    avatarUrl: p.avatarUrl ?? `https://i.pravatar.cc/150?u=${id}`,
    isOnline: p.isOnline ?? false,
    lastSeenAt: p.lastSeenAt ?? null,
  };
}

export const userApi = {
  getMe: () => apiFetch<UserProfileResponse>("/api/users/me"),
  getUser: (id: string | number) => apiFetch<UserProfileResponse>(`/api/users/${id}`),
  searchUsers: (query: string) =>
    apiFetch<UserProfileResponse[]>(`/api/users/search?query=${encodeURIComponent(query)}`),
};
