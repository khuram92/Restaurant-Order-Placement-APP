import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRestaurant, setRestaurantStatus } from "../../../../services/adminRestaurantApi";
import { getErrorMessage } from "../../../../lib/api";
import { colors, cardShadow } from "../../../../constants/theme";
import type { Day, Restaurant } from "../../../../types/restaurant";

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
const TODAY: Day = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[new Date().getDay()]!;

// "14:30" → "2:30 PM"
const formatTime = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

// ---------- Small UI pieces ----------
function Card({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name={icon} size={18} color={colors.brand} />
        <Text className="ml-2 text-base font-bold text-brand-dark">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) {
  const content = (
    <View className="flex-row items-center py-2">
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs text-brand-light">{label}</Text>
        <Text className="text-base text-brand-dark" style={{ color: value ? colors.text : colors.placeholder }}>
          {value || "Not set"}
        </Text>
      </View>
      {onPress && value && <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />}
    </View>
  );
  return onPress && value ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

function ServiceBadge({ icon, label, on }: { icon: IconName; label: string; on: boolean }) {
  return (
    <View
      className="flex-1 items-center rounded-2xl py-3"
      style={{ backgroundColor: on ? colors.brand : colors.mistLight, opacity: on ? 1 : 0.6 }}
    >
      <Ionicons name={icon} size={22} color={on ? colors.white : colors.brandLight} />
      <Text className="mt-1 text-xs font-bold" style={{ color: on ? colors.white : colors.brandLight }}>
        {label}
      </Text>
      <Text className="text-[10px]" style={{ color: on ? colors.brandSoft : colors.brandLight }}>
        {on ? "On" : "Off"}
      </Text>
    </View>
  );
}

function SettingTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 w-[48%] rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
      <Text className="text-xs text-brand-light">{label}</Text>
      <Text className="mt-0.5 text-base font-bold text-brand-dark">{value}</Text>
    </View>
  );
}

