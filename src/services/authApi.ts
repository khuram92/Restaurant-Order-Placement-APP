import { api } from "../lib/api";
import type {
  AuthResponse,
  CompleteProfileInput,
  ContactChangeResponse,
  RequestOtpResponse,
  User,
} from "../types/auth";

/** Customer: send OTP to phone or email */
export const requestOtp = async (identifier: string) => {
  const { data } = await api.post<RequestOtpResponse>("/auth/otp/request", {
    identifier,
  });
  return data;
};

/** Customer: verify OTP (name only needed for new customers) */
/** Customer: verify OTP and log in (creates the account if new) */
export const verifyOtp = async (identifier: string, code: string) => {
  const { data } = await api.post<AuthResponse>("/auth/otp/verify", {
    identifier,
    code,
  });
  return data;
};

/** Super Admin & Manager: email + password */
export const staffLogin = async (email: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return data;
};

/** Any logged-in user: get current user (token is attached automatically) */
export const getMe = async () => {
  const { data } = await api.get<{ user: User }>("/auth/me");
  return data.user;
};
/** Customer: save first/last name, DOB and the optional second contact */
export const completeProfile = async (input: CompleteProfileInput) => {
  const { data } = await api.patch<{ user: User }>(
    "/auth/complete-profile",
    input,
  );
  return data.user;
};

/**
 * Customer: upload profile image.
 * Uses fetch instead of axios: React Native's FormData file uploads are more
 * reliable this way (fetch sets the multipart boundary itself).
 */
export const uploadAvatar = async (image: {
  uri: string;
  mimeType?: string;
  fileName?: string;
}) => {
  const type = image.mimeType ?? "image/jpeg";
  const extension = type.split("/")[1] ?? "jpg";

  const form = new FormData();
  form.append("avatar", {
    uri: image.uri,
    type,
    name: image.fileName ?? `avatar.${extension}`,
  } as unknown as Blob); // React Native accepts { uri, type, name } for files

  const { data } = await api.patch<{ user: User }>("/auth/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (body) => body, // send FormData as-is (don't turn it into JSON)
    timeout: 60000, // uploads can take longer than normal requests
  });
  return data.user;
};
/** Super Admin & Manager: change own password (clears mustChangePassword) */
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const { data } = await api.patch<{ message: string; user: User }>(
    "/auth/change-password",
    { currentPassword, newPassword },
  );
  return data.user;
};

/** Customer: send a code to a NEW phone/email (to add or change it) */
export const requestContactChange = async (identifier: string) => {
  const { data } = await api.post<ContactChangeResponse>("/auth/contact/request", { identifier });
  return data;
};

/** Customer: confirm the code → the new phone/email is saved */
export const verifyContactChange = async (identifier: string, code: string) => {
  const { data } = await api.post<{ message: string; user: User }>("/auth/contact/verify", { identifier, code });
  return data.user;
};