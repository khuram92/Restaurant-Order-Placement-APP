import { api } from "../lib/api";
import type { ManagerRestaurant } from "../types/restaurant";


export const getMyRestaurant = async () => {
  const { data } = await api.get<{ restaurant: ManagerRestaurant }>("/manager/restaurant");
  return data.restaurant;
};