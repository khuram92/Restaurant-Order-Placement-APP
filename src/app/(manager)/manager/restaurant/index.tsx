import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useFocusEffect } from "expo-router";
import {
  useCallback,
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
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import {
  getMyRestaurant,
  setTemporarilyClosed,
} from "../../../../services/managerApi";
import type { Day, ManagerRestaurant } from "../../../../types/restaurant";

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
const todayKey = (): Day =>
  (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[
    new Date().getDay()
  ]!;

// "14:30" → "2:30 PM"
const formatTime = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name={icon} size={18} color={colors.brand} />
        <Text className="ml-2 text-base font-bold text-brand-dark">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value?: string;
}) {
  return (
    <View className="flex-row items-center py-2">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons name={icon} size={17} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs text-brand-light">{label}</Text>
        <Text
          className="text-base"
          style={{ color: value ? colors.text : colors.placeholder }}>
          {value || "Not set"}
        </Text>
      </View>
    </View>
  );
}

function ServiceBadge({
  icon,
  label,
  on,
}: {
  icon: IconName;
  label: string;
  on: boolean;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl py-3"
      style={{
        backgroundColor: on ? colors.brand : colors.mistLight,
        opacity: on ? 1 : 0.6,
      }}>
      <Ionicons
        name={icon}
        size={22}
        color={on ? colors.white : colors.brandLight}
      />
      <Text
        className="mt-1 text-xs font-bold"
        style={{ color: on ? colors.white : colors.brandLight }}>
        {label}
      </Text>
    </View>
  );
}

