import { User } from "../models/User.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const isExpoPushToken = (token: string) => /^Expo(nent)?PushToken\[.+\]$/.test(token);

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>; // read by the app when the notification is tapped
}

interface PushTicket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/**
 * Send one notification to all phones of these users (Expo Push Service → FCM/APNs).
 * Never throws: a failed push must not break an order.
 */
export const sendPushToUsers = async (userIds: unknown[], message: PushMessage) => {
  try {
    if (userIds.length === 0) return;

    const users = await User.find({ _id: { $in: userIds }, isActive: true }).select("+pushTokens");
    const tokens = [...new Set(users.flatMap((u) => u.pushTokens ?? []))].filter(isExpoPushToken);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: "new_order.wav", // iOS: custom sound (Android uses the channel's sound)
      channelId: "orders", // Android channel created by the app (sound + vibration)
      priority: "high",
    }));

    // Expo accepts up to 100 messages per request
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          // Only needed if you turn on "Enhanced push security" in your Expo account
          ...(process.env.EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }),
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error("❌ Push request failed:", response.status, await response.text());
        continue;
      }

      // Remove tokens of phones that uninstalled the app / turned off notifications
      const { data: tickets } = (await response.json()) as { data: PushTicket[] };
      const dead = tickets
        .map((ticket, index) => (ticket.details?.error === "DeviceNotRegistered" ? chunk[index]?.to : null))
        .filter((t): t is string => !!t);
      if (dead.length) await User.updateMany({ pushTokens: { $in: dead } }, { $pull: { pushTokens: { $in: dead } } });

      tickets
        .filter((t) => t.status === "error" && t.details?.error !== "DeviceNotRegistered")
        .forEach((t) => console.error("❌ Push error:", t.message));
    }
  } catch (error) {
    console.error("❌ Push failed:", (error as Error).message);
  }
};