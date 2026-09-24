import { apiRequest } from "../../lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  is_admin?: boolean;
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

export function verifyEmail(email: string, code: string) {
  return apiRequest<TokenResponse>("/api/v1/auth/email-verification", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function resendVerification(email: string) {
  return apiRequest<void>("/api/v1/auth/email-verification/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<void>("/api/v1/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(email: string, code: string, newPassword: string) {
  return apiRequest<void>("/api/v1/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<User>("/api/v1/users/me", {}, token);
}