// ---------- Screen ----------
export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setRestaurant(await getRestaurant(id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load on open, and again when coming back from Edit
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeStatus = async (isActive: boolean) => {
    if (!restaurant) return;
    setToggling(true);
    try {
      const res = await setRestaurantStatus(restaurant._id, isActive);
      setRestaurant(res.restaurant);
    } catch (err) {
      Alert.alert("Couldn't change status", getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const onToggleActive = (next: boolean) => {
    if (next) return changeStatus(true);
    // Ask before hiding it from customers
    Alert.alert(
      "Deactivate restaurant?",
      "Customers won't see it or be able to order until you activate it again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: () => changeStatus(false) },
      ]
    );
  };

  const header = (
    <Stack.Screen
      options={{
        title: restaurant?.name ?? "Restaurant",
        headerStyle: { backgroundColor: colors.brand },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700", color: colors.white },
        contentStyle: { backgroundColor: colors.mist },
        headerRight: () =>
          restaurant ? (
            <Pressable
              onPress={() => router.push({ pathname: "/admin/restaurants/edit/[id]", params: { id: restaurant._id } })}
              hitSlop={8}
              className="flex-row items-center"
            >
              <Ionicons name="create" size={20} color={colors.white} />
              <Text className="ml-1 font-bold text-white">Edit</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
        {header}
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
        {header}
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">{error || "Restaurant not found"}</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            load();
          }}
          className="mt-4 rounded-2xl px-6 py-3"
          style={{ backgroundColor: colors.brand }}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const r = restaurant;
  const coords = r.location?.coordinates; // [lng, lat]
  const address = [r.address.street, r.address.area, r.address.city].filter(Boolean).join(", ");

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Cover + logo */}
        <View style={{ aspectRatio: 2, backgroundColor: colors.brandSoft }}>
          {r.coverImage ? (
            <Image source={{ uri: r.coverImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image" size={40} color={colors.brandLight} />
              <Text className="mt-1 text-xs text-brand-light">No cover photo</Text>
            </View>
          )}
        </View>
        <View className="px-4">
          <View className="flex-row items-end" style={{ marginTop: -44 }}>
            <View
              className="h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white"
              style={{ backgroundColor: colors.white, ...cardShadow }}
            >
              {r.logo ? (
                <Image source={{ uri: r.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <Text className="text-3xl font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
              )}
            </View>
            <View
              className="mb-2 ml-auto flex-row items-center rounded-full px-3 py-1"
              style={{ backgroundColor: r.isActive ? colors.brand : colors.mistDark }}
            >
              <Ionicons name={r.isActive ? "checkmark-circle" : "close-circle"} size={14} color={colors.white} />
              <Text className="ml-1 text-xs font-bold text-white">{r.isActive ? "Active" : "Inactive"}</Text>
            </View>
          </View>
          <Text className="mt-3 text-2xl font-extrabold text-brand-dark">{r.name}</Text>
          {!!r.description && <Text className="mt-1 text-sm text-brand-light">{r.description}</Text>}
          {r.cuisines.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {r.cuisines.map((c) => (
                <View key={c} className="rounded-full px-3 py-1" style={{ backgroundColor: colors.brandSoft }}>
                  <Text className="text-xs font-semibold text-brand">{c}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Status switch */}
          <View className="my-4 flex-row items-center rounded-3xl bg-white p-4" style={cardShadow}>
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: r.isActive ? colors.brand : colors.mistDark }}
            >
              <Ionicons name="power" size={20} color={colors.white} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-brand-dark">Visible to customers</Text>
              <Text className="text-xs text-brand-light">
                {r.isActive ? "Customers can see and order" : "Hidden from customers"}
              </Text>
            </View>
            {toggling ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Switch
                value={r.isActive}
                onValueChange={onToggleActive}
                trackColor={{ false: colors.mistDark, true: colors.brandLight }}
                thumbColor={r.isActive ? colors.brand : colors.white}
              />
            )}
          </View>
          {/* Services */}
          <Card title="Services" icon="grid">
            <View className="flex-row gap-2">
              <ServiceBadge icon="restaurant" label="Dine-in" on={r.services.dineIn} />
              <ServiceBadge icon="bag-handle" label="Takeaway" on={r.services.takeaway} />
              <ServiceBadge icon="bicycle" label="Delivery" on={r.services.delivery} />
            </View>
          </Card>
          {/* Settings */}
          <Card title="Settings" icon="pricetag">
            <View className="flex-row flex-wrap justify-between">
              <SettingTile label="Tax" value={`${r.taxRate}%`} />
              {r.services.dineIn && <SettingTile label="Seats" value={String(r.seatingCapacity)} />}
              {r.services.delivery && (
                <>
                  <SettingTile label="Minimum order" value={money(r.minOrder)} />
                  <SettingTile label="Delivery fee" value={money(r.deliveryFee)} />
                  <SettingTile label="Delivery radius" value={`${r.deliveryRadiusKm} km`} />
                </>
              )}
            </View>
          </Card>
          {/* Contact & address */}
          <Card title="Contact & address" icon="storefront">
            <InfoRow icon="call" label="Phone" value={r.phone} onPress={() => Linking.openURL(`tel:${r.phone}`)} />
            <InfoRow icon="mail" label="Email" value={r.email} onPress={() => Linking.openURL(`mailto:${r.email}`)} />
            <InfoRow icon="location" label="Address" value={address} />
            <InfoRow
              icon="navigate"
              label="Map location"
              value={coords ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}` : undefined}
              onPress={() =>
                coords && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`)
              }
            />
          </Card>

          {/* Opening hours */}
          <Card title="Opening hours" icon="time">
            {r.openingHours.map((h) => {
              const isToday = h.day === TODAY;
              return (
                <View
                  key={h.day}
                  className="mb-1 flex-row items-center justify-between rounded-xl px-3 py-2"
                  style={{ backgroundColor: isToday ? colors.brandSoft : "transparent" }}
                >
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
          </Card>

          <View className="flex-row items-center justify-center">
            <Ionicons name="calendar" size={12} color={colors.brandLight} />
            <Text className="ml-1 text-xs text-brand-light">
              Added {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}