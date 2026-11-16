import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../../constants/theme";
import { getUnreadCount } from "../../services/notificationApi";


export default function NotificationBell({
  href = "/notifications",
}: {
  href?: "/notifications" | "/manager/notifications";
}) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    getUnreadCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

  // When the screen opens / comes back, and every 30 s while it's open
  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, 30000);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  // A push arrived while the app is open → update right away
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(refresh);
    return () => sub.remove();
  }, [refresh]);

  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={8}
      className="h-12 w-12 items-center justify-center rounded-full"
      style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
      <Ionicons name="notifications" size={22} color={colors.white} />
      {unread > 0 && (
        <View
          className="absolute -right-0.5 -top-0.5 min-w-[20px] items-center rounded-full border-2 px-1"
          style={{ backgroundColor: colors.danger, borderColor: colors.brand }}>
          <Text className="text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}