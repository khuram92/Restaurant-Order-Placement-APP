import { api } from "../lib/api";
import type { Order, OrderListResponse, PlaceOrderInput } from "../types/order";

/** Customer: place an order */
export const placeOrder = async (input: PlaceOrderInput) => {
  const { data } = await api.post<{ order: Order }>("/orders", input);
  return data.order;
};

/** Customer: own orders, newest first */
export const listMyOrders = async (status: "active" | "past" | "all" = "all", page = 1) => {
  const { data } = await api.get<OrderListResponse>("/orders", { params: { status, page } });
  return data;
};

export const getMyOrder = async (id: string) => {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
};

/** Only works while the order is still pending */
export const cancelMyOrder = async (id: string, reason?: string) => {
  const { data } = await api.patch<{ order: Order; message: string }>(`/orders/${id}/cancel`, reason ? { reason } : {});
  return data.order;
};