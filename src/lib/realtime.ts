import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

export interface OrderEvent {
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  status: string;
  at: string;
}

type Listener = (event: OrderEvent | null) => void;

// Same server as the API, without "/api"
const SERVER_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

let socket: Socket | null = null;
const listeners = new Set<Listener>();
const tell = (event: OrderEvent | null) => listeners.forEach((l) => l(event));

/** Open the live connection with the login token (safe to call again) */
export const connectRealtime = (token: string) => {
  if (socket) socket.disconnect();
  socket = io(SERVER_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on("order:new", (e: OrderEvent) => tell(e));
  socket.on("order:updated", (e: OrderEvent) => tell(e));
  // After a drop (lift, no signal…) we may have missed events → screens reload once
  socket.io.on("reconnect", () => tell(null));
  socket.on("connect_error", (err) => {
    if (__DEV__) console.log("⚡ realtime:", err.message);
  });
};

export const disconnectRealtime = () => {
  socket?.disconnect();
  socket = null;
};

export function useOrderEvents(onChange: Listener) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const listener: Listener = (event) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => handler.current(event), 300);
      };
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (timer) clearTimeout(timer);
      };
    }, []),
  );
}
