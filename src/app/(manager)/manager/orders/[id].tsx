import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RejectSheet from "../../../../components/manager/RejectSheet";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { getRestaurantOrder, updateOrderStatus } from "../../../../services/managerOrderApi";
import type { Order, OrderStatus } from "../../../../types/order";
import { money } from "../../../../utils/menuFormat";
import {
  formatOrderDate,
  NEXT_ACTION,
  nextOrderStatus,
  ORDER_STATUS_INFO,
  ORDER_TYPE_INFO,
  timeAgo,
} from "../../../../utils/orderFormat";

type IconName = ComponentProps<typeof Ionicons>["name"];

const FINISHED: OrderStatus[] = ["completed", "rejected", "cancelled"];

// ---------- Small pieces ----------
function Card({ title, icon, right, children }: { title: string; icon: IconName; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={icon} size={20} color={colors.brand} />
        </View>
        <Text className="ml-2 flex-1 text-base font-bold text-brand-dark">{title} :</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function ActionChip({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center rounded-full px-3.5 py-2" style={{ backgroundColor: colors.brand }}>
      <Ionicons name={icon} size={14} color={colors.white} />
      <Text className="ml-1.5 text-sm font-bold text-white">{label}</Text>
    </Pressable>
  );
}

function BillRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={bold ? "text-lg font-extrabold text-brand-dark" : "text-sm text-brand-light"}>{label}</Text>
      <Text className={bold ? "text-lg font-extrabold text-brand" : "text-sm font-semibold text-brand-dark"}>{value}</Text>
    </View>
  );
}

