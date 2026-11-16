import { api } from "../lib/api";
import type {
  AdminOrderDetail,
  AdminOrderListResponse,
  AdminOrderRange,
  AdminOrderRestaurant,
  AdminOrderTab,
  OrderType,
} from "../types/order";

export interface AdminOrderFilters {
  tab: AdminOrderTab;
  restaurantId?: string | undefined;
  type?: OrderType | undefined;
  range: AdminOrderRange;
  q?: string | undefined;
}

/** Super admin: every order, filtered */
export const listAllOrders = async (filters: AdminOrderFilters, page = 1) => {
  const { data } = await api.get<AdminOrderListResponse>("/admin/orders", {
    params: {
      tab: filters.tab,
      range: filters.range,
      page,
      ...(filters.restaurantId && { restaurantId: filters.restaurantId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.q?.trim() && { q: filters.q.trim() }),
    },
  });
  return data;
};

export const getOrderFilterRestaurants = async () => {
  const { data } = await api.get<{ restaurants: AdminOrderRestaurant[] }>("/admin/orders/restaurants");
  return data.restaurants;
};

export const getAnyOrder = async (id: string) => {
  const { data } = await api.get<AdminOrderDetail>(`/admin/orders/${id}`);
  return data;
};