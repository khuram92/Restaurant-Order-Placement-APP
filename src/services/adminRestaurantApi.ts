import { api } from "../lib/api";
import type {
  PickedImage,
  Restaurant,
  RestaurantInput,
  RestaurantListResponse,
  RestaurantStatusFilter,
} from "../types/restaurant";;

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

/** Turns a picked image into the { uri, type, name } object React Native's FormData expects */
const toFormFile = (image: PickedImage, fallbackName: string) => {
  const type = image.mimeType ?? "image/jpeg";
  const extension = type.split("/")[1] ?? "jpg";
  return {
    uri: image.uri,
    type,
    name: image.fileName ?? `${fallbackName}.${extension}`,
  } as unknown as Blob;
};

/**
 * Upload logo and/or cover. Uses axios (XMLHttpRequest) because Expo's
 * fetch doesn't accept React Native's { uri, type, name } files.
 */
export const uploadRestaurantImages = async (id: string, images: { logo?: PickedImage; cover?: PickedImage }) => {
  const form = new FormData();
  if (images.logo) form.append("logo", toFormFile(images.logo, "logo"));
  if (images.cover) form.append("cover", toFormFile(images.cover, "cover"));

  const { data } = await api.patch<{ restaurant: Restaurant }>(`/admin/restaurants/${id}/images`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (body) => body, // send FormData as-is
    timeout: 60000,
  });
  return data.restaurant;
};