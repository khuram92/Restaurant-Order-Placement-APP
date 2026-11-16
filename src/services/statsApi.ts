import { api } from "../lib/api";
import type { AdminStats, OrderStats, StatsRange } from "../types/stats";

export const getManagerStats = async (range: StatsRange) => {
  const { data } = await api.get<OrderStats>("/manager/stats", { params: { range } });
  return data;
};

export const getAdminStats = async (range: StatsRange) => {
  const { data } = await api.get<AdminStats>("/admin/stats", { params: { range } });
  return data;
};