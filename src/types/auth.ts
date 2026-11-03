export type Role = "superadmin" | "manager" | "customer";

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  restaurantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestOtpResponse {
  message: string;
  channel: "email" | "phone";
  isNewUser: boolean;
  expiresInMinutes: number;
  devOtp?: string; // only in development
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser?: boolean;
}