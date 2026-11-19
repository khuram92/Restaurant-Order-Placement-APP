import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { OrderStatus, OrderType } from "../types/order";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const ORDER_TYPE_INFO: Record<
  OrderType,
  { label: string; icon: IconName }
> = {
  dineIn: { label: "Dine-in", icon: "restaurant" },
  takeaway: { label: "Takeaway", icon: "bag-handle" },
  delivery: { label: "Delivery", icon: "bicycle" },
};

export const ORDER_STATUS_INFO: Record<
  OrderStatus,
  { label: string; icon: IconName }
> = {
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

export const trackerSteps = (type: OrderType): OrderStatus[] => {
  if (type === "delivery")
    return ["pending", "accepted", "preparing", "outForDelivery", "completed"];
  if (type === "dineIn")
    return ["pending", "accepted", "preparing", "served", "completed"];
  return ["pending", "accepted", "preparing", "ready", "completed"];
};

export const formatOrderDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const nextOrderStatus = (
  type: OrderType,
  status: OrderStatus,
): OrderStatus | null => {
  const steps = trackerSteps(type);
  const i = steps.indexOf(status);
  return i === -1 || i === steps.length - 1 ? null : (steps[i + 1] ?? null);
};

export const NEXT_ACTION: Partial<
  Record<OrderStatus, { label: string; icon: IconName }>
> = {
  accepted: { label: "Accept", icon: "checkmark-circle" },
  preparing: { label: "Start preparing", icon: "flame" },
  ready: { label: "Mark ready", icon: "notifications" },
  outForDelivery: { label: "Send with rider", icon: "bicycle" },
  served: { label: "Mark served", icon: "restaurant" },
  completed: { label: "Complete", icon: "trophy" },
};

export const timeAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatOrderDate(iso);
};

export const AUTO_CANCEL_MINUTES = 20;

export const autoCancelIn = (o: { status: string; createdAt: string }) => {
  if (o.status !== "pending") return null;
  const left =
    new Date(o.createdAt).getTime() + AUTO_CANCEL_MINUTES * 60_000 - Date.now();
  return Math.max(1, Math.ceil(left / 60_000));
};

export const stoppedLabel = (
  o: { status: string; cancelledBy?: "customer" | "system" },
  viewer: "customer" | "manager" | "admin",
) => {
  if (o.status === "rejected") {
    return viewer === "customer"
      ? "Restaurant: "
      : viewer === "manager"
        ? "You rejected it: "
        : "Rejected by the restaurant: ";
  }
  if (o.cancelledBy === "system") return "Auto-cancelled: ";
  return viewer === "customer"
    ? "You cancelled: "
    : viewer === "manager"
      ? "The customer cancelled: "
      : "Cancelled by the customer: ";
};

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });


export const minutesUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000);


export const showsEta = (o: { status: string; readyBy?: string }) =>
  !!o.readyBy && (o.status === "accepted" || o.status === "preparing");


export const etaLeftText = (iso: string) => {
  const left = minutesUntil(iso);
  if (left > 1) return `${left} min left`;
  if (left >= -2) return "Any minute now";
  return `Running ${-left} min late`;
};