
import type { CartRestaurant, CartSelection } from "./cart";
export type OrderType = "dineIn" | "takeaway" | "delivery";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready"
  | "outForDelivery"
  | "served"
  | "completed"
  | "cancelled";

export interface OrderAddOn {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

export interface OrderItem {
  _id: string;
  itemId: string;
  name: string;
  image?: string;
  sizeId?: string;
  sizeName?: string;
  basePrice: number;
  addOns: OrderAddOn[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  type: OrderType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone?: string;
  delivery?: {
    street: string;
    area?: string;
    city: string;
    phone: string;
    instructions?: string;
    location?: { lat: number; lng: number };
    distanceKm?: number;
  };
  dineIn?: { partySize: number; seatsReserved: boolean };
  note?: string;
  paymentMethod: "cash";
  paymentStatus: "unpaid" | "paid";
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; by?: string }[];
  rejectReason?: string;
  cancelReason?: string;
  reviewed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
}

/** "Order again": the old order rebuilt from today's menu */
export interface ReorderPreview {
  restaurant: CartRestaurant & { isOpenNow: boolean };
  lines: CartSelection[];
  skipped: { name: string; reason: string }[];
  priceChanged: boolean;
}

/** What checkout sends (prices are worked out by the backend) */
export interface PlaceOrderInput {
  restaurantId: string;
  type: OrderType;
  items: {
    itemId: string;
    sizeId?: string;
    addOnOptionIds: string[];
    quantity: number;
    note?: string;
  }[];
  note?: string;
  delivery?: {
    street: string;
    area?: string;
    city: string;
    phone: string;
    instructions?: string;
    location?: { lat: number; lng: number };
  };
  dineIn?: { partySize: number };
}

/** Manager order board */
export type ManagerOrderTab = "new" | "active" | "past";

export interface ManagerOrderListResponse extends OrderListResponse {
  counts: { new: number; active: number };
  seats: { capacity: number; inUse: number };
}

/** Super admin: orders of every restaurant */
export type AdminOrderTab = "all" | "active" | "past";
export type AdminOrderRange = "today" | "7d" | "30d" | "all";

export interface AdminOrderListResponse extends OrderListResponse {
  counts: { all: number; active: number; past: number };
}

export interface AdminOrderRestaurant {
  _id: string;
  name: string;
  logo?: string;
  isActive?: boolean;
}

export interface AdminOrderDetail {
  order: Order;
  restaurant: {
    _id: string;
    name: string;
    logo?: string;
    phone?: string;
    address?: { street?: string; area?: string; city?: string };
  } | null;
}
