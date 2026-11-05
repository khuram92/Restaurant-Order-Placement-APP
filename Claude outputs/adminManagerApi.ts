import { api } from "../lib/api";
import type {
  Manager,
  ManagerInput,
  ManagerListResponse,
  ManagerStatusFilter,
  PasswordDelivery,
  RestaurantOption,
} from "../types/manager";

export const listManagers = async (params: { search?: string; status?: ManagerStatusFilter; page?: number } = {}) => {
  const { data } = await api.get<ManagerListResponse>("/admin/managers", {
    params: {
      ...(params.search && { search: params.search }),
      status: params.status ?? "all",
      page: params.page ?? 1,
      limit: 20,
    },
  });
  return data;
};

/** All restaurants + who manages each (for the picker) */
export const getRestaurantOptions = async () => {
  const { data } = await api.get<{ restaurants: RestaurantOption[] }>("/admin/managers/restaurant-options");
  return data.restaurants;
};

export const getManager = async (id: string) => {
  const { data } = await api.get<{ manager: Manager }>(`/admin/managers/${id}`);
  return data.manager;
};

export const createManager = async (input: ManagerInput) => {
  const { phone, ...rest } = input;
  const { data } = await api.post<{ manager: Manager } & PasswordDelivery>("/admin/managers", {
    ...rest,
    ...(phone && { phone }), // create: leave phone out when empty
  });
  return data;
};

export const updateManager = async (id: string, input: Partial<ManagerInput>) => {
  const { data } = await api.patch<{ manager: Manager }>(`/admin/managers/${id}`, input);
  return data.manager;
};

export const setManagerStatus = async (id: string, isActive: boolean) => {
  const { data } = await api.patch<{ manager: Manager; message: string }>(`/admin/managers/${id}/status`, {
    isActive,
  });
  return data;
};

export const resetManagerPassword = async (id: string) => {
  const { data } = await api.post<{ message: string } & PasswordDelivery>(`/admin/managers/${id}/reset-password`);
  return data;
};

export const deleteManager = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/admin/managers/${id}`);
  return data;
};

/** "Ahmed Raza" (or the email if no name) */
export const managerName = (m: Pick<Manager, "firstName" | "lastName" | "email">) =>
  `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email;

/** "AR" */
export const managerInitials = (m: Pick<Manager, "firstName" | "lastName" | "email">) =>
  (`${m.firstName?.[0] ?? ""}${m.lastName?.[0] ?? ""}` || m.email[0] || "?").toUpperCase();
