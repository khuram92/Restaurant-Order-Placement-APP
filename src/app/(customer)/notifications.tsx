import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import {
  clearNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationApi";
import type { AppNotification } from "../../types/notification";
import type { OrderStatus } from "../../types/order";
import { ORDER_STATUS_INFO, timeAgo } from "../../utils/orderFormat";

// ---------- Helpers ----------
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today" / "Yesterday" / "Earlier" */
const groupOf = (iso: string) => {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (day === today) return "Today";
  if (day === today - 24 * 60 * 60 * 1000) return "Yesterday";
  return "Earlier";
};

const isStop = (status?: string) =>
  status === "rejected" || status === "cancelled";

const iconFor = (status?: string) =>
  status && status in ORDER_STATUS_INFO
    ? ORDER_STATUS_INFO[status as OrderStatus].icon
    : "notifications";

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const unread = !item.readAt;
  const stop = isStop(item.orderStatus);
  const done = item.orderStatus === "completed";

  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 flex-row rounded-3xl p-4 active:opacity-80"
      style={[
        cardShadow,
        { backgroundColor: unread ? colors.white : colors.mistLight },
      ]}>
      {/* Restaurant image + small status badge */}
      <View>
        <View
          className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
          style={{ backgroundColor: colors.mistDark }}>
          {item.restaurantImage ? (
            <Image
              source={{ uri: item.restaurantImage }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <Text className="text-xl font-extrabold text-brand">
              {item.restaurantName?.[0]?.toUpperCase() ?? "•"}
            </Text>
          )}
        </View>
        
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row items-start">
          <Text
            className={`flex-1 pr-2 text-base ${unread ? "font-extrabold" : "font-semibold"}`}
            style={{ color: stop ? colors.danger : colors.text }}
            numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-xs text-brand-light">
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        <Text
          className="mt-0.5 text-sm leading-5"
          style={{ color: unread ? colors.brandDark : colors.brandLight }}
          numberOfLines={3}>
          {item.body}
        </Text>
        {!!item.orderId && (
          <View className="mt-2 flex-row items-center">
            <Text className="text-xs font-bold text-brand">View order</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.brand} />
          </View>
        )}
      </View>

      {unread && (
        <View
          className="ml-2 mt-1.5 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.danger }}
        />
      )}
    </Pressable>
  );
}

// ---------- Screen ----------
export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await listNotifications(1);
      setItems(res.notifications);
      setUnread(res.unread);
      setPage(res.page);
      setPages(res.pages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A push arrived while this screen is open → show it at the top
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => load());
    return () => sub.remove();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || loading || page >= pages) return;
    setLoadingMore(true);
    try {
      const res = await listNotifications(page + 1);
      setItems((prev) => [...prev, ...res.notifications]);
      setPage(res.page);
      setPages(res.pages);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  /** Tap → mark read (right away on screen) → open the order */
  const open = (item: AppNotification) => {
    if (!item.readAt) {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, readAt: now } : n)),
      );
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(item._id).catch(() => {});
    }
    if (item.orderId)
      router.push({ pathname: "/order/[id]", params: { id: item.orderId } });
  };

  const readAll = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      Alert.alert("Couldn't update", getErrorMessage(err));
      load();
    }
  };

  const confirmClear = () =>
    Alert.alert(
      "Clear all notifications?",
      "This removes them from this list. Your orders stay in My bookings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            try {
              await clearNotifications();
              setItems([]);
              setUnread(0);
              setPages(1);
            } catch (err) {
              Alert.alert("Couldn't clear", getErrorMessage(err));
            }
          },
        },
      ],
    );

  // Today / Yesterday / Earlier
  const sections = useMemo(() => {
    const order = ["Today", "Yesterday", "Earlier"];
    const groups = new Map<string, AppNotification[]>();
    items.forEach((n) => {
      const g = groupOf(n.createdAt);
      groups.set(g, [...(groups.get(g) ?? []), n]);
    });
    return order
      .filter((g) => groups.has(g))
      .map((g) => ({ title: g, data: groups.get(g)! }));
  }, [items]);

  return (
    <View className="flex-1 bg-mist">
      <View className=" bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-5 pt-2 gap-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">
                Notifications
              </Text>
              <Text className="text-sm text-brand-soft">
                {unread > 0
                  ? `${unread} unread`
                  : items.length > 0
                    ? "You're all caught up"
                    : "Order updates show here"}
              </Text>
            </View>
            {items.length > 0 && (
              <Pressable
                onPress={confirmClear}
                hitSlop={8}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                <Ionicons name="trash" size={18} color={colors.white} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable
            onPress={load}
            className="mt-4 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n._id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={() => open(item)} />
          )}
          renderSectionHeader={({ section }) => (
            <Text className="mb-2 mt-3 ml-1 text-xs font-bold uppercase tracking-wide text-brand-light">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            unread > 0 ? (
              <Pressable
                onPress={readAll}
                className="mt-4 flex-row items-center self-end rounded-full px-3.5 py-2"
                style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons
                  name="checkmark-done"
                  size={15}
                  color={colors.brand}
                />
                <Text className="ml-1 text-sm font-bold text-brand">
                  Mark all as read
                </Text>
              </Pressable>
            ) : undefined
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name="notifications"
                  size={34}
                  color={colors.brandLight}
                />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                No notifications yet
              </Text>
              <Text className="mt-1 px-6 text-center text-sm text-brand-light">
                When a restaurant confirms or updates your order, you'll see it
                here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
