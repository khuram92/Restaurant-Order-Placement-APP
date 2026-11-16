import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { getPushToken } from "../lib/notifications";
import { savePushToken } from "../services/pushApi";
import type { User } from "../types/auth";

type PushData = { type?: string; orderId?: string };

/** Open the right screen for a tapped notification */
const openFromNotification = (data: PushData, role: User["role"]) => {
  if (!data.orderId) return;
  if (data.type === "manager-order" && role === "manager") {
    router.push({ pathname: "/manager/orders/[id]", params: { id: data.orderId } });
  } else if (data.type === "customer-order" && role === "customer") {
    router.push({ pathname: "/order/[id]", params: { id: data.orderId } });
  }
};

/**
 * Use once, in the root layout:
 *  - registers this phone's push token for the logged-in user
 *  - opens the order when a notification is tapped (also when the tap started the app)
 */
export function usePushNotifications(user: User | null, ready: boolean) {
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);
  const userId = user?._id;
  const role = user?.role;

  // 1) Register the token whenever someone is logged in (and again if the user changes)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const token = await getPushToken();
      if (token && !cancelled) await savePushToken(token).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 2) Notification tapped → open the order (waits until the app has finished loading)
  useEffect(() => {
    if (!ready || !role || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return; // already opened this one
    handledId.current = id;
    // small delay so the redirect to the right group (customer / manager) happens first
    const timer = setTimeout(
      () => openFromNotification(lastResponse.notification.request.content.data as PushData, role),
      300,
    );
    return () => clearTimeout(timer);
  }, [lastResponse, ready, role]);
}