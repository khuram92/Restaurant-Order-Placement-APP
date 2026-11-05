/** The restaurant fields the backend attaches to a manager */
export interface ManagerRestaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: { city?: string };
  isActive: boolean;
}

export interface Manager {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "manager";
  restaurantId?: ManagerRestaurant | null; // populated by the backend
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ManagerStatusFilter = "all" | "active" | "inactive";

export interface ManagerListResponse {
  managers: Manager[];
  total: number;
  page: number;
  pages: number;
}

/** One restaurant in the picker, with who manages it (null = free) */
export interface RestaurantOption extends ManagerRestaurant {
  manager: { _id: string; name: string } | null;
}

export interface ManagerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // "" = no phone
  restaurantId: string;
}

/** Create and reset-password answers: the password is only included if the email failed */
export interface PasswordDelivery {
  emailSent: boolean;
  temporaryPassword?: string;
}