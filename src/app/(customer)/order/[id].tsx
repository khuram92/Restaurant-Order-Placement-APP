import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import { cancelMyOrder, getMyOrder } from "../../../services/orderApi";
import type { Order, OrderStatus } from "../../../types/order";
import { money } from "../../../utils/menuFormat";
import {
  formatOrderDate,
  ORDER_STATUS_INFO,
  ORDER_TYPE_INFO,
  trackerSteps,
} from "../../../utils/orderFormat";

type IconName = ComponentProps<typeof Ionicons>["name"];

const FINISHED: OrderStatus[] = ["completed", "rejected", "cancelled"];

/** A friendly line under the big status, per status (and order type) */
const statusMessage = (o: Order): string => {
  switch (o.status) {
    case "pending":
      return `Waiting for ${o.restaurantName} to confirm your order`;
    case "accepted":
      return o.type === "dineIn"
        ? "Your table is held. The kitchen will start soon."
        : "Confirmed! The kitchen will start soon.";
    case "preparing":
      return "The kitchen is cooking your food";
    case "ready":
      return "Your order is ready. Come and pick it up!";
    case "outForDelivery":
      return "Your rider is on the way";
    case "served":
      return "Enjoy your meal!";
    case "completed":
      return "Thanks for ordering. See you again!";
    case "rejected":
      return o.rejectReason || "The restaurant couldn't take this order";
    case "cancelled":
      return o.cancelReason || "You cancelled this order";
  }
};

// ---------- Small pieces ----------
function Card({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: IconName;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={icon} size={22} color={colors.brand} />
        </View>
        <Text className="ml-2 flex-1 text-lg font-bold text-brand-dark">
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function BillRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-1">
      <Text
        className={
          bold
            ? "text-lg font-extrabold text-brand-dark"
            : "text-sm text-brand-light"
        }>
        {label}
      </Text>
      <Text
        className={
          bold
            ? "text-lg font-extrabold text-brand"
            : "text-sm font-semibold text-brand-dark"
        }>
        {value}
      </Text>
    </View>
  );
}

