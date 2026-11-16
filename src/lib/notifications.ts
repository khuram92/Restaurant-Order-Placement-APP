import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { colors } from "../constants/theme";

/** Same id the backend sends as `channelId` */
export const ORDERS_CHANNEL = "orders";

// Show notifications (with sound) even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android: the channel decides sound + vibration (create it before the first notification) */
export const setupNotificationChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, {
    name: "Orders",
    description: "New orders and order updates",
    importance: Notifications.AndroidImportance.MAX,
    sound: "new_order.wav", // the file from app.json → expo-notifications "sounds"
    vibrationPattern: [0, 400, 200, 400],
    lightColor: colors.brand,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

/** Expo Go can't receive remote push (SDK 53+) — skip there instead of crashing */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let currentToken: string | null = null;

/** The token we registered on this phone (used on sign out) */
export const getCurrentPushToken = () => currentToken;

/**
 * Ask permission and get this phone's Expo push token.
 * Returns null if not allowed / not possible (Expo Go, no permission, emulator without Google Play…).
 */
export const getPushToken = async (): Promise<string | null> => {
  if (isExpoGo) return null;

  try {
    await setupNotificationChannel(); // Android 13+ shows the permission prompt only after a channel exists

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("⚠️ No EAS projectId in app.json → can't get a push token");
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    return data;
  } catch (error) {
    console.warn("⚠️ Couldn't get a push token:", (error as Error).message);
    return null;
  }
};