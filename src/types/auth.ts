export type Role = "superadmin" | "manager" | "customer";

export interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  dob?: string;              // ISO date string from the backend
  email?: string;
  phone?: string;
  role: Role;
  restaurantId?: string;
  isActive: boolean;
  profileCompleted: boolean; // false → must fill the Complete Profile screen
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
  dob: string;     // YYYY-MM-DD
  email?: string;  // only if the user logged in with phone
  phone?: string;  // only if the user logged in with email
}