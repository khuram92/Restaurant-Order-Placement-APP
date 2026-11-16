import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { getOrderFilterRestaurants, listAllOrders, type AdminOrderFilters } from "../../../../services/adminOrderApi";
import type {
  AdminOrderListResponse,
  AdminOrderRange,
  AdminOrderRestaurant,
  AdminOrderTab,
  Order,
  OrderType,
} from "../../../../types/order";
import { money } from "../../../../utils/menuFormat";
import { ORDER_STATUS_INFO, ORDER_TYPE_INFO, timeAgo } from "../../../../utils/orderFormat";

const TABS: { key: AdminOrderTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "past", label: "Past" },
];

const RANGES: { key: AdminOrderRange; label: string }[] = [
  { key: "all", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const STOPPED = ["rejected", "cancelled"];
const ACTIVE = ["pending", "accepted", "preparing", "ready", "outForDelivery", "served"];

// ---------- Small filter chip ----------
function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-2 flex-row items-center rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: selected ? colors.brand : colors.white,
        borderColor: selected ? colors.brand : colors.mistDark,
      }}>
      {icon && <Ionicons name={icon} size={13} color={selected ? colors.white : colors.brand} />}
      <Text
        className={`text-xs font-bold ${icon ? "ml-1" : ""}`}
        style={{ color: selected ? colors.white : colors.brandDark }}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- One order ----------
