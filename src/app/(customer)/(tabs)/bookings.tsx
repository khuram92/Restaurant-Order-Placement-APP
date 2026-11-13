import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import { listMyOrders } from "../../../services/orderApi";
import type {
  Order,
  OrderListResponse,
  OrderStatus,
} from "../../../types/order";
import { money } from "../../../utils/menuFormat";
import {
  ORDER_STATUS_INFO,
  ORDER_TYPE_INFO,
  timeAgo,
  trackerSteps,
} from "../../../utils/orderFormat";

type Tab = "active" | "past";

const STOPPED: OrderStatus[] = ["rejected", "cancelled"];

/** "2× Zinger, 1× Fries +1 more" */
const itemsSummary = (o: Order) => {
  const shown = o.items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`);
  const more = o.items.length - shown.length;
  return shown.join(", ") + (more > 0 ? ` +${more} more` : "");
};

/** Friendly status line for running orders */
const runningHint = (o: Order) => {
  switch (o.status) {
    case "pending":
      return "Waiting for the restaurant to confirm";
    case "accepted":
      return o.type === "dineIn"
        ? "Confirmed · your table is held"
        : "Confirmed · cooking starts soon";
    case "preparing":
      return "The kitchen is cooking your food";
    case "ready":
      return "Ready for pickup";
    case "outForDelivery":
      return "Your rider is on the way";
    case "served":
      return "Enjoy your meal!";
    default:
      return "";
  }
};

// ---------- One booking card ----------
function BookingCard({ order }: { order: Order }) {
  const typeInfo = ORDER_TYPE_INFO[order.type];
  const statusInfo = ORDER_STATUS_INFO[order.status];
  const stopped = STOPPED.includes(order.status);
  const done = order.status === "completed";
  const running = !stopped && !done;

  // Progress through this order type's steps
  const steps = trackerSteps(order.type);
  const stepIndex = Math.max(0, steps.indexOf(order.status));

  const pillBg = stopped
    ? "#fde8e6"
    : running
      ? colors.brand
      : colors.mistLight;
  const pillFg = stopped
    ? colors.danger
    : running
      ? colors.white
      : colors.brandDark;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/order/[id]", params: { id: order._id } })
      }
      className="mb-3 rounded-3xl bg-white p-4 active:opacity-80"
      style={[
        cardShadow,
        running && { borderWidth: 2, borderColor: colors.brand },
      ]}>
      {/* Restaurant + status */}
      <View className="flex-row items-center">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.brandSoft }}>
          <Text className="text-xl font-extrabold text-brand">
            {order.restaurantName[0]?.toUpperCase()}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text
            className="text-base font-bold text-brand-dark"
            numberOfLines={1}>
            {order.restaurantName}
          </Text>
          <Text className="text-xs text-brand-light">
            #{order.orderNumber} · {timeAgo(order.createdAt)}
          </Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: pillBg }}>
          <Ionicons name={statusInfo.icon} size={12} color={pillFg} />
          <Text className="ml-1 text-xs font-bold" style={{ color: pillFg }}>
            {order.status === "pending" ? "Placed" : statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Items */}
      <Text className="mt-3 text-sm text-brand-dark" numberOfLines={1}>
        {itemsSummary(order)}
      </Text>

      {/* Live progress (running orders only) */}
      {running && (
        <View className="mt-3">
          <View className="flex-row gap-1">
            {steps.map((s, i) => (
              <View
                key={s}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    i <= stepIndex ? colors.brand : colors.mistLight,
                }}
              />
            ))}
          </View>
          <Text className="mt-1.5 text-xs font-semibold text-brand">
            {runningHint(order)}
          </Text>
        </View>
      )}
      {stopped && !!(order.rejectReason || order.cancelReason) && (
        <Text
          className="mt-2 text-xs italic"
          style={{ color: colors.danger }}
          numberOfLines={2}>
          {order.status === "rejected" ? "Restaurant: " : "You cancelled: "}
          {order.rejectReason || order.cancelReason}
        </Text>
      )}

      {/* Footer: type + total + action */}
      <View
        className="mt-3 flex-row items-center border-t pt-3"
        style={{ borderColor: colors.mist }}>
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: colors.mistLight }}>
          <Ionicons name={typeInfo.icon} size={12} color={colors.brand} />
          <Text className="ml-1 text-xs font-bold text-brand-dark">
            {typeInfo.label}
            {order.dineIn ? ` · ${order.dineIn.partySize}` : ""}
          </Text>
        </View>
        <Text className="ml-2 flex-1 text-base font-extrabold text-brand-dark">
          {money(order.total)}
        </Text>
        <View className="flex-row items-center">
          <Text className="mr-0.5 text-sm font-bold text-brand">
            {running ? "Track" : "Details"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.brand} />
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Screen ----------
export default function BookingsScreen() {
  const [tab, setTab] = useState<Tab>("active");
  const [data, setData] = useState<OrderListResponse | null>(null);
  const [counts, setCounts] = useState<{ active: number; past: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const load = useCallback(async (which: Tab) => {
    setError("");
    try {
      // List for this tab + both counts for the tab chips
      const [list, active, past] = await Promise.all([
        listMyOrders(which, 1),
        which === "active" ? null : listMyOrders("active", 1),
        which === "past" ? null : listMyOrders("past", 1),
      ]);
      if (tabRef.current !== which) return; // the user switched tabs meanwhile
      setData(list);
      setCounts({
        active: which === "active" ? list.total : (active?.total ?? 0),
        past: which === "past" ? list.total : (past?.total ?? 0),
      });
    } catch (err) {
      if (tabRef.current === which) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Switch tab → load it
  useEffect(() => {
    setLoading(true);
    setData(null);
    load(tab);
  }, [tab, load]);

  // While this screen is open: refresh every 20 s (statuses move on their own)
  useFocusEffect(
    useCallback(() => {
      load(tabRef.current);
      const timer = setInterval(() => load(tabRef.current), 20000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
      const more = await listMyOrders(tab, data.page + 1);
      setData((d) =>
        d ? { ...more, orders: [...d.orders, ...more.orders] } : more,
      );
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View className="flex-1 bg-mist">
      {/* Header + tabs */}
      <View className=" bg-brand pb-4">
        <SafeAreaView edges={["top"]}>
          <View className="px-5 pb-4 pt-2">
            <Text className="text-2xl font-extrabold text-white">
              My bookings
            </Text>
            <Text className="text-sm text-brand-soft">
              Your orders and table bookings
            </Text>
          </View>
          <View
            className="mx-4 flex-row rounded-2xl p-1"
            style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
            {(["active", "past"] as const).map((t) => {
              const selected = tab === t;
              const count = counts?.[t];
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                  style={{
                    backgroundColor: selected ? colors.white : "transparent",
                  }}>
                  <Ionicons
                    name={t === "active" ? "flame" : "time"}
                    size={15}
                    color={selected ? colors.brand : colors.white}
                  />
                  <Text
                    className="ml-1.5 text-sm font-bold"
                    style={{ color: selected ? colors.brand : colors.white }}>
                    {t === "active" ? "Active" : "Past"}
                  </Text>
                  {!!count && (
                    <View
                      className="ml-1.5 min-w-[20px] items-center rounded-full px-1.5"
                      style={{
                        backgroundColor: selected ? colors.brand : colors.white,
                      }}>
                      <Text
                        className="text-xs font-extrabold"
                        style={{
                          color: selected ? colors.white : colors.brand,
                        }}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable
            onPress={() => load(tab)}
            className="mt-4 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <BookingCard order={item} />}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(tab);
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name={tab === "active" ? "restaurant" : "receipt"}
                  size={34}
                  color={colors.brandLight}
                />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                {tab === "active" ? "Nothing on the way" : "No past orders yet"}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {tab === "active"
                  ? "When you order or book a table, you can track it here."
                  : "Finished orders will show here."}
              </Text>
              {tab === "active" && (
                <Pressable
                  onPress={() => router.navigate("/")}
                  className="mt-5 flex-row items-center rounded-2xl px-5 py-3"
                  style={{ backgroundColor: colors.brand }}>
                  <Ionicons name="storefront" size={16} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">
                    Browse restaurants
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
