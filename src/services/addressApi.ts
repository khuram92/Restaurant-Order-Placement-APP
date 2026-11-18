import { api } from "../lib/api";
import type { AddressInput, SavedAddress } from "../types/address";

type ListResponse = { addresses: SavedAddress[] };

export const getAddresses = async () => {
  const { data } = await api.get<ListResponse>("/auth/addresses");
  return data.addresses;
};

/** Saving Home / Work replaces the old one */
export const saveAddress = async (input: AddressInput) => {
  const { data } = await api.post<ListResponse>("/auth/addresses", input);
  return data.addresses;
};

export const updateAddress = async (id: string, input: AddressInput) => {
  const { data } = await api.patch<ListResponse>(`/auth/addresses/${id}`, input);
  return data.addresses;
};

export const deleteAddress = async (id: string) => {
  const { data } = await api.delete<ListResponse>(`/auth/addresses/${id}`);
  return data.addresses;
};