// ---------- Screen ----------
export default function ManagerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setOrder(await getRestaurantOrder(String(id)));
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

  // Refresh every 15 s while the order is still running (e.g. the customer cancels)
  const running = !!order && !FINISHED.includes(order.status);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [running, load]);

  const changeStatus = async (status: OrderStatus, reason?: string) => {
    if (!order) return;
    setBusy(true);
    try {
      setOrder(await updateOrderStatus(order._id, status, reason));
    } catch (err) {
      Alert.alert("Couldn't update the order", getErrorMessage(err));
      load();
    } finally {
      setBusy(false);
    }
  };

  const confirmNext = () => {
    if (!order) return;
    const next = nextOrderStatus(order.type, order.status);
    if (!next) return;
    if (next === "completed") {
      Alert.alert("Complete this order?", `Collect ${money(order.total)} in cash before completing.`, [
        { text: "Not yet", style: "cancel" },
        { text: "Cash collected", onPress: () => changeStatus(next) },
      ]);
      return;
    }
    changeStatus(next);
  };

  const call = (phone: string) =>
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Can't make a call", `Call ${phone} from your phone.`));

  const openMaps = (address: string) =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() =>
      Alert.alert("Can't open maps", address),
    );

  if (loading || error || !order) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
        <Stack.Screen options={{ title: "Order" }} />
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
    );
  }

  const o = order;
  const typeInfo = ORDER_TYPE_INFO[o.type];
  const statusInfo = ORDER_STATUS_INFO[o.status];
  const stopped = o.status === "rejected" || o.status === "cancelled";
  const isNew = o.status === "pending";
  const next = nextOrderStatus(o.type, o.status);
  const action = next ? NEXT_ACTION[next] : undefined;
  const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
  const phone = o.delivery?.phone ?? o.customerPhone;
  const address = o.delivery ? [o.delivery.street, o.delivery.area, o.delivery.city].filter(Boolean).join(", ") : "";
  const showBar = isNew || !!action;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: `#${o.orderNumber}` }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (showBar ? 110 : 24) }}
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
        <View
          className="mb-4 flex-row items-center rounded-3xl p-5"
          style={[cardShadow, { backgroundColor: stopped ? colors.text : colors.brand }]}>
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.white }}>
            <Ionicons name={statusInfo.icon} size={28} color={stopped ? colors.text : colors.brand} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-xl font-extrabold text-white">{isNew ? "New order" : statusInfo.label}</Text>
            <Text className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              Placed {timeAgo(o.createdAt)} · {formatOrderDate(o.createdAt)}
            </Text>
          </View>
        </View>

        {stopped && !!(o.rejectReason || o.cancelReason) && (
          <View className="mb-4 flex-row items-start rounded-2xl p-4" style={{ backgroundColor: "#fde8e6" }}>
            <Ionicons name="information-circle" size={18} color={colors.danger} />
            <Text className="ml-2 flex-1 text-sm" style={{ color: colors.danger }}>
              {o.status === "rejected" ? "You rejected it: " : "The customer cancelled: "}
              {o.rejectReason || o.cancelReason}
            </Text>
          </View>
        )}

        {/* ---------- Summary chips ---------- */}
        <View className="mb-4 flex-row rounded-3xl bg-white p-4" style={cardShadow}>
          <View className="flex-1 items-center">
            <Ionicons name={typeInfo.icon} size={20} color={colors.brand} />
            <Text className="mt-1 text-xs text-brand-light">Type</Text>
            <Text className="text-sm font-bold text-brand-dark">{typeInfo.label}</Text>
          </View>
          <View className="w-px" style={{ backgroundColor: colors.mist }} />
          <View className="flex-1 items-center">
            <Ionicons name="fast-food" size={20} color={colors.brand} />
            <Text className="mt-1 text-xs text-brand-light">Items</Text>
            <Text className="text-sm font-bold text-brand-dark">{itemCount}</Text>
          </View>
          <View className="w-px" style={{ backgroundColor: colors.mist }} />
          <View className="flex-1 items-center">
            <Ionicons name={o.paymentStatus === "paid" ? "checkmark-circle" : "cash"} size={20} color={colors.brand} />
            <Text className="mt-1 text-xs text-brand-light">{o.paymentStatus === "paid" ? "Paid" : "To collect"}</Text>
            <Text className="text-sm font-bold text-brand-dark">{money(o.total)}</Text>
          </View>
        </View>

        {/* ---------- Customer ---------- */}
        <Card title="Customer" icon="person" >
            
          <Text className="text-base font-bold text-brand-dark">{o.customerName}</Text>
          {!!phone && <Text className="mt-0.5 text-sm text-brand-light">{phone}</Text>}
          {!!phone && (
            <View className="mt-3 flex-row">
              <ActionChip icon="call" label="Call customer" onPress={() => call(phone)} />
            </View>
          )}
        </Card>

        {/* ---------- Delivery / dine-in ---------- */}
        {o.delivery && (
          <Card title="Deliver to" icon="location">
            <Text className="text-sm leading-5 text-brand-dark">{address}</Text>
            {!!o.delivery.instructions && (
              <View className="mt-2 flex-row items-start rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
                <Ionicons name="navigate" size={14} color={colors.brand} style={{ marginTop: 2 }} />
                <Text className="ml-2 flex-1 text-sm italic text-brand-dark">{o.delivery.instructions}</Text>
              </View>
            )}
            <View className="mt-3 flex-row">
              <ActionChip icon="map" label="Open in Maps" onPress={() => openMaps(address)} />
            </View>
          </Card>
        )}
        {o.dineIn && (
          <View className="mb-4 flex-row items-center rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="people" size={22} color={colors.brand} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-brand-dark">Table for {o.dineIn.partySize}</Text>
              <Text className="text-xs text-brand-light">
                {o.dineIn.seatsReserved
                  ? "Seats are held for this order"
                  : isNew
                    ? "Seats are held when you accept"
                    : "Seats released"}
              </Text>
            </View>
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: o.dineIn.seatsReserved ? colors.brand : colors.mistLight }}>
              <Text className="text-xs font-bold" style={{ color: o.dineIn.seatsReserved ? colors.white : colors.brandLight }}>
                {o.dineIn.seatsReserved ? "Held" : "Not held"}
              </Text>
            </View>
          </View>
        )}

        {/* ---------- Items ---------- */}
        <Card title={`Items · ${itemCount}`} icon="receipt">
          {o.items.map((item, i) => (
            <View key={item._id} className={`flex-row py-3 ${i < o.items.length - 1 ? "border-b" : ""}`} style={{ borderColor: colors.mist }}>
              <View className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <Ionicons name="fast-food" size={20} color={colors.brandLight} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row">
                  <Text className="mr-1.5 text-base font-extrabold text-brand">{item.quantity}×</Text>
                  <Text className="flex-1 pr-2 text-base font-bold text-brand-dark">{item.name}</Text>
                  <Text className="text-sm font-bold text-brand-dark">{money(item.lineTotal)}</Text>
                </View>
                {!!item.sizeName && <Text className="mt-0.5 text-sm text-brand-dark">Size: {item.sizeName}</Text>}
                {item.addOns.map((a) => (
                  <Text key={a.optionId} className="text-sm text-brand-light">
                    + {a.name}
                    {a.price > 0 ? ` (${money(a.price)})` : ""}
                  </Text>
                ))}
                {!!item.note && (
                  <View className="mt-1.5 flex-row items-start rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors.mistLight }}>
                    <Ionicons name="chatbubble-ellipses" size={12} color={colors.brand} style={{ marginTop: 3 }} />
                    <Text className="ml-1.5 flex-1 text-sm italic text-brand-dark">{item.note}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-brand-light">{money(item.unitPrice)} each</Text>
              </View>
            </View>
          ))}
          {!!o.note && (
            <View className="mt-2 flex-row items-start rounded-2xl p-3" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="chatbox-ellipses" size={15} color={colors.brand} style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-xs font-bold text-brand">Order note</Text>
                <Text className="text-sm text-brand-dark">{o.note}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* ---------- Bill ---------- */}
        <Card title="Bill" icon="wallet">
          <BillRow label="Subtotal" value={money(o.subtotal)} />
          {o.tax > 0 && <BillRow label={`Tax (${o.taxRate}%)`} value={money(o.tax)} />}
          {o.type === "delivery" && <BillRow label="Delivery fee" value={o.deliveryFee > 0 ? money(o.deliveryFee) : "Free"} />}
          <View className="my-2 border-t border-dashed" style={{ borderColor: colors.mistDark }} />
          <BillRow label="Total" value={money(o.total)} bold />
          <View
            className="mt-3 flex-row items-center rounded-2xl px-3 py-2.5"
            style={{ backgroundColor: o.paymentStatus === "paid" ? colors.brandSoft : colors.mistLight }}>
            <Ionicons name={o.paymentStatus === "paid" ? "checkmark-circle" : "cash"} size={18} color={colors.brand} />
            <Text className="ml-2 flex-1 text-sm font-semibold text-brand-dark">
              {o.paymentStatus === "paid" ? "Cash collected" : `Collect ${money(o.total)} in cash`}
            </Text>
          </View>
        </Card>

        {/* ---------- Timeline ---------- */}
        <Card title="Timeline" icon="time">
          {o.statusHistory.map((h, i) => {
            const last = i === o.statusHistory.length - 1;
            const isStop = h.status === "rejected" || h.status === "cancelled";
            return (
              <View key={`${h.status}-${i}`} className="flex-row">
                <View className="mr-3 items-center" style={{ width: 20 }}>
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: isStop ? colors.danger : colors.brand }}>
                    <Ionicons name={isStop ? "close" : last ? ORDER_STATUS_INFO[h.status].icon : "checkmark"} size={11} color={colors.white} />
                  </View>
                  {!last && <View className="w-0.5 flex-1" style={{ minHeight: 18, backgroundColor: colors.brandSoft }} />}
                </View>
                <View className="flex-1 flex-row justify-between pb-4">
                  <Text className={`text-sm ${last ? "font-extrabold" : "font-semibold"}`} style={{ color: isStop ? colors.danger : colors.text }}>
                    {h.status === "pending" ? "Order placed" : ORDER_STATUS_INFO[h.status].label}
                  </Text>
                  <Text className="text-xs text-brand-light">{formatOrderDate(h.at)}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      {/* ---------- Bottom actions ---------- */}
      {showBar && (
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-4 pt-3"
          style={{ backgroundColor: colors.mist, paddingBottom: insets.bottom + 12 }}>
          {isNew && (
            <Pressable
              onPress={() => setRejecting(true)}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-2xl border-2 bg-white py-4"
              style={{ borderColor: colors.danger, opacity: busy ? 0.5 : 1 }}>
              <Ionicons name="close" size={18} color={colors.danger} />
              <Text className="ml-1 font-bold" style={{ color: colors.danger }}>
                Reject
              </Text>
            </Pressable>
          )}
          {action && (
            <Pressable
              onPress={confirmNext}
              disabled={busy}
              className={`${isNew ? "flex-[1.4]" : "flex-1"} flex-row items-center justify-center rounded-2xl py-4`}
              style={[cardShadow, { backgroundColor: colors.brand, opacity: busy ? 0.6 : 1 }]}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name={action.icon} size={18} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">{action.label}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      <RejectSheet
        order={rejecting ? o : null}
        onClose={() => setRejecting(false)}
        onConfirm={async (reason) => {
          setRejecting(false);
          await changeStatus("rejected", reason);
        }}
      />
    </View>
  );
}