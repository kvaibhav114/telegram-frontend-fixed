// In dev the Vite proxy handles /api → backend, so empty is correct.
// In production set VITE_API_BASE_URL to the backend origin (e.g. https://api.example.com).
export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "";

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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const isPublicAuthEndpoint =
    endpoint.startsWith("/api/auth/login") ||
    endpoint.startsWith("/api/auth/register");


 const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token && !isPublicAuthEndpoint ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

   if ((res.status === 401 || res.status === 403) && token && !isPublicAuthEndpoint) {
    setAuthToken(null);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    return (text ? text : null) as T;
  }

  return res.json();
}