function StepBar({ order }: { order: Order }) {
  const steps = trackerSteps(order.type);
  const currentIndex =
    order.status === "completed"
      ? steps.length - 1
      : Math.max(0, steps.indexOf(order.status));

  return (
    <View className="mt-5 flex-row">
      {steps.map((step, i) => {
        const reached = i <= currentIndex;
        const current = i === currentIndex && order.status !== "completed";
        return (
          <View key={step} className="flex-1 items-center">
            {/* line + dot */}
            <View className="w-full flex-row items-center">
              <View
                className="h-1 flex-1"
                style={{
                  backgroundColor:
                    i === 0
                      ? "transparent"
                      : reached
                        ? colors.white
                        : "rgba(255,255,255,0.3)",
                }}
              />
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: current ? 30 : 22,
                  height: current ? 30 : 22,
                  backgroundColor: reached
                    ? colors.white
                    : "rgba(255,255,255,0.3)",
                }}>
                <Ionicons
                  name={
                    reached && !current
                      ? "checkmark"
                      : ORDER_STATUS_INFO[step].icon
                  }
                  size={current ? 16 : 12}
                  color={reached ? colors.brand : colors.white}
                />
              </View>
              <View
                className="h-1 flex-1"
                style={{
                  backgroundColor:
                    i === steps.length - 1
                      ? "transparent"
                      : i < currentIndex
                        ? colors.white
                        : "rgba(255,255,255,0.3)",
                }}
              />
            </View>
            <Text
              className={`mt-1.5 text-center text-[10px] ${current ? "font-extrabold" : "font-semibold"}`}
              style={{
                color: reached ? colors.white : "rgba(255,255,255,0.6)",
              }}
              numberOfLines={2}>
              {ORDER_STATUS_INFO[step].label.replace(
                "Waiting for the restaurant",
                "Placed",
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Full timeline: every step for this order type, with the time it happened */
function Timeline({ order }: { order: Order }) {
  const stopped = order.status === "rejected" || order.status === "cancelled";

  // When did a status happen? (last time it appears in the history)
  const timeOf = (status: OrderStatus) =>
    [...order.statusHistory].reverse().find((h) => h.status === status)?.at;

  // Steps to show: the normal flow, or (if stopped) what really happened + the stop
  const steps: OrderStatus[] = stopped
    ? [...new Set([...order.statusHistory.map((h) => h.status), order.status])]
    : trackerSteps(order.type);

  const currentIndex = Math.max(0, steps.indexOf(order.status));

  return (
    <View>
      {steps.map((step, i) => {
        const reached = i <= currentIndex;
        const current = i === currentIndex && order.status !== "completed";
        const isStop = step === "rejected" || step === "cancelled";
        const at =
          timeOf(step) ?? (step === order.status ? order.updatedAt : undefined);
        const dotColor = isStop
          ? colors.danger
          : reached
            ? colors.brand
            : colors.mistDark;

        return (
          <View key={step} className="flex-row">
            {/* dot + line */}
            <View className="mr-3 items-center" style={{ width: 24 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: current ? 24 : 20,
                  height: current ? 24 : 20,
                  backgroundColor: reached ? dotColor : colors.white,
                  borderWidth: reached ? 0 : 2,
                  borderColor: dotColor,
                }}>
                {reached && (
                  <Ionicons
                    name={
                      isStop
                        ? "close"
                        : current
                          ? ORDER_STATUS_INFO[step].icon
                          : "checkmark"
                    }
                    size={current ? 13 : 11}
                    color={colors.white}
                  />
                )}
              </View>
              {i < steps.length - 1 && (
                <View
                  className="w-0.5 flex-1"
                  style={{
                    minHeight: 20,
                    backgroundColor:
                      i < currentIndex ? colors.brand : colors.mistDark,
                  }}
                />
              )}
            </View>

            {/* label + time */}
            <View className="flex-1 flex-row items-start justify-between pb-4">
              <View className="flex-1 pr-2">
                <Text
                  className={`text-sm ${current ? "font-extrabold" : "font-semibold"}`}
                  style={{
                    color: isStop
                      ? colors.danger
                      : reached
                        ? colors.text
                        : colors.brandLight,
                  }}>
                  {step === "pending"
                    ? "Order placed"
                    : ORDER_STATUS_INFO[step].label}
                </Text>
                {current && !isStop && (
                  <Text className="text-xs font-bold text-brand">Now</Text>
                )}
              </View>
              <Text className="text-xs text-brand-light">
                {reached ? (at ? formatOrderDate(at) : "—") : "Upcoming"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{
    id: string;
    placed?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

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
    Alert.alert(
      "Cancel this order?",
      "The restaurant hasn't accepted it yet, so you can still cancel.",
      [
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
      ],
    );

  const goHome = () => router.replace("/");
  const goBack = () => (placed ? goHome() : router.back());

  // ---------- Loading / error ----------
  if (loading || error || !order) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.mist }}>
        <View style={{ backgroundColor: colors.brand }}>
          <SafeAreaView edges={["top"]}>
            <View className="flex-row items-center px-4 pb-4 pt-2">
              <Pressable
                onPress={goBack}
                hitSlop={8}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.brandDark }}>
                <Ionicons
                  name={placed ? "home" : "chevron-back"}
                  size={22}
                  color={colors.white}
                />
              </Pressable>
              <Text className="ml-3 text-xl font-extrabold text-white">
                Order
              </Text>
            </View>
          </SafeAreaView>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          {loading ? (
            <ActivityIndicator size="large" color={colors.brand} />
          ) : (
            <>
              <Ionicons
                name="alert-circle"
                size={44}
                color={colors.brandLight}
              />
              <Text className="mt-3 text-center text-brand-dark">
                {error || "Order not found"}
              </Text>
              <Pressable
                onPress={load}
                className="mt-4 rounded-2xl px-6 py-3"
                style={{ backgroundColor: colors.brand }}>
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
  const done = o.status === "completed";
  const statusInfo = ORDER_STATUS_INFO[o.status];
  const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
  const heroColor = stopped ? colors.text : colors.brand;
  const lastUpdateAt =
    [...o.statusHistory].reverse().find((h) => h.status === o.status)?.at ??
    o.updatedAt;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + (o.status === "pending" || placed ? 110 : 24),
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.white}
            colors={[colors.brand]}
          />
        }>
        <View
          className="rounded-b-[22px] px-5 pb-7 "
          style={{ backgroundColor: heroColor }}>
          <SafeAreaView edges={["top"]}>
            {/* Top row */}
            <View className="flex-row items-center pt-2">
              <Pressable
                onPress={goBack}
                hitSlop={8}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                <Ionicons
                  name={placed ? "home" : "chevron-back"}
                  size={22}
                  color={colors.white}
                />
              </Pressable>
              <View className="ml-3 flex-1">
                <Text
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.75)" }}>
                  Order
                </Text>
                <Text className="text-xl font-extrabold text-white">
                  #{o.orderNumber}
                </Text>
              </View>
              {running && (
                <View
                  className="flex-row items-center rounded-full px-2.5 py-1"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors.white }}
                  />
                  <Text className="ml-1.5 text-xs font-bold text-white">
                    Live
                  </Text>
                </View>
              )}
            </View>

            
            <View className="mt-6 items-center">
              <View
                className="h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.white }}>
                <Ionicons
                  name={
                    placed === "1" && o.status === "pending"
                      ? "checkmark"
                      : statusInfo.icon
                  }
                  size={40}
                  color={heroColor}
                />
              </View>
              <Text className="mt-3 text-center text-2xl font-extrabold text-white">
                {placed === "1" && o.status === "pending"
                  ? "Order placed!"
                  : statusInfo.label}
              </Text>
              <Text
                className="mt-1 px-4 text-center text-sm"
                style={{ color: "rgba(255,255,255,0.85)" }}>
                {statusMessage(o)}
              </Text>
            </View>

            
            {!stopped && <StepBar order={o} />}
          </SafeAreaView>
        </View>

        <View className="-mt-4 px-4">
         
          <View
            className="mb-4 flex-row rounded-3xl bg-white p-4"
            style={cardShadow}>
            <View className="flex-1 items-center">
              <Ionicons name={typeInfo.icon} size={20} color={colors.brand} />
              <Text className="mt-1 text-xs text-brand-light">Type</Text>
              <Text className="text-sm font-bold text-brand-dark">
                {typeInfo.label}
              </Text>
            </View>
            <View className="w-px" style={{ backgroundColor: colors.mist }} />
            <View className="flex-1 items-center">
              <Ionicons name="fast-food" size={20} color={colors.brand} />
              <Text className="mt-1 text-xs text-brand-light">Items</Text>
              <Text className="text-sm font-bold text-brand-dark">
                {itemCount}
              </Text>
            </View>
            <View className="w-px" style={{ backgroundColor: colors.mist }} />
            <View className="flex-1 items-center">
              <Ionicons name="cash" size={20} color={colors.brand} />
              <Text className="mt-1 text-xs text-brand-light">Total</Text>
              <Text className="text-sm font-bold text-brand-dark">
                {money(o.total)}
              </Text>
            </View>
          </View>

         
          <View
            className="mb-4 flex-row items-center rounded-3xl bg-white p-4"
            style={cardShadow}>
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.brandSoft }}>
              <Text className="text-xl font-extrabold text-brand">
                {o.restaurantName[0]?.toUpperCase()}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text
                className="text-base font-bold text-brand-dark"
                numberOfLines={1}>
                {o.restaurantName}
              </Text>
              <Text className="text-xs text-brand-light">
                Ordered {formatOrderDate(o.createdAt)}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/restaurant/[id]",
                  params: { id: o.restaurantId },
                })
              }
              hitSlop={8}
              className="flex-row items-center rounded-full px-3 py-2"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="storefront" size={14} color={colors.brand} />
              <Text className="ml-1 text-xs font-bold text-brand">Menu</Text>
            </Pressable>
          </View>

          
          {o.delivery && (
            <Card title="Delivering to" icon="location">
              <Text className="text-sm leading-5 text-brand-dark">
                {[o.delivery.street, o.delivery.area, o.delivery.city]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              <View className="mt-2 flex-row items-center">
                <Ionicons name="call" size={13} color={colors.brandLight} />
                <Text className="ml-1.5 text-sm text-brand-light">
                  {o.delivery.phone}
                </Text>
              </View>
              {!!o.delivery.instructions && (
                <View className="mt-1 flex-row items-center">
                  <Ionicons
                    name="navigate"
                    size={13}
                    color={colors.brandLight}
                  />
                  <Text className="ml-1.5 flex-1 text-sm italic text-brand-light">
                    {o.delivery.instructions}
                  </Text>
                </View>
              )}
            </Card>
          )}
          {o.dineIn && (
            <View
              className="mb-4 flex-row items-center rounded-3xl bg-white p-4"
              style={cardShadow}>
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="people" size={22} color={colors.brand} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-brand-dark">
                  Seates for {o.dineIn.partySize}, Person
                </Text>
                <Text className="text-sm text-brand-light">
                  {o.dineIn.seatsReserved
                    ? "Your seats are held"
                    : stopped || done
                      ? "Seats released"
                      : "Seats are held once accepted"}
                </Text>
              </View>
              <View
                className="rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: o.dineIn.seatsReserved
                    ? colors.brand
                    : colors.mistLight,
                }}>
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: o.dineIn.seatsReserved
                      ? colors.white
                      : colors.brandLight,
                  }}>
                  {o.dineIn.seatsReserved ? "Held" : "Not held"}
                </Text>
              </View>
            </View>
          )}

         
          <Card
            title={`Your order · ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            icon="receipt">
            {o.items.map((item, i) => (
              <View
                key={item._id}
                className={`flex-row py-3 ${i < o.items.length - 1 ? "border-b" : ""}`}
                style={{ borderColor: colors.mist }}>
                <View
                  className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-xl"
                  style={{ backgroundColor: colors.brandSoft }}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons
                      name="fast-food"
                      size={20}
                      color={colors.brandLight}
                    />
                  )}
                  <View
                    className="absolute bottom-0 right-0 rounded-tl-lg px-1.5"
                    style={{ backgroundColor: colors.brand }}>
                    <Text className="text-[10px] font-extrabold text-white">
                      ×{item.quantity}
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between">
                    <Text
                      className="flex-1 pr-2 text-sm font-bold text-brand-dark"
                      numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text className="text-sm font-bold text-brand-dark">
                      {money(item.lineTotal)}
                    </Text>
                  </View>
                  {(!!item.sizeName || item.addOns.length > 0) && (
                    <Text
                      className="mt-0.5 text-xs text-brand-light"
                      numberOfLines={3}>
                      {[item.sizeName, ...item.addOns.map((a) => a.name)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  )}
                  {!!item.note && (
                    <View className="mt-1 flex-row items-center">
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={11}
                        color={colors.brandLight}
                      />
                      <Text className="ml-1 flex-1 text-xs italic text-brand-light">
                        {item.note}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            {!!o.note && (
              <View
                className="mt-2 flex-row items-start rounded-2xl p-3"
                style={{ backgroundColor: colors.mistLight }}>
                <Ionicons
                  name="chatbox-ellipses"
                  size={14}
                  color={colors.brand}
                  style={{ marginTop: 2 }}
                />
                <Text className="ml-2 flex-1 text-xs text-brand-dark">
                  {o.note}
                </Text>
              </View>
            )}
          </Card>

          <Card title="Bill" icon="wallet">
            <BillRow label="Subtotal" value={money(o.subtotal)} />
            {o.tax > 0 && (
              <BillRow label={`Tax (${o.taxRate}%)`} value={money(o.tax)} />
            )}
            {o.type === "delivery" && (
              <BillRow
                label="Delivery fee"
                value={o.deliveryFee > 0 ? money(o.deliveryFee) : "Free"}
              />
            )}
            <View
              className="my-2 border-t border-dashed"
              style={{ borderColor: colors.mistDark }}
            />
            <BillRow label="Total" value={money(o.total)} bold />
            <View
              className="mt-3 flex-row items-center rounded-2xl px-3 py-2.5"
              style={{
                backgroundColor:
                  o.paymentStatus === "paid" ? colors.brandSoft : colors.mist,
              }}>
              <Ionicons
                name={o.paymentStatus === "paid" ? "checkmark-circle" : "cash"}
                size={20}
                color={colors.brand}
              />
              <Text className="ml-2 flex-1 text-sm font-semibold text-brand-dark">
                {o.paymentStatus === "paid"
                  ? "Paid in cash"
                  : `Cash · pay ${o.type === "delivery" ? "the rider on delivery" : "at the restaurant"}`}
              </Text>
            </View>
          </Card>

          <Card
            title="Order timeline"
            icon="time"
            right={
              <Pressable
                onPress={() => setShowTimeline((v) => !v)}
                hitSlop={8}
                className="flex-row items-center">
                <Text className="mr-1 text-sm font-bold text-brand">
                  {showTimeline ? "Hide" : "Show"}
                </Text>
                <Ionicons
                  name={showTimeline ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.brand}
                />
              </Pressable>
            }>
            {showTimeline ? (
              <Timeline order={o} />
            ) : (
              <Text className="text-sm text-brand">
                Last update: {ORDER_STATUS_INFO[o.status].label} ·{" "}
                {formatOrderDate(lastUpdateAt)}
              </Text>
            )}
          </Card>
        </View>
      </ScrollView>

      {(o.status === "pending" || placed === "1") && (
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-4 pt-3"
          style={{
            backgroundColor: colors.mist,
            paddingBottom: insets.bottom + 12,
          }}>
          {o.status === "pending" && (
            <Pressable
              onPress={confirmCancel}
              disabled={cancelling}
              className="flex-1 flex-row items-center justify-center rounded-2xl border-2 bg-mist-light py-4"
              style={{
                borderColor: colors.danger,
                opacity: cancelling ? 0.6 : 1,
              }}>
              {cancelling ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.danger}
                  />
                  <Text
                    className="ml-1.5 font-bold"
                    style={{ color: colors.danger }}>
                    Cancel order
                  </Text>
                </>
              )}
            </Pressable>
          )}
          {placed === "1" && (
            <Pressable
              onPress={goHome}
              className="flex-1 flex-row items-center justify-center rounded-2xl py-4"
              style={[cardShadow, { backgroundColor: colors.brand }]}>
              <Ionicons name="home" size={18} color={colors.white} />
              <Text className="ml-1.5 font-bold text-white">Back to home</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
