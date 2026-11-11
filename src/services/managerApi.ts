import { api } from "../lib/api";
import type { ManagerRestaurant, PickedImage, RestaurantInput } from "../types/restaurant";

export const getMyRestaurant = async () => {
  const { data } = await api.get<{ restaurant: ManagerRestaurant }>("/manager/restaurant");
  return data.restaurant;
};

export const updateMyRestaurant = async (changes: Partial<RestaurantInput>) => {
  const { data } = await api.patch<{ restaurant: ManagerRestaurant }>("/manager/restaurant", changes);
  return data.restaurant;
};

export const setTemporarilyClosed = async (isTemporarilyClosed: boolean) => {
  const { data } = await api.patch<{ restaurant: ManagerRestaurant; message: string }>(
    "/manager/restaurant/temporary-close",
    { isTemporarilyClosed },
  );
  return data;
};

const toFormFile = (image: PickedImage, fallbackName: string) => {
  const type = image.mimeType ?? "image/jpeg";
  const extension = type.split("/")[1] ?? "jpg";
  return { uri: image.uri, type, name: image.fileName ?? `${fallbackName}.${extension}` } as unknown as Blob;
};

export const uploadMyRestaurantImages = async (images: { logo?: PickedImage; cover?: PickedImage }) => {
  const form = new FormData();
  if (images.logo) form.append("logo", toFormFile(images.logo, "logo"));
  if (images.cover) form.append("cover", toFormFile(images.cover, "cover"));

  const { data } = await api.patch<{ restaurant: ManagerRestaurant }>("/manager/restaurant/images", form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (body) => body,
    timeout: 60000,
  });
  return data.restaurant;
};