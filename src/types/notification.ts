export interface AppNotification {
  _id: string;
  type: "order";
  title: string;
  body: string;
  orderId?: string;
  orderStatus?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  total: number;
  page: number;
  pages: number;
  unread: number;
}