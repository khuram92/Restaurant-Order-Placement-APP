import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { OrderDoc } from "../models/Order.js";
import { User } from "../models/User.js";
import { tokenIsCurrent, verifyToken } from "./jwt.js";

let io: Server | null = null;

export const initRealtime = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: "*" },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Not logged in"));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select(
        "role restaurantId isActive tokenVersion",
      );
      if (!user || !user.isActive || !tokenIsCurrent(payload, user))
        return next(new Error("Not allowed"));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      socket.data.restaurantId = user.restaurantId
        ? String(user.restaurantId)
        : undefined;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    if (socket.data.role === "manager" && socket.data.restaurantId) {
      socket.join(`restaurant:${socket.data.restaurantId}`);
    }
    if (socket.data.role === "superadmin") socket.join("admins");
  });

  console.log("⚡ Live updates ready (Socket.io)");
};
export const disconnectUser = (userId: string) => {
  io?.in(`user:${userId}`).disconnectSockets(true);
};
export type OrderEventName = "order:new" | "order:updated";

export interface OrderEvent {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  status: string;
  at: string;
}

export const emitOrderEvent = (name: OrderEventName, order: OrderDoc) => {
  if (!io) return;
  const event: OrderEvent = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    restaurantId: String(order.restaurantId),
    status: order.status,
    at: new Date().toISOString(),
  };
  io.to(`user:${order.customerId}`)
    .to(`restaurant:${order.restaurantId}`)
    .to("admins")
    .emit(name, event);
};
