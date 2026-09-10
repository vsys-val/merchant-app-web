import { apiRequest } from "../../lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: 86400;
}

export function login(input: LoginInput) {
  return apiRequest<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput) {
  return apiRequest<User>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<User>("/api/v1/users/me", {}, token);
}
