import { api } from "../lib/api";
import type {
  Restaurant,
  RestaurantInput,
  RestaurantListResponse,
  RestaurantStatusFilter,
} from "../types/restaurant";

export interface ListParams {
  search?: string;
  status?: RestaurantStatusFilter;
  city?: string;
  page?: number;
  limit?: number;
}

/** Super Admin: list restaurants with search, filter and pages */
export const listRestaurants = async (params: ListParams = {}) => {
  const { data } = await api.get<RestaurantListResponse>("/admin/restaurants", {
    params: {
      ...(params.search && { search: params.search }),
      ...(params.city && { city: params.city }),
      status: params.status ?? "all",
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return data;
};

export const getRestaurant = async (id: string) => {
  const { data } = await api.get<{ restaurant: Restaurant }>(`/admin/restaurants/${id}`);
  return data.restaurant;
};

export const createRestaurant = async (input: RestaurantInput) => {
  const { data } = await api.post<{ restaurant: Restaurant }>("/admin/restaurants", input);
  return data.restaurant;
};

/** Send only the fields that changed */
export const updateRestaurant = async (id: string, changes: Partial<RestaurantInput>) => {
  const { data } = await api.patch<{ restaurant: Restaurant }>(`/admin/restaurants/${id}`, changes);
  return data.restaurant;
};

export const setRestaurantStatus = async (id: string, isActive: boolean) => {
  const { data } = await api.patch<{ restaurant: Restaurant; message: string }>(
    `/admin/restaurants/${id}/status`,
    { isActive }
  );
  return data;
};