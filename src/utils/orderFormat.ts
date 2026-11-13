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


/** The next step for an order, or null when it's finished / stopped */
export const nextOrderStatus = (type: OrderType, status: OrderStatus): OrderStatus | null => {
  const steps = trackerSteps(type);
  const i = steps.indexOf(status);
  return i === -1 || i === steps.length - 1 ? null : (steps[i + 1] ?? null);
};

/** Button text for moving an order TO this status (manager side) */
export const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; icon: IconName }>> = {
  accepted: { label: "Accept", icon: "checkmark-circle" },
  preparing: { label: "Start preparing", icon: "flame" },
  ready: { label: "Mark ready", icon: "notifications" },
  outForDelivery: { label: "Send with rider", icon: "bicycle" },
  served: { label: "Mark served", icon: "restaurant" },
  completed: { label: "Complete", icon: "trophy" },
};

/** "Just now", "5 min ago", "2 h ago", or the date */
export const timeAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatOrderDate(iso);
};