function OrderCard({ order, logo }: { order: Order; logo?: string | undefined }) {
  const statusInfo = ORDER_STATUS_INFO[order.status];
  const typeInfo = ORDER_TYPE_INFO[order.type];
  const stopped = STOPPED.includes(order.status);
  const running = ACTIVE.includes(order.status);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  const pillBg = stopped ? "#fde8e6" : running ? colors.brand : colors.mistLight;
  const pillFg = stopped ? colors.danger : running ? colors.white : colors.brandDark;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/admin/orders/[id]", params: { id: order._id } })}
      className="mb-3 rounded-3xl bg-white p-4 active:opacity-80"
      style={cardShadow}>
      {/* Restaurant + status */}
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
          {logo ? (
            <Image source={{ uri: logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Text className="text-lg font-extrabold text-brand">{order.restaurantName[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-brand-dark" numberOfLines={1}>
            {order.restaurantName}
          </Text>
          <Text className="text-xs text-brand-light">
            #{order.orderNumber} · {timeAgo(order.createdAt)}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: pillBg }}>
          <Ionicons name={statusInfo.icon} size={12} color={pillFg} />
          <Text className="ml-1 text-xs font-bold" style={{ color: pillFg }}>
            {order.status === "pending" ? "New" : statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Customer + type + total */}
      <View className="mt-3 flex-row items-center rounded-2xl px-3 py-2.5" style={{ backgroundColor: colors.mistLight }}>
        <Ionicons name="person" size={13} color={colors.brandLight} />
        <Text className="ml-1.5 flex-1 text-sm font-semibold text-brand-dark" numberOfLines={1}>
          {order.customerName}
        </Text>
        <Ionicons name={typeInfo.icon} size={13} color={colors.brand} />
        <Text className="ml-1 text-xs font-bold text-brand-dark">
          {typeInfo.label} · {itemCount} item{itemCount === 1 ? "" : "s"}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center">
        <Text className="flex-1 text-xs text-brand-light">{order.paymentStatus === "paid" ? "Paid · cash" : "Cash · not paid yet"}</Text>
        <Text className="text-base font-extrabold text-brand-dark">{money(order.total)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.brandLight} style={{ marginLeft: 4 }} />
      </View>
    </Pressable>
  );
}

// ---------- Restaurant picker ----------
function RestaurantPicker({
  visible,
  restaurants,
  selectedId,
  onPick,
  onClose,
}: {
  visible: boolean;
  restaurants: AdminOrderRestaurant[];
  selectedId?: string | undefined;
  onPick: (id: string | undefined) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const shown = restaurants.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    if (visible) setSearch("");
  }, [visible]);

  const Row = ({ id, name, logo, inactive }: { id?: string; name: string; logo?: string | undefined; inactive?: boolean }) => {
    const selected = selectedId === id;
    return (
      <Pressable
        onPress={() => onPick(id)}
        className="flex-row items-center rounded-2xl px-3 py-2.5"
        style={{ backgroundColor: selected ? colors.brandSoft : "transparent" }}>
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.mistLight }}>
          {id === undefined ? (
            <Ionicons name="apps" size={16} color={colors.brand} />
          ) : logo ? (
            <Image source={{ uri: logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Text className="font-extrabold text-brand">{name[0]?.toUpperCase()}</Text>
          )}
        </View>
        <Text className="ml-3 flex-1 text-base font-semibold text-brand-dark" numberOfLines={1}>
          {name}
        </Text>
        {inactive && <Text className="mr-2 text-xs text-brand-light">Hidden</Text>}
        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
      <View className="max-h-[75%] rounded-t-[28px] bg-white px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="mb-3 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />
        <Text className="mb-3 px-1 text-lg font-extrabold text-brand-dark">Filter by restaurant</Text>
        <View className="mb-2 flex-row items-center rounded-2xl px-3" style={{ backgroundColor: colors.mistLight }}>
          <Ionicons name="search" size={16} color={colors.brandLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants"
            placeholderTextColor={colors.placeholder}
            className="ml-2 flex-1 py-2.5 text-base text-brand-dark"
          />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          {!search && <Row name="All restaurants" />}
          {shown.map((r) => (
            <Row key={r._id} id={r._id} name={r.name} logo={r.logo} inactive={r.isActive === false} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------- Screen ----------
export default function AdminOrdersScreen() {
  const params = useLocalSearchParams<{ tab?: AdminOrderTab }>();
  const [filters, setFilters] = useState<AdminOrderFilters>({
    tab: params.tab === "active" || params.tab === "past" ? params.tab : "all",
    range: "all",
  });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminOrderListResponse | null>(null);
  const [restaurants, setRestaurants] = useState<AdminOrderRestaurant[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Search: wait 400 ms after typing
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === query.trim() ? f : { ...f, q: query.trim() })), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Restaurant names + logos (for the picker and the card logos)
  useEffect(() => {
    getOrderFilterRestaurants()
      .then(setRestaurants)
      .catch(() => {});
  }, []);
  const logoOf = new Map(restaurants.map((r) => [r._id, r.logo]));

  const load = useCallback(async (f: AdminOrderFilters) => {
    setError("");
    try {
      const result = await listAllOrders(f, 1);
      if (filtersRef.current === f) setData(result); // ignore answers for old filters
    } catch (err) {
      if (filtersRef.current === f) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Any filter change → reload from page 1
  useEffect(() => {
    setLoading(true);
    load(filters);
  }, [filters, load]);

  // Coming back to this screen → refresh quietly
  useFocusEffect(
    useCallback(() => {
      load(filtersRef.current);
    }, [load]),
  );

  const loadMore = async () => {
    if (!data || loadingMore || loading || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
      const more = await listAllOrders(filters, data.page + 1);
      setData((d) => (d ? { ...more, orders: [...d.orders, ...more.orders] } : more));
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const set = (patch: Partial<AdminOrderFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const pickedRestaurant = restaurants.find((r) => r._id === filters.restaurantId);
  const hasFilters = !!filters.restaurantId || !!filters.type || filters.range !== "all" || !!filters.q;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "All orders" }} />

      {/* Search + tabs + filters */}
      <View className="px-4 pt-4">
        <View className="flex-row items-center rounded-2xl bg-white px-4" style={cardShadow}>
          <Ionicons name="search" size={18} color={colors.brandLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Order #, customer, phone or restaurant"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="ml-2 flex-1 py-3 text-base text-brand-dark"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.brandLight} />
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row rounded-2xl bg-white p-1" style={cardShadow}>
          {TABS.map((t) => {
            const active = filters.tab === t.key;
            const count = data?.counts[t.key];
            return (
              <Pressable
                key={t.key}
                onPress={() => set({ tab: t.key })}
                className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                style={{ backgroundColor: active ? colors.brand : "transparent" }}>
                <Text className="text-sm font-bold" style={{ color: active ? colors.white : colors.brandDark }}>
                  {t.label}
                </Text>
                {count !== undefined && (
                  <Text className="ml-1 text-xs font-bold" style={{ color: active ? colors.brandSoft : colors.brandLight }}>
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 16 }}>
          <Chip
            icon="storefront"
            label={pickedRestaurant ? pickedRestaurant.name : "All restaurants"}
            selected={!!filters.restaurantId}
            onPress={() => setPickerOpen(true)}
          />
          {(["dineIn", "takeaway", "delivery"] as OrderType[]).map((t) => (
            <Chip
              key={t}
              icon={ORDER_TYPE_INFO[t].icon}
              label={ORDER_TYPE_INFO[t].label}
              selected={filters.type === t}
              onPress={() => set({ type: filters.type === t ? undefined : t })}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerStyle={{ paddingRight: 16 }}>
          {RANGES.map((r) => (
            <Chip key={r.key} label={r.label} selected={filters.range === r.key} onPress={() => set({ range: r.key })} />
          ))}
          {hasFilters && (
            <Chip
              icon="close"
              label="Clear filters"
              selected={false}
              onPress={() => {
                setQuery("");
                setFilters({ tab: filters.tab, range: "all" });
              }}
            />
          )}
        </ScrollView>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable onPress={() => load(filters)} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(o) => o._id}
          renderItem={({ item }) => <OrderCard order={item} logo={logoOf.get(item.restaurantId)} />}
          style={{ opacity: loading ? 0.5 : 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(filters);
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          ListHeaderComponent={
            data && data.total > 0 ? (
              <Text className="mb-2 ml-1 text-xs font-semibold text-brand-light">
                {data.total} order{data.total === 1 ? "" : "s"}
              </Text>
            ) : undefined
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons name={hasFilters ? "search" : "receipt"} size={34} color={colors.brandLight} />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                {hasFilters ? "No orders match these filters" : "No orders yet"}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {hasFilters ? "Try another tab or clear the filters." : "Orders from every restaurant will show here."}
              </Text>
            </View>
          }
        />
      )}

      <RestaurantPicker
        visible={pickerOpen}
        restaurants={restaurants}
        selectedId={filters.restaurantId}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setPickerOpen(false);
          set({ restaurantId: id });
        }}
      />
    </View>
  );
}