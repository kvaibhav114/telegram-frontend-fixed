/**
 * Story API client.
 *
 * FIXED: Removed the 60-line `storyFetch` function that was an exact copy
 * of `apiFetch` from apiClient.ts. Now uses the shared `apiFetch` directly.
 */

import { apiFetch, API_BASE_URL, getAuthToken } from "./apiClient";

export interface StoryResponse {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  mediaUrl: string;
  caption: string | null;
  type: "IMAGE" | "VIDEO";
  createdAt: string;
  expiresAt: string;
  viewerCount: number;
  viewed: boolean;
}

export interface StoryFeedResponse {
  userId: number;
  username: string;
  avatarUrl: string | null;
  hasUnseenStories: boolean;
  stories: StoryResponse[];
}

export interface StoryViewerResponse {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
}

export function resolveStoryMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) return "";
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const normalized = mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function fetchStoryMediaObjectUrl(mediaUrl: string): Promise<string> {
  const token = getAuthToken();
  const resolvedUrl = resolveStoryMediaUrl(mediaUrl);
  const response = await fetch(resolvedUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Failed to load story media (${response.status})`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchStoryMediaByIdObjectUrl(storyId: number | string): Promise<string> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}/media`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Failed to load story media (${response.status})`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export const storyApi = {
  getFeed: () =>
    apiFetch<StoryFeedResponse[]>("/api/stories"),

  uploadStory: (file: File, caption: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    return apiFetch<StoryResponse>("/api/stories/upload", {
      method: "POST",
      body: formData,
    });
  },

  viewStory: (storyId: number | string) =>
    apiFetch<void>(`/api/stories/${storyId}/view`, { method: "POST" }),

  deleteStory: (storyId: number | string) =>
    apiFetch<void>(`/api/stories/${storyId}`, { method: "DELETE" }),

  getViewers: (storyId: number | string) =>
    apiFetch<StoryViewerResponse[]>(`/api/stories/${storyId}/viewers`),
};