import { api } from "../lib/api";
import type { ManagerOrderListResponse, ManagerOrderTab, Order, OrderStatus } from "../types/order";

/** Manager: orders of their restaurant for one tab (+ tab counts and seats) */
export const listRestaurantOrders = async (tab: ManagerOrderTab = "new", page = 1) => {
  const { data } = await api.get<ManagerOrderListResponse>("/manager/orders", { params: { tab, page } });
  return data;
};

export const getRestaurantOrder = async (id: string) => {
  const { data } = await api.get<{ order: Order }>(`/manager/orders/${id}`);
  return data.order;
};

/** One step forward, or "rejected" (with a reason) while pending */
export const updateOrderStatus = async (id: string, status: OrderStatus, reason?: string) => {
  const { data } = await api.patch<{ order: Order; message: string }>(
    `/manager/orders/${id}/status`,
    reason ? { status, reason } : { status },
  );
  return data.order;
};