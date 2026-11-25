export type BroadcastAudience = "everyone" | "customers" | "managers" | "restaurants";
export type RestaurantTarget = "customers" | "managers" | "both";

export interface BroadcastAudienceInput {
  audience: BroadcastAudience;
  restaurantIds?: string[];
  restaurantTarget?: RestaurantTarget;
}

export interface BroadcastInput extends BroadcastAudienceInput {
  title: string;
  body: string;
  linkRestaurantId?: string;
}

export interface BroadcastPreview {
  customers: number;
  managers: number;
  total: number;
  optedOut: number;
  remainingToday: number;
}

export interface Broadcast {
  _id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  restaurantIds: { _id: string; name: string }[];
  restaurantTarget?: RestaurantTarget;
  linkRestaurantId?: { _id: string; name: string } | null;
  sentBy?: { firstName?: string; lastName?: string; email?: string } | null;
  recipients: { customers: number; managers: number };
  status: "sending" | "sent" | "failed";
  createdAt: string;
}

export interface BroadcastHistory {
  broadcasts: Broadcast[];
  remainingToday: number;
  dailyLimit: number;
}