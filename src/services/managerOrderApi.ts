import { api } from "../lib/api";
import type {
  ManagerOrderListResponse,
  ManagerOrderTab,
  Order,
  OrderStatus,
} from "../types/order";


export const listRestaurantOrders = async (
  tab: ManagerOrderTab = "new",
  page = 1,
  q = "",
) => {
  const params = q.trim() ? { tab, page, q: q.trim() } : { tab, page };
  const { data } = await api.get<ManagerOrderListResponse>("/manager/orders", {
    params,
  });
  return data;
};

export const getRestaurantOrder = async (id: string) => {
  const { data } = await api.get<{ order: Order }>(`/manager/orders/${id}`);
  return data.order;
};


export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  reason?: string,
  prepMinutes?: number,
) => {
  const { data } = await api.patch<{ order: Order; message: string }>(`/manager/orders/${id}/status`, {
    status,
    ...(reason && { reason }),
    ...(prepMinutes && { prepMinutes }),
  });
  return data.order;
};
export const delayOrder = async (id: string, addMinutes: number) => {
  const { data } = await api.patch<{ order: Order; message: string }>(`/manager/orders/${id}/delay`, {
    addMinutes,
  });
  return data.order;
};