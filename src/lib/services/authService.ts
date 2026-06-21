import { authApi } from "../api/authApi";

export const authService = {
  login: (credentials: { email: string; password: string }) =>
    authApi.login(credentials.email, credentials.password),

  register: (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
  }) => authApi.register(data),
};
