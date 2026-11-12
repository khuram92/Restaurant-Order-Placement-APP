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
  delivery?: { street: string; area?: string; city: string; phone: string; instructions?: string };
  dineIn?: { partySize: number; seatsReserved: boolean };
  note?: string;
  paymentMethod: "cash";
  paymentStatus: "unpaid" | "paid";
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; by?: string }[];
  rejectReason?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
}

/** What checkout sends (prices are worked out by the backend) */
export interface PlaceOrderInput {
  restaurantId: string;
  type: OrderType;
  items: { itemId: string; sizeId?: string; addOnOptionIds: string[]; quantity: number; note?: string }[];
  note?: string;
  delivery?: { street: string; area?: string; city: string; phone: string; instructions?: string };
  dineIn?: { partySize: number };
}