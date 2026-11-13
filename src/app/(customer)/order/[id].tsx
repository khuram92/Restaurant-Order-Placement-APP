import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import { cancelMyOrder, getMyOrder } from "../../../services/orderApi";
import type { Order } from "../../../types/order";
import { money } from "../../../utils/menuFormat";
import { formatOrderDate, ORDER_STATUS_INFO, ORDER_TYPE_INFO, trackerSteps } from "../../../utils/orderFormat";

const FINISHED = ["completed", "rejected", "cancelled"];


function Tracker({ order }: { order: Order }) {
  const steps = trackerSteps(order.type);
  const currentIndex = Math.max(0, steps.indexOf(order.status));

  return (
    <View className="mt-1">
      {steps.map((step, i) => {
        const done = i < currentIndex || order.status === "completed";
        const current = i === currentIndex && order.status !== "completed";
        const reachedAt = order.statusHistory.find((h) => h.status === step)?.at;
        const info = ORDER_STATUS_INFO[step];
        return (
          <View key={step} className="flex-row">
            {/* Dot + line */}
            <View className="mr-3 items-center">
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: done || current ? colors.brand : colors.mist }}>
                <Ionicons name={done ? "checkmark" : info.icon} size={16} color={done || current ? colors.white : colors.brandLight} />
              </View>
              {i < steps.length - 1 && (
                <View className="w-0.5 flex-1" style={{ minHeight: 18, backgroundColor: done ? colors.brand : colors.mist }} />
              )}
            </View>
            <View className="flex-1 pb-4 pt-1">
              <Text
                className={`text-sm ${current ? "font-extrabold" : "font-semibold"}`}
                style={{ color: done || current ? colors.brandDark : colors.placeholder }}>
                {info.label}
              </Text>
              {!!reachedAt && <Text className="text-xs text-brand-light">{formatOrderDate(reachedAt)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setOrder(await getMyOrder(String(id)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Check for updates every 20 s while the order is still running
  const running = !!order && !FINISHED.includes(order.status);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [running, load]);

  const confirmCancel = () =>
    Alert.alert("Cancel this order?", "The restaurant hasn't accepted it yet, so you can still cancel.", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            setOrder(await cancelMyOrder(String(id)));
          } catch (err) {
            Alert.alert("Couldn't cancel", getErrorMessage(err));
            load();
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);

  const goHome = () => router.replace("/");

  const header = (
    <View style={{ backgroundColor: colors.brand }}>
      <SafeAreaView edges={["top"]}>
        <View className="flex-row items-center px-4 pb-4 pt-2">
          <Pressable
            onPress={() => (placed ? goHome() : router.back())}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.brandDark }}>
            <Ionicons name={placed ? "home" : "chevron-back"} size={22} color={colors.white} />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-extrabold text-white">{order ? `Order #${order.orderNumber}` : "Order"}</Text>
            {!!order && (
              <Text className="text-sm" style={{ color: colors.brandSoft }}>
                {formatOrderDate(order.createdAt)}
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );

  if (loading || error || !order) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.mist }}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          {loading ? (
            <ActivityIndicator size="large" color={colors.brand} />
          ) : (
            <>
              <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
              <Text className="mt-3 text-center text-brand-dark">{error || "Order not found"}</Text>
              <Pressable onPress={load} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
                <Text className="font-bold text-white">Try again</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  const o = order;
  const typeInfo = ORDER_TYPE_INFO[o.type];
  const stopped = o.status === "rejected" || o.status === "cancelled";

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
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
        }>
        {/* Just placed */}
        {placed === "1" && o.status === "pending" && (
          <View className="mb-4 items-center rounded-3xl p-6" style={{ backgroundColor: colors.brand }}>
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}>
              <Ionicons name="checkmark" size={36} color={colors.brand} />
            </View>
            <Text className="mt-3 text-2xl font-extrabold text-white">Order placed!</Text>
            <Text className="mt-1 text-center text-sm" style={{ color: colors.brandSoft }}>
              {o.restaurantName} will confirm it soon. Keep this screen open to see updates.
            </Text>
          </View>
        )}

        {/* Status */}
        <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
          <View className="mb-3 flex-row items-center">
            <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name={typeInfo.icon} size={13} color={colors.brand} />
              <Text className="ml-1 text-xs font-bold text-brand">{typeInfo.label}</Text>
            </View>
            <Text className="ml-2 flex-1 text-sm font-semibold text-brand-dark" numberOfLines={1}>
              {o.restaurantName}
            </Text>
          </View>

          {stopped ? (
            <View className="flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: colors.text }}>
              <Ionicons name={ORDER_STATUS_INFO[o.status].icon} size={20} color={colors.white} />
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-white">
                  {o.status === "rejected" ? "The restaurant couldn't take this order" : "You cancelled this order"}
                </Text>
                {!!(o.rejectReason || o.cancelReason) && (
                  <Text className="text-xs" style={{ color: colors.mistDark }}>
                    {o.rejectReason || o.cancelReason}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Tracker order={o} />
          )}

          {o.status === "pending" && (
            <Pressable
              onPress={confirmCancel}
              disabled={cancelling}
              className="mt-1 flex-row items-center justify-center rounded-2xl border-2 py-3"
              style={{ borderColor: colors.danger, opacity: cancelling ? 0.6 : 1 }}>
              {cancelling ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                  <Text className="ml-1.5 font-bold" style={{ color: colors.danger }}>
                    Cancel order
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Delivery / dine-in details */}
        {o.delivery && (
          <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
            <View className="mb-2 flex-row items-center">
              <Ionicons name="location" size={18} color={colors.brand} />
              <Text className="ml-2 text-base font-bold text-brand-dark">Delivering to</Text>
            </View>
            <Text className="text-sm text-brand-dark">
              {[o.delivery.street, o.delivery.area, o.delivery.city].filter(Boolean).join(", ")}
            </Text>
            <Text className="mt-1 text-sm text-brand-light">{o.delivery.phone}</Text>
            {!!o.delivery.instructions && <Text className="mt-1 text-xs italic text-brand-light">{o.delivery.instructions}</Text>}
          </View>
        )}
        {o.dineIn && (
          <View className="mb-4 flex-row items-center rounded-3xl bg-white p-5" style={cardShadow}>
            <Ionicons name="people" size={18} color={colors.brand} />
            <Text className="ml-2 flex-1 text-base font-bold text-brand-dark">
              Table for {o.dineIn.partySize}
            </Text>
            <Text className="text-xs font-semibold" style={{ color: o.dineIn.seatsReserved ? colors.brand : colors.brandLight }}>
              {o.dineIn.seatsReserved ? "Seats held" : "Not held yet"}
            </Text>
          </View>
        )}

        {/* Items + bill */}
        <View className="rounded-3xl bg-white p-5" style={cardShadow}>
          <View className="mb-2 flex-row items-center">
            <Ionicons name="receipt" size={18} color={colors.brand} />
            <Text className="ml-2 text-base font-bold text-brand-dark">Your order</Text>
          </View>
          {o.items.map((item) => (
            <View key={item._id} className="border-b py-2" style={{ borderColor: colors.mist }}>
              <View className="flex-row justify-between">
                <Text className="flex-1 pr-3 text-sm font-semibold text-brand-dark">
                  {item.quantity} × {item.name}
                  {item.sizeName ? ` (${item.sizeName})` : ""}
                </Text>
                <Text className="text-sm text-brand-dark">{money(item.lineTotal)}</Text>
              </View>
              {item.addOns.length > 0 && (
                <Text className="text-xs text-brand-light">{item.addOns.map((a) => a.name).join(" · ")}</Text>
              )}
              {!!item.note && <Text className="text-xs italic text-brand-light">"{item.note}"</Text>}
            </View>
          ))}
          {!!o.note && <Text className="mt-2 text-xs italic text-brand-light">Note: {o.note}</Text>}

          <View className="mt-2">
            <View className="flex-row justify-between py-0.5">
              <Text className="text-sm text-brand-light">Subtotal</Text>
              <Text className="text-sm text-brand-dark">{money(o.subtotal)}</Text>
            </View>
            {o.tax > 0 && (
              <View className="flex-row justify-between py-0.5">
                <Text className="text-sm text-brand-light">Tax ({o.taxRate}%)</Text>
                <Text className="text-sm text-brand-dark">{money(o.tax)}</Text>
              </View>
            )}
            {o.type === "delivery" && (
              <View className="flex-row justify-between py-0.5">
                <Text className="text-sm text-brand-light">Delivery fee</Text>
                <Text className="text-sm text-brand-dark">{o.deliveryFee > 0 ? money(o.deliveryFee) : "Free"}</Text>
              </View>
            )}
            <View className="mt-1 flex-row justify-between">
              <Text className="text-lg font-extrabold text-brand-dark">Total</Text>
              <Text className="text-lg font-extrabold text-brand">{money(o.total)}</Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Ionicons name="cash" size={14} color={colors.brandLight} />
              <Text className="ml-1 text-xs text-brand-light">
                Cash · {o.paymentStatus === "paid" ? "Paid" : "Pay on " + (o.type === "delivery" ? "delivery" : "collection")}
              </Text>
            </View>
          </View>
        </View>

        {placed === "1" && (
          <Pressable onPress={goHome} className="mt-4 items-center py-3">
            <Ionicons name="chevron-back" size={20} />
            <Text className="font-bold text-brand">Back to restaurants</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}