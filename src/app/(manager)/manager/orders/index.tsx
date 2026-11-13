import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { listRestaurantOrders, updateOrderStatus } from "../../../../services/managerOrderApi";
import type { ManagerOrderListResponse, ManagerOrderTab, Order } from "../../../../types/order";
import { money } from "../../../../utils/menuFormat";
import { NEXT_ACTION, nextOrderStatus, ORDER_STATUS_INFO, ORDER_TYPE_INFO, timeAgo } from "../../../../utils/orderFormat";

const TABS: { key: ManagerOrderTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "active", label: "In progress" },
  { key: "past", label: "Past" },
];

const REJECT_REASONS = ["Too busy right now", "An item is not available", "Closing soon", "Outside delivery area"];

// ---------- Reject sheet ----------
function RejectSheet({
  order,
  onClose,
  onConfirm,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) setReason("");
  }, [order]);

  const submit = async () => {
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  const valid = reason.trim().length >= 3;

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />
          <Text className="text-xl font-extrabold text-brand-dark">Reject order</Text>
          <Text className="mb-4 text-sm text-brand-light">#{order?.orderNumber} · The customer will see this reason</Text>

          <View className="mb-3 flex-row flex-wrap gap-2">
            {REJECT_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  className="rounded-full px-3.5 py-2"
                  style={{ backgroundColor: selected ? colors.brand : colors.mistLight }}>
                  <Text className="text-sm font-semibold" style={{ color: selected ? colors.white : colors.brandDark }}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Or write a reason…"
            placeholderTextColor={colors.placeholder}
            maxLength={200}
            multiline
            className="mb-4 min-h-[70px] rounded-2xl px-4 py-3 text-base text-brand-dark"
            style={{ backgroundColor: colors.mistLight, textAlignVertical: "top" }}
          />

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 items-center rounded-2xl py-4" style={{ backgroundColor: colors.mistLight }}>
              <Text className="font-bold text-brand-dark">Keep</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!valid || saving}
              className="flex-1 flex-row items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: colors.danger, opacity: !valid || saving ? 0.5 : 1 }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">Reject</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- One order card ----------
function OrderCard({
  order,
  busy,
  onNext,
  onReject,
}: {
  order: Order;
  busy: boolean;
  onNext: () => void;
  onReject: () => void;
}) {
  const typeInfo = ORDER_TYPE_INFO[order.type];
  const statusInfo = ORDER_STATUS_INFO[order.status];
  const next = nextOrderStatus(order.type, order.status);
  const action = next ? NEXT_ACTION[next] : undefined;
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const stopped = order.status === "rejected" || order.status === "cancelled";
  const isNew = order.status === "pending";

  return (
    <View className="mb-3 rounded-3xl bg-white p-4" style={[cardShadow, isNew && { borderWidth: 2, borderColor: colors.brand }]}>
      {/* Top row: number + time + total */}
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text className="text-base font-extrabold text-brand-dark">#{order.orderNumber}</Text>
          <Text className="text-xs text-brand-light">{timeAgo(order.createdAt)}</Text>
        </View>
        <Text className="text-lg font-extrabold text-brand">{money(order.total)}</Text>
      </View>

      {/* Chips: type + status + paid */}
      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={typeInfo.icon} size={12} color={colors.brand} />
          <Text className="ml-1 text-xs font-bold text-brand">
            {typeInfo.label}
            {order.dineIn ? ` · ${order.dineIn.partySize} people` : ""}
          </Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: stopped ? "#fde8e6" : isNew ? colors.brand : colors.mistLight }}>
          <Ionicons name={statusInfo.icon} size={12} color={stopped ? colors.danger : isNew ? colors.white : colors.brandDark} />
          <Text className="ml-1 text-xs font-bold" style={{ color: stopped ? colors.danger : isNew ? colors.white : colors.brandDark }}>
            {isNew ? "New order" : statusInfo.label}
          </Text>
        </View>
        {order.paymentStatus === "paid" && (
          <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: colors.mistLight }}>
            <Ionicons name="checkmark-circle" size={12} color={colors.brand} />
            <Text className="ml-1 text-xs font-bold text-brand">Paid</Text>
          </View>
        )}
      </View>

      {/* Customer */}
      <View className="mt-3 flex-row items-center">
        <Ionicons name="person" size={13} color={colors.brandLight} />
        <Text className="ml-1.5 flex-1 text-sm font-semibold text-brand-dark" numberOfLines={1}>
          {order.customerName}
          {order.customerPhone || order.delivery?.phone ? ` · ${order.delivery?.phone ?? order.customerPhone}` : ""}
        </Text>
      </View>
      {order.delivery && (
        <View className="mt-1 flex-row items-center">
          <Ionicons name="location" size={13} color={colors.brandLight} />
          <Text className="ml-1.5 flex-1 text-sm text-brand-light" numberOfLines={1}>
            {[order.delivery.street, order.delivery.area, order.delivery.city].filter(Boolean).join(", ")}
          </Text>
        </View>
      )}

      {/* Items */}
      <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
        {order.items.slice(0, 3).map((item) => (
          <View key={item._id} className="flex-row py-0.5">
            <Text className="w-8 text-sm font-extrabold text-brand">{item.quantity}×</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-brand-dark" numberOfLines={1}>
                {item.name}
                {item.sizeName ? ` (${item.sizeName})` : ""}
              </Text>
              {item.addOns.length > 0 && (
                <Text className="text-xs text-brand-light" numberOfLines={1}>
                  + {item.addOns.map((a) => a.name).join(", ")}
                </Text>
              )}
              {!!item.note && (
                <Text className="text-xs italic text-brand-light" numberOfLines={1}>
                  “{item.note}”
                </Text>
              )}
            </View>
          </View>
        ))}
        {order.items.length > 3 && (
          <Text className="mt-1 text-xs font-bold text-brand-light">+ {order.items.length - 3} more item(s)</Text>
        )}
        <Text className="mt-1 text-xs text-brand-light">
          {itemCount} item{itemCount === 1 ? "" : "s"} · Cash
        </Text>
      </View>
      {!!order.note && (
        <View className="mt-2 flex-row items-start">
          <Ionicons name="chatbox-ellipses" size={13} color={colors.brand} style={{ marginTop: 2 }} />
          <Text className="ml-1.5 flex-1 text-xs text-brand-dark">{order.note}</Text>
        </View>
      )}
      {stopped && !!(order.rejectReason || order.cancelReason) && (
        <Text className="mt-2 text-xs italic" style={{ color: colors.danger }}>
          {order.status === "rejected" ? "Rejected: " : "Customer cancelled: "}
          {order.rejectReason || order.cancelReason}
        </Text>
      )}

      {/* Actions */}
      {(action || isNew) && (
        <View className="mt-4 flex-row gap-3">
          {isNew && (
            <Pressable
              onPress={onReject}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-2xl border-2 py-3"
              style={{ borderColor: colors.danger, opacity: busy ? 0.5 : 1 }}>
              <Ionicons name="close" size={16} color={colors.danger} />
              <Text className="ml-1 font-bold" style={{ color: colors.danger }}>
                Reject
              </Text>
            </Pressable>
          )}
          {action && next && (
            <Pressable
              onPress={onNext}
              disabled={busy}
              className={`${isNew ? "flex-[1.4]" : "flex-1"} flex-row items-center justify-center rounded-2xl py-3`}
              style={{ backgroundColor: colors.brand, opacity: busy ? 0.6 : 1 }}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name={action.icon} size={17} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">{action.label}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ---------- Screen ----------
export default function ManagerOrdersScreen() {
  const [tab, setTab] = useState<ManagerOrderTab>("new");
  const [data, setData] = useState<ManagerOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
    const [query, setQuery] = useState(""); // what's typed
  const [search, setSearch] = useState(""); // what we search (after a short pause)
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const searchRef = useRef(search);
  searchRef.current = search;

  // Wait 400 ms after typing stops before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (which: ManagerOrderTab) => {
    setError("");
    try {
                 const term = searchRef.current;
      const result = await listRestaurantOrders(which, 1, term);
      
      if (tabRef.current === which && searchRef.current === term) setData(result);
    } catch (err) {
      if (tabRef.current === which) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

    // Load when the tab or the search changes
  useEffect(() => {
    setLoading(true);
    setData(null);
    load(tab);
  }, [tab, search, load]);

  // While this screen is open: refresh every 15 s (new orders show up on their own)
  useFocusEffect(
    useCallback(() => {
      load(tabRef.current);
      const timer = setInterval(() => load(tabRef.current), 15000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
            const more = await listRestaurantOrders(tab, data.page + 1, search);
      setData((d) => (d ? { ...more, orders: [...d.orders, ...more.orders] } : more));
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  /** Move one order forward (or reject) and refresh the list */
  const changeStatus = async (order: Order, status: Order["status"], reason?: string) => {
    setBusyId(order._id);
    try {
      await updateOrderStatus(order._id, status, reason);
      await load(tab);
    } catch (err) {
      Alert.alert("Couldn't update the order", getErrorMessage(err));
      load(tab);
    } finally {
      setBusyId(null);
    }
  };

  const confirmNext = (order: Order) => {
    const next = nextOrderStatus(order.type, order.status);
    if (!next) return;
    if (next === "completed") {
      Alert.alert("Complete this order?", `Collect ${money(order.total)} in cash before completing.`, [
        { text: "Not yet", style: "cancel" },
        { text: "Cash collected", onPress: () => changeStatus(order, next) },
      ]);
      return;
    }
    changeStatus(order, next);
  };

  const counts = data?.counts;
  const seats = data?.seats;
  const seatsFree = seats ? Math.max(0, seats.capacity - seats.inUse) : 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "Orders" }} />

      {/* Tabs */}
      <View className="px-4 pt-4">
        <View className="flex-row rounded-2xl bg-white p-1" style={cardShadow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === "new" ? counts?.new : t.key === "active" ? counts?.active : undefined;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                style={{ backgroundColor: active ? colors.brand : "transparent" }}>
                <Text className="text-sm font-bold" style={{ color: active ? colors.white : colors.brandDark }}>
                  {t.label}
                </Text>
                {!!count && (
                  <View
                    className="ml-1.5 min-w-[20px] items-center rounded-full px-1.5"
                    style={{ backgroundColor: active ? colors.white : t.key === "new" ? colors.danger : colors.brand }}>
                    <Text className="text-xs font-extrabold" style={{ color: active ? colors.brand : colors.white }}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {/* Search */}
        <View className="mt-3 flex-row items-center rounded-2xl bg-white px-4" style={cardShadow}>
          <Ionicons name="search" size={18} color={colors.brandLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Order #, customer name or phone"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => setSearch(query.trim())}
            className="ml-2 flex-1 py-3 text-base text-brand-dark"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.brandLight} />
            </Pressable>
          )}
        </View>
        {/* Seats (only if the restaurant has dine-in seats) */}
               {!!seats && seats.capacity > 0 && !search && (
          <View className="mt-3 rounded-2xl bg-white px-4 py-3" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="people" size={15} color={colors.brand} />
                <Text className="ml-1.5 text-sm font-bold text-brand-dark">Seats</Text>
              </View>
              <Text className="text-sm text-brand-light">
                <Text className="font-extrabold text-brand">{seatsFree}</Text> free of {seats.capacity}
              </Text>
            </View>
            <View className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.mistLight }}>
              <View
                className="h-2 rounded-full"
                style={{
                  width: `${Math.min(100, (seats.inUse / seats.capacity) * 100)}%`,
                  backgroundColor: seatsFree === 0 ? colors.danger : colors.brand,
                }}
              />
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable onPress={() => load(tab)} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(o) => o._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              busy={busyId === item._id}
              onNext={() => confirmNext(item)}
              onReject={() => setRejecting(item)}
            />
          )}
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
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                               <Ionicons
                  name={search ? "search" : tab === "new" ? "notifications" : tab === "active" ? "flame" : "archive"}
                  size={34}
                  color={colors.brandLight}
                />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                {search
                  ? `No orders match "${search}"`
                  : tab === "new"
                    ? "No new orders"
                    : tab === "active"
                      ? "Nothing in progress"
                      : "No past orders yet"}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {search
                  ? "Try another tab, or check the spelling."
                  : tab === "new"
                    ? "New orders show up here on their own."
                    : "Pull down to refresh."}
              </Text>
            </View>
          }
        />
      )}

      <RejectSheet
        order={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          const order = rejecting;
          if (!order) return;
          setRejecting(null);
          await changeStatus(order, "rejected", reason);
        }}
      />
    </View>
  );
}