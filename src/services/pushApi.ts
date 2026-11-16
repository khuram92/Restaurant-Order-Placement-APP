import { api } from "../lib/api";

/** Tell the backend this phone should get this user's notifications */
export const savePushToken = async (token: string) => {
  await api.post("/auth/push-token", { token });
};

/** Stop sending this user's notifications to this phone (sign out) */
export const removePushToken = async (token: string) => {
  await api.post("/auth/push-token/remove", { token });
};