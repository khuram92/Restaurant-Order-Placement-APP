import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuItemCard from "../../../components/customer/MenuItemCard";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import CartBar from "../../../components/customer/CartBar";
import { useCart } from "../../../context/CartContext";
import {
  getCustomerMenu,
  getCustomerRestaurant,
} from "../../../services/restaurantApi";
import type { MenuCategoryWithItems, MenuItem } from "../../../types/menu";
import type {
  CustomerRestaurant,
  Day,
  ServiceKey,
} from "../../../types/restaurant";
import ItemSheet from "@/components/customer/ItemSheet";
import { CartSelection } from "@/types/cart";
type IconName = ComponentProps<typeof Ionicons>["name"];

const DAY_LABELS: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// JavaScript's getDay(): 0 = Sunday
const todayKey = (): Day =>
  (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[
    new Date().getDay()
  ]!;

// "14:30" → "2:30 PM"
const formatTime = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

const SERVICES: { key: ServiceKey; label: string; icon: IconName }[] = [
  { key: "dineIn", label: "Dine-in", icon: "restaurant" },
  { key: "takeaway", label: "Takeaway", icon: "bag-handle" },
  { key: "delivery", label: "Delivery", icon: "bicycle" },
];

// ---------- Info bottom sheet: order info, location, hours ----------

/** "Closes in 2h 15m" / "Opens in 40m" based on today's hours (phone time) */
const timeLeftText = (r: CustomerRestaurant) => {
  const today = r.openingHours.find((h) => h.day === todayKey());
  if (!today || today.closed || r.isTemporarilyClosed) return "";
  const toMin = (t: string) => {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const open = toMin(today.open);
  let close = toMin(today.close);
  if (close <= open) close += 24 * 60; // closes after midnight

  const format = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  if (r.isOpenNow && close > nowMin)
    return `Closes in ${format(close - nowMin)}`;
  if (!r.isOpenNow && open > nowMin) return `Opens in ${format(open - nowMin)}`;
  return "";
};

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 items-center rounded-2xl py-3 border-2 border-brand-light bg-mist-light">
      {({ pressed }) => (
        <>
          <Ionicons
            name={icon}
            size={22}
            color={pressed ? colors.white : colors.brand}
          />
          <Text
            className="mt-1 text-xs font-bold"
            style={{ color: pressed ? colors.white : colors.brand }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-2 w-[48.5%] rounded-2xl p-3 bg-mist-light border-2 border-mist-dark">
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text className="mt-1.5 text-base font-extrabold text-brand-dark">
        {value}
      </Text>
      <Text className="text-xs text-brand-light">{label}</Text>
    </View>
  );
}

function InfoSheet({
  restaurant: r,
  visible,
  onClose,
}: {
  restaurant: CustomerRestaurant;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const coords = r.location?.coordinates; // [lng, lat]
  const address = [r.address.street, r.address.area, r.address.city]
    .filter(Boolean)
    .join(", ");
  const todayHours = r.openingHours.find((h) => h.day === today);
  const timeLeft = timeLeftText(r);
  const [showWeek, setShowWeek] = useState(false);

  // ---------- Drag the handle down to close ----------
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 1) {
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  // Reset position each time it opens
  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      setShowWeek(false);
    }
  }, [visible, dragY]);

  const openMap = () => {
    const query = coords
      ? `${coords[1]},${coords[0]}`
      : encodeURIComponent(`${r.name}, ${address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const share = () =>
    Share.share({
      message: `${r.name}\n${r.cuisines.join(" · ")}\n${address}${r.phone ? `\nCall: ${r.phone}` : ""}`,
    });

  const stats: { icon: IconName; label: string; value: string }[] = [];
  if (r.services.delivery) {
    stats.push({
      icon: "bicycle",
      label: "Delivery fee",
      value: r.deliveryFee > 0 ? money(r.deliveryFee) : "Free",
    });
    stats.push({
      icon: "navigate",
      label: "Delivers within",
      value: `${r.deliveryRadiusKm} km`,
    });
  }
  if (r.minOrder > 0)
    stats.push({
      icon: "cart",
      label: "Minimum order",
      value: money(r.minOrder),
    });
  if (r.taxRate > 0)
    stats.push({
      icon: "calculator",
      label: "Tax at checkout",
      value: `${r.taxRate}%`,
    });
  if (r.services.dineIn)
    stats.push({
      icon: "people",
      label: "Dine-in seats",
      value: String(r.seatingCapacity),
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(44,51,41,0.45)" }}
          onPress={onClose}
        />

        <Animated.View
          style={{
            maxHeight: "88%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: colors.white,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: dragY }],
          }}>
          {/* Drag area: handle + title */}
          <View {...panResponder.panHandlers}>
            <View className="items-center pt-3">
              <View
                className="h-1.5 w-12 rounded-full"
                style={{ backgroundColor: colors.mistDark }}
              />
            </View>
            <View className="flex-row items-center px-5 pb-2 pt-3">
              <View className="flex-1">
                <Text
                  className="text-xl font-extrabold text-brand-dark"
                  numberOfLines={1}>
                  {r.name}
                </Text>
                {r.cuisines.length > 0 && (
                  <Text className="text-sm text-brand" numberOfLines={1}>
                    {r.cuisines.join(" · ")}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-8 w-8 mb-6 ml-2 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="close" size={20} color={colors.brand} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}>
            <View
              className="mb-4 flex-row items-center rounded-2xl px-4 py-3"
              style={{
                backgroundColor: r.isOpenNow ? colors.brand : colors.text,
              }}>
              <Ionicons
                name={r.isOpenNow ? "time" : "moon"}
                size={20}
                color={colors.white}
              />
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-white">
                  {r.isOpenNow
                    ? "Open now"
                    : r.isTemporarilyClosed
                      ? "Closed for now"
                      : "Closed"}
                </Text>
                <Text className="text-xs" style={{ color: colors.brandSoft }}>
                  {timeLeft ||
                    (todayHours && !todayHours.closed
                      ? `Today ${formatTime(todayHours.open)} – ${formatTime(todayHours.close)}`
                      : "Closed today")}
                </Text>
              </View>
            </View>

            {/* Quick actions */}
            <View className="mb-5 flex-row gap-2">
              <QuickAction
                icon="call"
                label="Call"
                onPress={() => Linking.openURL(`tel:${r.phone}`)}
                disabled={!r.phone}
              />
              <QuickAction
                icon="navigate"
                label="Directions"
                onPress={openMap}
              />
              <QuickAction icon="share-social" label="Share" onPress={share} />
            </View>

            {!!r.description && (
              <Text
                className="mb-5 text-sm leading-5"
                style={{ color: colors.textMuted }}>
                {r.description}
              </Text>
            )}

            {/* Services */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-light">
              Order your way
            </Text>
            <View className="mb-5 flex-row gap-2">
              {SERVICES.map((s) => {
                const on = r.services[s.key];
                return (
                  <View
                    key={s.key}
                    className="flex-1 items-center rounded-2xl py-3 border-2 border-mist-dark"
                    style={{
                      backgroundColor: on ? colors.brandSoft : colors.mistLight,
                      opacity: on ? 1 : 0.45,
                    }}>
                    <Ionicons
                      name={on ? s.icon : "close-circle"}
                      size={20}
                      color={on ? colors.brand : colors.brandLight}
                    />
                    <Text
                      className="mt-1 text-xs font-bold"
                      style={{
                        color: on ? colors.brandDark : colors.brandLight,
                      }}>
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Order info tiles */}
            {stats.length > 0 && (
              <>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-light">
                  Good to know
                </Text>
                <View className="mb-3 flex-row flex-wrap justify-between">
                  {stats.map((st) => (
                    <StatTile key={st.label} {...st} />
                  ))}
                </View>
              </>
            )}

            {/* Opening hours: today first, tap to see the week */}
            <Pressable
              onPress={() => setShowWeek((v) => !v)}
              className="mb-2 flex-row items-center">
              <Text className="flex-1 text-sm font-bold uppercase tracking-wide text-brand-light">
                Opening hours
              </Text>
              <Text className="mr-1 text-sm font-bold text-brand">
                {showWeek ? "Show less" : "Whole week"}
              </Text>
              <Ionicons
                name={showWeek ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.brand}
              />
            </Pressable>
            {(showWeek
              ? r.openingHours
              : r.openingHours.filter((h) => h.day === today)
            ).map((h) => {
              const isToday = h.day === today;
              return (
                <View
                  key={h.day}
                  className="mb-1 flex-row items-center justify-between rounded-xl px-3 py-2.5 border-2 border-mist-dark"
                  style={{
                    backgroundColor: isToday ? colors.brandSoft : "transparent",
                  }}>
                  <Text
                    className={`text-sm text-brand-dark ${isToday ? "font-bold" : ""}`}>
                    {DAY_LABELS[h.day]}
                    {isToday ? "  · Today" : ""}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: h.closed ? colors.danger : colors.text }}>
                    {h.closed
                      ? "Closed"
                      : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                  </Text>
                </View>
              );
            })}
            <View className="h-3" />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------- Screen ----------
export default function CustomerRestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<CustomerRestaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const cart = useCart();
  // ---------- Sticky category tabs ----------
  const scrollRef = useRef<ScrollViewInstance>(null);
  const tabsRef = useRef<ScrollViewInstance>(null);
  const menuTop = useRef(0); // y of the menu block inside the page
  const barHeight = useRef(0); // height of the sticky tab bar
  const sectionY = useRef<Record<string, number>>({}); // y of each category inside the menu block
  const tabX = useRef<Record<string, number>>({}); // x of each tab chip
  const jumping = useRef(false); // true while scrolling after a tab tap
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, m] = await Promise.all([
        getCustomerRestaurant(String(id)),
        getCustomerMenu(String(id)),
      ]);
      setRestaurant(r);
      setMenu(m);
      setActiveId((prev) => prev ?? m[0]?._id ?? null);
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

  const highlightTab = (categoryId: string) => {
    setActiveId(categoryId);
    const x = tabX.current[categoryId];
    if (x !== undefined)
      tabsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  };

  /** Tap a tab: scroll the page to that category */
  const jumpTo = (categoryId: string) => {
    const y = sectionY.current[categoryId];
    if (y === undefined) return;
    highlightTab(categoryId);
    jumping.current = true;
    scrollRef.current?.scrollTo({
      y: Math.max(0, menuTop.current + y - barHeight.current - 8),
      animated: true,
    });
    setTimeout(() => (jumping.current = false), 500);
  };

  /** While scrolling: highlight the category at the top */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current || menu.length === 0) return;
    const y =
      e.nativeEvent.contentOffset.y + barHeight.current + 16 - menuTop.current;
    let current = menu[0]!._id;
    for (const c of menu) {
      const top = sectionY.current[c._id];
      if (top !== undefined && top <= y) current = c._id;
    }
    if (current !== activeId) highlightTab(current);
  };

    const openItem = (item: MenuItem) => setSelectedItem(item);

    const addToCart = (selection: CartSelection) => {
    if (!restaurant) return;
    setSelectedItem(null);

    // What the cart keeps about the restaurant (for totals on the cart screen)
    const cartRestaurant = {
      _id: restaurant._id,
      name: restaurant.name,
      ...(restaurant.logo && { logo: restaurant.logo }),
      taxRate: restaurant.taxRate,
      deliveryFee: restaurant.deliveryFee,
      minOrder: restaurant.minOrder,
      services: restaurant.services,
    };

    if (cart.add(cartRestaurant, selection) === "other-restaurant") {
      Alert.alert(
        "Start a new cart?",
        `Your cart has food from ${cart.restaurant?.name}. Adding this will empty it.`,
        [
          { text: "Keep cart", style: "cancel" },
          { text: "Start new cart", style: "destructive", onPress: () => cart.replaceWith(cartRestaurant, selection) },
        ],
      );
    }
  };
  const backButton = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      className="absolute left-2 h-10 w-10 items-center top-4 justify-center rounded-full bg-brand-light">
      <Ionicons name="chevron-back" size={22} color={colors.white} />
    </Pressable>
  );

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.mist }}>
        {backButton}
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">
          {error || "Restaurant not found"}
        </Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            load();
          }}
          className="mt-4 rounded-2xl px-6 py-3"
          style={{ backgroundColor: colors.brand }}>
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const r = restaurant;
  const todayHours = r.openingHours.find((h) => h.day === todayKey());
  const services = SERVICES.filter((s) => r.services[s.key]);

  const statusText = r.isOpenNow
    ? todayHours && !todayHours.closed
      ? `Open · closes ${formatTime(todayHours.close)}`
      : "Open now"
    : r.isTemporarilyClosed
      ? "Closed for now"
      : todayHours && !todayHours.closed
        ? `Closed · opens ${formatTime(todayHours.open)}`
        : "Closed today";

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        // Index 1 = the category bar: it sticks to the top while the menu scrolls
        stickyHeaderIndices={[1]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 96,
          flexGrow: 1,
        }}
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
        <View>
          <View className="h-48 w-full bg-brand-soft">
            {r.coverImage ? (
              <Image
                source={{ uri: r.coverImage }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons
                  name="restaurant"
                  size={52}
                  color={colors.brandLight}
                />
              </View>
            )}
          </View>

          <View
            className="-mt-10 mx-4 rounded-3xl bg-white p-4"
            style={cardShadow}>
            <View className="flex-row items-center">
              <View className="mr-3 h-14 w-14 items-center justify-center border-2 border-brand-light bg-brand-soft overflow-hidden rounded-2xl">
                {r.logo ? (
                  <Image
                    source={{ uri: r.logo }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-xl font-extrabold text-brand">
                    {r.name[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-extrabold text-brand-dark"
                  numberOfLines={1}>
                  {r.name}
                </Text>
                {r.cuisines.length > 0 && (
                  <Text className="text-sm text-brand" numberOfLines={1}>
                    {r.cuisines.join(" · ")}
                  </Text>
                )}
              </View>
            </View>

            {/* Status + services in one row */}
            <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
              <View
                className="flex-row items-center rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: r.isOpenNow ? colors.brand : colors.text,
                }}>
                <Ionicons
                  name={r.isOpenNow ? "time" : "moon"}
                  size={12}
                  color={colors.white}
                />
                <Text className="ml-1 text-sm font-bold text-white">
                  {statusText}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <View className="self-start mt-4 flex-row gap-2 ">
                {services.map((s) => (
                  <View
                    key={s.key}
                    className="flex-row items-center rounded-full px-2.5 py-1 bg-brand-soft">
                    <Ionicons name={s.icon} size={12} color={colors.brand} />
                    <Text className="ml-1 text-sm font-semibold text-brand">
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Info button → bottom sheet */}
              <Pressable
                onPress={() => setInfoOpen(true)}
                hitSlop={8}
                className="ml-2 items-center -top-6 rounded-2xl px-3 py-2 bg-brand-soft border-2 border-brand-light">
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.brand}
                />
                <Text className="text-[10px] font-bold text-brand">Info</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View
          className="mt-4 py-2 bg-mist"
          onLayout={(e: LayoutChangeEvent) =>
            (barHeight.current = e.nativeEvent.layout.height)
          }>
          {menu.length > 0 && (
            <ScrollView
              ref={tabsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {menu.map((c) => {
                const active = c._id === activeId;
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => jumpTo(c._id)}
                    onLayout={(e) =>
                      (tabX.current[c._id] = e.nativeEvent.layout.x)
                    }
                    className="rounded-full px-4 py-2"
                    style={{
                      backgroundColor: active ? colors.brand : colors.white,
                    }}>
                    <Text
                      className={`text-sm font-semibold ${
                        active ? "text-white" : "text-brand"
                      }`}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View
          className="flex-1 px-4 pt-2"
          onLayout={(e) => (menuTop.current = e.nativeEvent.layout.y)}>
          {!r.isOpenNow && menu.length > 0 && (
            <View
              className="mb-3 flex-row items-center rounded-2xl px-4 py-3"
              style={{ backgroundColor: colors.text }}>
              <Ionicons name="moon" size={16} color={colors.white} />
              <Text className="ml-2 flex-1 text-sm text-white">
                {r.isTemporarilyClosed
                  ? "The restaurant has closed for now. You can still look at the menu."
                  : "The restaurant is closed right now. You can still look at the menu."}
              </Text>
            </View>
          )}

          {menu.length === 0 ? (
            <View
              className="items-center rounded-3xl bg-white px-6 py-12"
              style={cardShadow}>
              <View
                className="h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="fast-food" size={30} color={colors.brand} />
              </View>
              <Text className="mt-3 text-base font-bold text-brand-dark">
                Menu coming soon
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                This restaurant hasn't added its menu yet. Tap Info for hours
                and location.
              </Text>
            </View>
          ) : (
            menu.map((category) => (
              <View
                key={category._id}
                className="mb-2"
                onLayout={(e) =>
                  (sectionY.current[category._id] = e.nativeEvent.layout.y)
                }>
                <View className="mb-2 mt-2 flex-row items-end">
                  <Text className="flex-1 text-lg font-extrabold text-brand-dark">
                    {category.name}
                  </Text>
                  <Text className="text-sm font-medium text-brand">
                    {category.items.length} item
                    {category.items.length === 1 ? "" : "s"}
                  </Text>
                </View>
                {!!category.description && (
                  <Text className="-mt-1 mb-2 text-sm font-medium text-brand">
                    {category.description}
                  </Text>
                )}
                <View className="flex-row flex-wrap justify-between">
                  {category.items.map((item) => (
                    <View key={item._id} className="w-[48.5%] ">
                      <MenuItemCard
                        item={item}
                        canOrder={r.isOpenNow}
                        onPress={() => openItem(item)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {backButton}
      <CartBar restaurantId={r._id} />
      <InfoSheet
        restaurant={r}
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
            <ItemSheet
        item={selectedItem}
        visible={!!selectedItem}
        canOrder={r.isOpenNow}
        onClose={() => setSelectedItem(null)}
        onAdd={addToCart}
      />
    </View>
  );
}
