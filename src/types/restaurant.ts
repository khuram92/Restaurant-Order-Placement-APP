export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface OpeningHour {
  day: Day;
  open: string; // "11:00"
  close: string; // "23:00"
  closed: boolean;
}

export interface Restaurant {
  _id: string;
  name: string;
  description?: string;
  cuisines: string[];
  phone?: string;
  email?: string;
  address: { street: string; area?: string; city: string };
  location?: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  openingHours: OpeningHour[];
  logo?: string;
  coverImage?: string;
  services: { dineIn: boolean; takeaway: boolean; delivery: boolean };
  deliveryFee: number;
  minOrder: number;
  deliveryRadiusKm: number;
  taxRate: number;
  seatingCapacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RestaurantStatusFilter = "all" | "active" | "inactive";

export interface RestaurantListResponse {
  restaurants: Restaurant[];
  total: number;
  page: number;
  pages: number;
}

/** What the app sends when creating (location as lat/lng, the backend converts it) */
export interface RestaurantInput {
  name: string;
  description?: string;
  cuisines?: string[];
  phone?: string;
  email?: string;
  address: { street: string; area?: string; city: string };
  location?: { lat: number; lng: number } | null;
  openingHours?: OpeningHour[];
  services?: { dineIn: boolean; takeaway: boolean; delivery: boolean };
  deliveryFee?: number;
  minOrder?: number;
  deliveryRadiusKm?: number;
  taxRate?: number;
  seatingCapacity?: number;
}

/** An image picked on the phone, not uploaded yet */
export interface PickedImage {
  uri: string;
  mimeType?: string;
  fileName?: string;
}


export type ServiceKey = "dineIn" | "takeaway" | "delivery";
export interface CustomerRestaurant extends Omit<Restaurant, "email" | "isActive"> {
  isOpenNow: boolean;
}

export interface CustomerRestaurantListResponse {
  restaurants: CustomerRestaurant[];
  total: number;
  page: number;
  pages: number;
}



export interface ManagerRestaurant extends Restaurant {
  isOpenNow: boolean;
}