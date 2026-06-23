import { getAuthToken } from "./apiClient";

export const STORY_API_BASE_URL = "https://telegramrepomb-production-a9f9.up.railway.app";

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

async function storyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${STORY_API_BASE_URL}${endpoint}`, {
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return (text ? text : null) as T;
  }

  return response.json();
}

export function resolveStoryMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) return "";
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const normalized = mediaUrl.startsWith("/") ? mediaUrl : `/${mediaUrl}`;
  return `${STORY_API_BASE_URL}${normalized}`;
}

export async function fetchStoryMediaObjectUrl(mediaUrl: string): Promise<string> {
  const token = getAuthToken();
  const resolvedUrl = resolveStoryMediaUrl(mediaUrl);

  const response = await fetch(resolvedUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to load story media (${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchStoryMediaByIdObjectUrl(storyId: number | string): Promise<string> {
  const token = getAuthToken();

  const response = await fetch(`${STORY_API_BASE_URL}/api/stories/${storyId}/media`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to load story media (${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export const storyApi = {
  getFeed: () => storyFetch<StoryFeedResponse[]>("/api/stories"),

  uploadStory: (file: File, caption: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    return storyFetch<StoryResponse>("/api/stories/upload", {
      method: "POST",
      body: formData,
    });
  },

  viewStory: (storyId: number | string) =>
    storyFetch<void>(`/api/stories/${storyId}/view`, { method: "POST" }),

  deleteStory: (storyId: number | string) =>
    storyFetch<void>(`/api/stories/${storyId}`, { method: "DELETE" }),

  getViewers: (storyId: number | string) =>
    storyFetch<StoryViewerResponse[]>(`/api/stories/${storyId}/viewers`),
};
