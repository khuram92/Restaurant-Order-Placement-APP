import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import MenuItemCard from "../../../components/customer/MenuItemCard";
import { getCustomerMenu, getCustomerRestaurant } from "../../../services/restaurantApi";
import type { MenuCategoryWithItems, MenuItem } from "../../../types/menu";
import type { CustomerRestaurant, Day, ServiceKey } from "../../../types/restaurant";

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
const todayKey = (): Day => (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[new Date().getDay()]!;

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

// ---------- Small UI pieces ----------
function SheetSection({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center">
        <View
          className="mr-2 h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={icon} size={16} color={colors.brand} />
        </View>
        <Text className="text-base font-bold text-brand-dark">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  text,
  action,
  onPress,
}: {
  icon: IconName;
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center py-2">
      <Ionicons name={icon} size={16} color={colors.brandLight} />
      <Text className="ml-3 flex-1 text-sm" style={{ color: colors.text }}>
        {text}
      </Text>
      {!!action && <Text className="text-sm font-bold text-brand">{action}</Text>}
    </Pressable>
  );
}

// ---------- Info bottom sheet: order info, location, hours ----------
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
  const address = [r.address.street, r.address.area, r.address.city].filter(Boolean).join(", ");
  const hasOrderInfo = r.services.delivery || r.minOrder > 0 || r.taxRate > 0 || r.services.dineIn;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* Dim background: tap to close */}
        <Pressable className="absolute inset-0" style={{ backgroundColor: "rgba(44,51,41,0.45)" }} onPress={onClose} />

        <View
          className="max-h-[85%] rounded-t-3xl"
          style={{ backgroundColor: colors.white, paddingBottom: insets.bottom + 12 }}>
          {/* Handle + title */}
          <View className="items-center pt-3">
            <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: colors.mistDark }} />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
            <Text className="flex-1 text-xl font-extrabold text-brand-dark" numberOfLines={1}>
              {r.name}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="close" size={20} color={colors.brand} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            {!!r.description && (
              <Text className="mb-5 text-sm leading-5" style={{ color: colors.textMuted }}>
                {r.description}
              </Text>
            )}

            {hasOrderInfo && (
              <SheetSection title="Order info" icon="receipt">
                {r.services.delivery && (
                  <>
                    <InfoRow
                      icon="bicycle"
                      text={r.deliveryFee > 0 ? `Delivery fee ${money(r.deliveryFee)}` : "Free delivery"}
                    />
                    <InfoRow icon="navigate" text={`Delivers within ${r.deliveryRadiusKm} km`} />
                  </>
                )}
                {r.minOrder > 0 && <InfoRow icon="cart" text={`Minimum order ${money(r.minOrder)}`} />}
                {r.taxRate > 0 && <InfoRow icon="calculator" text={`${r.taxRate}% tax added at checkout`} />}
                {r.services.dineIn && <InfoRow icon="people" text={`${r.seatingCapacity} seats for dine-in`} />}
              </SheetSection>
            )}

            <SheetSection title="Location & contact" icon="location">
              <InfoRow
                icon="map"
                text={address}
                {...(coords && {
                  action: "Map",
                  onPress: () =>
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`),
                })}
              />
              {!!r.phone && (
                <InfoRow icon="call" text={r.phone} action="Call" onPress={() => Linking.openURL(`tel:${r.phone}`)} />
              )}
            </SheetSection>

            <SheetSection title="Opening hours" icon="time">
              {r.openingHours.map((h) => {
                const isToday = h.day === today;
                return (
                  <View
                    key={h.day}
                    className="mb-1 flex-row items-center justify-between rounded-xl px-3 py-2"
                    style={{ backgroundColor: isToday ? colors.brandSoft : "transparent" }}>
                    <Text className={`text-sm text-brand-dark ${isToday ? "font-bold" : ""}`}>
                      {DAY_LABELS[h.day]}
                      {isToday ? "  · Today" : ""}
                    </Text>
                    <Text className="text-sm" style={{ color: h.closed ? colors.danger : colors.text }}>
                      {h.closed ? "Closed" : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                    </Text>
                  </View>
                );
              })}
            </SheetSection>
          </ScrollView>
        </View>
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
      const [r, m] = await Promise.all([getCustomerRestaurant(String(id)), getCustomerMenu(String(id))]);
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
    if (x !== undefined) tabsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  };

  /** Tap a tab: scroll the page to that category */
  const jumpTo = (categoryId: string) => {
    const y = sectionY.current[categoryId];
    if (y === undefined) return;
    highlightTab(categoryId);
    jumping.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, menuTop.current + y - barHeight.current - 8), animated: true });
    setTimeout(() => (jumping.current = false), 500);
  };

  /** While scrolling: highlight the category at the top */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current || menu.length === 0) return;
    const y = e.nativeEvent.contentOffset.y + barHeight.current + 16 - menuTop.current;
    let current = menu[0]!._id;
    for (const c of menu) {
      const top = sectionY.current[c._id];
      if (top !== undefined && top <= y) current = c._id;
    }
    if (current !== activeId) highlightTab(current);
  };

  const openItem = (item: MenuItem) => {
    // Size / add-ons / quantity sheet comes in the next step
    Alert.alert(item.name, "Choosing options and adding to cart comes in the next step.");
  };

  // Floating back button (over the cover image)
  const backButton = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      className="absolute left-4 h-10 w-10 items-center justify-center rounded-full"
      style={{ top: insets.top + 8, backgroundColor: "rgba(59,70,56,0.75)" }}>
      <Ionicons name="chevron-back" size={22} color={colors.white} />
    </Pressable>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
        {backButton}
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">{error || "Restaurant not found"}</Text>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
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
        {/* [0] Cover + compact header */}
        <View>
          <View className="h-48 w-full" style={{ backgroundColor: colors.brandSoft }}>
            {r.coverImage ? (
              <Image source={{ uri: r.coverImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="restaurant" size={52} color={colors.brandLight} />
              </View>
            )}
          </View>

          <View className="-mt-10 mx-4 rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-center">
              <View
                className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
                style={{ backgroundColor: colors.brandSoft }}>
                {r.logo ? (
                  <Image source={{ uri: r.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <Text className="text-xl font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-brand-dark" numberOfLines={1}>
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
                style={{ backgroundColor: r.isOpenNow ? colors.brand : colors.text }}>
                <Ionicons name={r.isOpenNow ? "time" : "moon"} size={12} color={colors.white} />
                <Text className="ml-1 text-sm font-bold text-white">{statusText}</Text>
              </View>
              
            </View>
            <View className="flex-row justify-between">
            <View className="self-start mt-4 flex-row gap-2 ">
              {services.map((s) => (
                <View
                  key={s.key}
                  className="flex-row items-center rounded-full px-2.5 py-1 bg-brand-soft"
                  >
                  <Ionicons name={s.icon} size={12} color={colors.brand} />
                  <Text className="ml-1 text-sm font-semibold text-brand">{s.label}</Text>
                </View>
              ))}
              
            </View>
            {/* Info button → bottom sheet */}
              <Pressable
                onPress={() => setInfoOpen(true)}
                hitSlop={8}
                className="ml-2 items-center -top-6 rounded-2xl px-3 py-2 bg-brand-soft border-2 border-blue-400"
               >
                <Ionicons name="information-circle" size={20} color={colors.brand} />
                <Text className="text-[10px] font-bold text-brand">Info</Text>
              </Pressable>
              </View>
          </View>
        </View>

        
        <View
          className="mt-4 py-2"
          style={{ backgroundColor: colors.mist }}
          onLayout={(e: LayoutChangeEvent) => (barHeight.current = e.nativeEvent.layout.height)}>
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
                    onLayout={(e) => (tabX.current[c._id] = e.nativeEvent.layout.x)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: active ? colors.brand : colors.white }}>
                    <Text className="text-sm font-semibold " style={{ color: active ? colors.white : colors.brand }}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        
        <View className="flex-1 px-4 pt-2" onLayout={(e) => (menuTop.current = e.nativeEvent.layout.y)}>
          {!r.isOpenNow && menu.length > 0 && (
            <View className="mb-3 flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: colors.text }}>
              <Ionicons name="moon" size={16} color={colors.white} />
              <Text className="ml-2 flex-1 text-sm text-white">
                {r.isTemporarilyClosed
                  ? "The restaurant has closed for now. You can still look at the menu."
                  : "The restaurant is closed right now. You can still look at the menu."}
              </Text>
            </View>
          )}

          {menu.length === 0 ? (
            <View className="items-center rounded-3xl bg-white px-6 py-12" style={cardShadow}>
              <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="fast-food" size={30} color={colors.brand} />
              </View>
              <Text className="mt-3 text-base font-bold text-brand-dark">Menu coming soon</Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                This restaurant hasn't added its menu yet. Tap Info for hours and location.
              </Text>
            </View>
          ) : (
            menu.map((category) => (
              <View
                key={category._id}
                className="mb-2"
                onLayout={(e) => (sectionY.current[category._id] = e.nativeEvent.layout.y)}>
                <View className="mb-2 mt-2 flex-row items-end">
                  <Text className="flex-1 text-lg font-extrabold text-brand-dark">{category.name}</Text>
                  <Text className="text-xs text-brand-light">
                    {category.items.length} item{category.items.length === 1 ? "" : "s"}
                  </Text>
                </View>
                {!!category.description && (
                  <Text className="-mt-1 mb-2 text-xs" style={{ color: colors.textMuted }}>
                    {category.description}
                  </Text>
                )}
                {category.items.map((item) => (
                  <MenuItemCard key={item._id} item={item} canOrder={r.isOpenNow} onPress={() => openItem(item)} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {backButton}

      <InfoSheet restaurant={r} visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  );
}