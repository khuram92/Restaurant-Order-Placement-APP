import { model, Schema, Types, type HydratedDocument } from "mongoose";

export const ORDER_TYPES = ["dineIn", "takeaway", "delivery"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/**
 * pending → accepted → preparing → ready → (outForDelivery | served) → completed
 * pending → rejected (by the manager) / cancelled (by the customer)
 */
export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "preparing",
  "ready",
  "outForDelivery",
  "served",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses where the order is still running (dine-in seats are held while accepted+) */
export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "outForDelivery", "served"];

/** A chosen add-on, copied from the menu at order time */
export interface IOrderAddOn {
  groupId: Types.ObjectId;
  groupName: string;
  optionId: Types.ObjectId;
  name: string;
  price: number;
}

/** One line of the order (prices are copied, so later menu changes don't change old orders) */
export interface IOrderItem {
  itemId: Types.ObjectId;
  name: string;
  image?: string;
  sizeId?: Types.ObjectId;
  sizeName?: string;
  basePrice: number;
  addOns: IOrderAddOn[];
  unitPrice: number; // basePrice + add-ons
  quantity: number;
  lineTotal: number; // unitPrice × quantity
  note?: string;
}

export interface IStatusChange {
  status: OrderStatus;
  at: Date;
  by?: Types.ObjectId;
}

export interface IOrder {
  orderNumber: string; // short code shown to people, e.g. "K7Q2XM"
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  restaurantName: string;
  type: OrderType;

  items: IOrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  total: number;

  // Who to contact
  customerName: string;
  customerPhone?: string;

  delivery?: {
    street: string;
    area?: string;
    city: string;
    phone: string;
    instructions?: string;
  };
  dineIn?: {
    partySize: number;
    seatsReserved: boolean; // true from "accepted" until completed/rejected/cancelled
  };

  note?: string;
  paymentMethod: "cash";
  paymentStatus: "unpaid" | "paid";

  status: OrderStatus;
  statusHistory: IStatusChange[];
  rejectReason?: string;
  cancelReason?: string;
}

export type OrderDoc = HydratedDocument<IOrder>;

const addOnSchema = new Schema<IOrderAddOn>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true },
    groupName: { type: String, required: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    image: String,
    sizeId: Schema.Types.ObjectId,
    sizeName: String,
    basePrice: { type: Number, required: true, min: 0 },
    addOns: { type: [addOnSchema], default: [] },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    lineTotal: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 150 },
  },
  { _id: true },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantName: { type: String, required: true },
    type: { type: String, enum: ORDER_TYPES, required: true },

    items: {
      type: [orderItemSchema],
      validate: { validator: (v: unknown[]) => v.length > 0, message: "The order has no items" },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    customerName: { type: String, required: true },
    customerPhone: String,

    delivery: {
      type: new Schema(
        {
          street: { type: String, required: true, trim: true },
          area: { type: String, trim: true },
          city: { type: String, required: true, trim: true },
          phone: { type: String, required: true, trim: true },
          instructions: { type: String, trim: true, maxlength: 200 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    dineIn: {
      type: new Schema(
        {
          partySize: { type: Number, required: true, min: 1, max: 20 },
          seatsReserved: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: undefined,
    },

    note: { type: String, trim: true, maxlength: 300 },
    paymentMethod: { type: String, enum: ["cash"], default: "cash" },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    statusHistory: {
      type: [
        new Schema<IStatusChange>(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, default: Date.now },
            by: { type: Schema.Types.ObjectId, ref: "User" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    rejectReason: { type: String, trim: true, maxlength: 200 },
    cancelReason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

orderSchema.pre("validate", function () {
  if (this.type === "delivery" && !this.delivery) this.invalidate("delivery", "Add a delivery address");
  if (this.type === "dineIn" && !this.dineIn) this.invalidate("dineIn", "Enter the number of people");
});

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 }); // "My orders"
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 }); // manager's order board

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { __v: _v, ...rest } = ret;
    return rest;
  },
});

export const Order = model<IOrder>("Order", orderSchema);