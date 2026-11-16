import type { OrderType } from "./order";

export type StatsRange = "today" | "7d" | "30d";

export interface OrderStats {
  range: StatsRange;
  from: string;
  summary: {
    orders: number;
    completed: number;
    revenue: number; // completed orders only
    avgOrderValue: number;
    rejected: number;
    cancelled: number;
  };
  live: { pending: number; inProgress: number };
  byStatus: Record<string, number>;
  byType: { type: OrderType; orders: number; revenue: number }[];
  series: { label: string; orders: number; revenue: number }[]; // "00".."23" (today) or "2026-11-16"
  topItems: { itemId: string; name: string; image?: string; quantity: number; revenue: number }[];
}

export interface AdminStats extends OrderStats {
  platform: {
    restaurants: number;
    activeRestaurants: number;
    activeManagers: number;
    customers: number;
    newCustomers: number;
  };
  topRestaurants: { restaurantId: string; name: string; orders: number; revenue: number; logo?: string }[];
}