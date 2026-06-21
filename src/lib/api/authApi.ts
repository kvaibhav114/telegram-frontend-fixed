import { apiFetch, extractAuthToken, setAuthToken } from "./apiClient";

async function withStoredToken<T>(request: Promise<T>): Promise<T> {
  const response = await request;
  const token = extractAuthToken(response);
  if (token) setAuthToken(token);
  return response;
}

export const authApi = {
  login: (email: string, password: string) =>
    withStoredToken(apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })),

  register: (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
  }) =>
    withStoredToken(apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })),

  logout: async () => {
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    setAuthToken(null);
    return res;
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