export default function ManagerRestaurantScreen() {
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<ManagerRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setRestaurant(await getMyRestaurant());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when coming back from Edit
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeClosed = async (closed: boolean) => {
    setToggling(true);
    try {
      const res = await setTemporarilyClosed(closed);
      setRestaurant(res.restaurant);
    } catch (err) {
      Alert.alert("Couldn't change", getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const onToggleClosed = (closed: boolean) => {
    if (!closed) return changeClosed(false);
    Alert.alert(
      "Close for now?",
      "Customers will see the restaurant as closed and can't order until you open again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close now",
          style: "destructive",
          onPress: () => changeClosed(true),
        },
      ],
    );
  };

  const header = (
    <Stack.Screen
      options={{
        title: "Restaurant info",
        headerRight: () =>
          restaurant ? (
            <Pressable
              onPress={() => router.push("/manager/restaurant/edit")}
              hitSlop={8}
              className="flex-row items-center">
              <Ionicons name="create" size={20} color={colors.white} />
              <Text className="ml-1 font-bold text-white">Edit</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.mist }}>
        {header}
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.mist }}>
        {header}
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
  const paused = !!r.isTemporarilyClosed;
  const today = todayKey();
  const address = [r.address.street, r.address.area, r.address.city]
    .filter(Boolean)
    .join(", ");

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      {header}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
          className="h-40 w-full"
          style={{ backgroundColor: colors.brandSoft }}>
          {r.coverImage ? (
            <Image
              source={{ uri: r.coverImage }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image" size={40} color={colors.brandLight} />
            </View>
          )}
        </View>

        <View className="px-4">
          <View
            className="-mt-10 mb-4 flex-row items-center rounded-3xl bg-white p-4"
            style={cardShadow}>
            <View
              className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
              style={{ backgroundColor: colors.brandSoft }}>
              {r.logo ? (
                <Image
                  source={{ uri: r.logo }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-2xl font-extrabold text-brand">
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
              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                <View
                  className="flex-row items-center rounded-full px-2.5 py-0.5"
                  style={{
                    backgroundColor: r.isOpenNow ? colors.brand : colors.text,
                  }}>
                  <Ionicons
                    name={r.isOpenNow ? "time" : "moon"}
                    size={11}
                    color={colors.white}
                  />
                  <Text className="ml-1 text-xs font-bold text-white">
                    {r.isOpenNow
                      ? "Open now"
                      : paused
                        ? "Closed for now"
                        : "Closed"}
                  </Text>
                </View>
                {!r.isActive && (
                  <View
                    className="flex-row items-center rounded-full px-2.5 py-0.5"
                    style={{ backgroundColor: colors.danger }}>
                    <Ionicons name="eye-off" size={11} color={colors.white} />
                    <Text className="ml-1 text-xs font-bold text-white">
                      Hidden by admin
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Close now */}
          <View
            className="mb-4 flex-row items-center rounded-3xl p-5"
            style={[
              cardShadow,
              { backgroundColor: paused ? colors.text : colors.white },
            ]}>
            <View
              className="h-11 w-11 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: paused ? colors.danger : colors.brandSoft,
              }}>
              <Ionicons
                name={paused ? "pause" : "flash"}
                size={22}
                color={paused ? colors.white : colors.brand}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text
                className="text-base font-bold"
                style={{ color: paused ? colors.white : colors.brandDark }}>
                {paused ? "Closed for now" : "Taking orders"}
              </Text>
              <Text
                className="text-xs"
                style={{ color: paused ? colors.mistDark : colors.brandLight }}>
                {paused
                  ? "Turn off to open again"
                  : "Close now for a power cut, rush or break"}
              </Text>
            </View>
            {toggling ? (
              <ActivityIndicator color={paused ? colors.white : colors.brand} />
            ) : (
              <Switch
                value={paused}
                onValueChange={onToggleClosed}
                trackColor={{ false: colors.mistDark, true: colors.danger }}
                thumbColor={colors.white}
              />
            )}
          </View>

          {/* Services */}
          <Card title="Services" icon="grid">
            <View className="flex-row gap-2">
              <ServiceBadge
                icon="restaurant"
                label="Dine-in"
                on={r.services.dineIn}
              />
              <ServiceBadge
                icon="bag-handle"
                label="Takeaway"
                on={r.services.takeaway}
              />
              <ServiceBadge
                icon="bicycle"
                label="Delivery"
                on={r.services.delivery}
              />
            </View>
          </Card>
          {!!r.description && (
            <Card title="About" icon="document-text">
              <Text
                className="text-sm leading-5"
                style={{ color: colors.textMuted }}>
                {r.description}
              </Text>
            </Card>
          )}
          {/* Settings */}
          <Card title="Settings" icon="pricetag">
            {r.services.delivery && (
              <>
                <Row
                  icon="bicycle"
                  label="Delivery fee"
                  value={r.deliveryFee > 0 ? money(r.deliveryFee) : "Free"}
                />
                <Row
                  icon="navigate"
                  label="Delivery radius"
                  value={`${r.deliveryRadiusKm} km`}
                />
              </>
            )}
            <Row
              icon="cart"
              label="Minimum order"
              value={r.minOrder > 0 ? money(r.minOrder) : "None"}
            />
            <Row icon="calculator" label="Tax" value={`${r.taxRate}%`} />
            {r.services.dineIn && (
              <Row
                icon="people"
                label="Dine-in seats"
                value={String(r.seatingCapacity)}
              />
            )}
          </Card>

          {/* Contact */}
          <Card title="Contact & address" icon="storefront">
            <Row
              icon="call"
              label="Phone"
              {...(r.phone && { value: r.phone })}
            />
            <Row
              icon="mail"
              label="Email"
              {...(r.email && { value: r.email })}
            />
            <Row icon="location" label="Address" value={address} />
            <Row
              icon="map"
              label="Map location"
              {...(r.location && { value: "Pinned" })}
            />
          </Card>

          {/* Hours */}
          <Card title="Opening hours" icon="time">
            {r.openingHours.map((h) => {
              const isToday = h.day === today;
              return (
                <View
                  key={h.day}
                  className="mb-1 flex-row items-center justify-between rounded-xl px-3 py-2"
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
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
