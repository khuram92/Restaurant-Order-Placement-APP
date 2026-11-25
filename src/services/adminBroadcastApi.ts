import { api } from "../lib/api";
import type {
  Broadcast,
  BroadcastAudienceInput,
  BroadcastHistory,
  BroadcastInput,
  BroadcastPreview,
} from "../types/broadcast";


export const previewBroadcast = async (input: BroadcastAudienceInput) => {
  const { data } = await api.post<BroadcastPreview>("/admin/broadcasts/preview", input);
  return data;
};

export const sendBroadcast = async (input: BroadcastInput) => {
  const { data } = await api.post<{ message: string; broadcast: Broadcast }>("/admin/broadcasts", input);
  return data;
};

export const listBroadcasts = async () => {
  const { data } = await api.get<BroadcastHistory>("/admin/broadcasts");
  return data;
};