import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { OrderStatus, OrderType } from "../types/order";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const ORDER_TYPE_INFO: Record<OrderType, { label: string; icon: IconName }> = {
  dineIn: { label: "Dine-in", icon: "restaurant" },
  takeaway: { label: "Takeaway", icon: "bag-handle" },
  delivery: { label: "Delivery", icon: "bicycle" },
};

export const ORDER_STATUS_INFO: Record<OrderStatus, { label: string; icon: IconName }> = {
  pending: { label: "Waiting for the restaurant", icon: "hourglass" },
  accepted: { label: "Accepted", icon: "checkmark-circle" },
  rejected: { label: "Rejected", icon: "close-circle" },
  preparing: { label: "Being prepared", icon: "flame" },
  ready: { label: "Ready", icon: "notifications" },
  outForDelivery: { label: "On the way", icon: "bicycle" },
  served: { label: "Served", icon: "restaurant" },
  completed: { label: "Completed", icon: "trophy" },
  cancelled: { label: "Cancelled", icon: "ban" },
};

/** The steps shown in the tracker for each order type */
export const trackerSteps = (type: OrderType): OrderStatus[] => {
  if (type === "delivery") return ["pending", "accepted", "preparing", "outForDelivery", "completed"];
  if (type === "dineIn") return ["pending", "accepted", "preparing", "served", "completed"];
  return ["pending", "accepted", "preparing", "ready", "completed"];
};

/** "12 Nov, 5:42 PM" */
export const formatOrderDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });