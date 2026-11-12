import { api } from "../lib/api";
import type {
  CustomerRestaurant,
  CustomerRestaurantListResponse,
  ServiceKey,
} from "../types/restaurant";
import type { MenuCategoryWithItems } from "../types/menu";
export interface BrowseParams {
  search?: string;
  service?: ServiceKey;
  city?: string;
  page?: number;
  limit?: number;
}

/** Customer: active restaurants (with isOpenNow) */
export const browseRestaurants = async (params: BrowseParams = {}) => {
  const { data } = await api.get<CustomerRestaurantListResponse>("/restaurants", {
    params: {
      ...(params.search && { search: params.search }),
      ...(params.service && { service: params.service }),
      ...(params.city && { city: params.city }),
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return data;
};



export const getCustomerRestaurant = async (id: string) => {
  const { data } = await api.get<{ restaurant: CustomerRestaurant }>(`/restaurants/${id}`);
  return data.restaurant;
};


export const getCustomerMenu = async (id: string) => {
  const { data } = await api.get<{ categories: MenuCategoryWithItems[] }>(`/restaurants/${id}/menu`);
  return data.categories;
};


export interface SeatAvailability {
  capacity: number;
  inUse: number;
  free: number;
}

/** Customer: dine-in seats free right now */
export const getSeatAvailability = async (id: string) => {
  const { data } = await api.get<SeatAvailability>(`/restaurants/${id}/seats`);
  return data;
};