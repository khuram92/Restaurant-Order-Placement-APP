export type Role = "superadmin" | "manager" | "customer";

export interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  dob?: string; // ISO date string from the backend
  email?: string;
  phone?: string;
  role: Role;
  restaurantId?: string;
  avatar?: string;
  isActive: boolean;
  profileCompleted: boolean;
  mustChangePassword?: boolean; 
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

export interface CompleteProfileInput {
  firstName: string;
  lastName: string;
  dob: string;
  email?: string;
  phone?: string;
  avatar?: string;
}
export interface ContactChangeResponse {
  message: string;
  channel: "email" | "phone";
  identifier: string; // the cleaned-up value the code was sent to
  expiresInMinutes: number;
  devOtp?: string; // only in development
}