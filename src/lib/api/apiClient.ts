export const API_BASE_URL = "https://telegramrepomb-production.up.railway.app";

const AUTH_TOKEN_KEY = "telegrok.authToken";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  window.dispatchEvent(new Event("telegrok-auth-token-changed"));
}

export function extractAuthToken(response: unknown): string | null {
  if (typeof response === "string" && response.length > 0) return response;
  if (!response || typeof response !== "object") return null;

  const obj = response as Record<string, unknown>;
  const fields = [
    obj.token, obj.accessToken, obj.access_token, obj.jwt,
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>).token ??
        (obj.data as Record<string, unknown>).accessToken
      : null,
  ];

  return (fields.find((v): v is string => typeof v === "string" && v.length > 0)) ?? null;
}

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }

  return res.json();
}
