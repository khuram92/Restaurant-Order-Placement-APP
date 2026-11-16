import { api } from "../lib/api";
import type { AppNotification, NotificationListResponse } from "../types/notification";

export const listNotifications = async (page = 1) => {
  const { data } = await api.get<NotificationListResponse>("/notifications", { params: { page } });
  return data;
};

export const getUnreadCount = async () => {
  const { data } = await api.get<{ unread: number }>("/notifications/unread-count");
  return data.unread;
};

export const markNotificationRead = async (id: string) => {
  const { data } = await api.patch<{ notification: AppNotification }>(`/notifications/${id}/read`);
  return data.notification;
};

export const markAllNotificationsRead = async () => {
  await api.patch("/notifications/read-all");
};

export const clearNotifications = async () => {
  await api.delete("/notifications");
};