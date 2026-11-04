import { api } from "../lib/api";
import type { AuthResponse, RequestOtpResponse, User } from "../types/auth";

/** Customer: send OTP to phone or email */
export const requestOtp = async (identifier: string) => {
  const { data } = await api.post<RequestOtpResponse>("/auth/otp/request", { identifier });
  return data;
};

/** Customer: verify OTP (name only needed for new customers) */
/** Customer: verify OTP and log in (creates the account if new) */
export const verifyOtp = async (identifier: string, code: string) => {
  const { data } = await api.post<AuthResponse>("/auth/otp/verify", { identifier, code });
  return data;
};

/** Super Admin & Manager: email + password */
export const staffLogin = async (email: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
};

/** Any logged-in user: get current user (token is attached automatically) */
export const getMe = async () => {
  const { data } = await api.get<{ user: User }>("/auth/me");
  return data.user;
};