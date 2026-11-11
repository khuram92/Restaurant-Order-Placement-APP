import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/api";
import { getMyRestaurant } from "../../../services/managerApi";
import type { ManagerRestaurant } from "../../../types/restaurant";

type IconName = ComponentProps<typeof Ionicons>["name"];

function MenuCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mb-3 flex-row items-center rounded-3xl bg-white p-5"
      style={[cardShadow, { opacity: disabled ? 0.55 : 1 }]}>
      <View
        className="mr-4 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: disabled ? colors.mistDark : colors.brand }}>
        <Ionicons name={icon} size={24} color={colors.white} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-brand-dark">{title}</Text>
        <Text className="text-sm text-brand-light">{subtitle}</Text>
      </View>
      {disabled ? (
        <Text className="text-xs font-semibold text-brand-light">Soon</Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.brandLight} />
      )}
    </Pressable>
  );
}

export default function ManagerHome() {
  const { user, signOut } = useAuth();
  const [restaurant, setRestaurant] = useState<ManagerRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  // Reload when coming back (open/closed can change)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Olive top area */}
      <View style={{ backgroundColor: colors.brand }}>
        <SafeAreaView edges={["top"]}>
          <View className="px-6 pb-10 pt-4">
            <View className="flex-row items-center justify-between">
              <View
                className="flex-row items-center rounded-full px-3 py-1"
                style={{ backgroundColor: colors.brandDark }}>
                <Ionicons name="briefcase" size={14} color={colors.white} />
                <Text className="ml-1 text-xs font-bold uppercase text-white">
                  Manager
                </Text>
              </View>
              <Pressable
                onPress={signOut}
                hitSlop={8}
                className="flex-row items-center">
                <Ionicons name="log-out" size={20} color={colors.white} />
                <Text className="ml-1 text-sm font-semibold text-white">
                  Log out
                </Text>
              </Pressable>
            </View>

            <Text className="mt-6 text-sm" style={{ color: colors.brandSoft }}>
              Welcome back
            </Text>
            <Text className="text-3xl font-extrabold text-white">
              {user?.firstName ?? "Manager"}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="-mt-6"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
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
        {/* My restaurant card */}
        <View className="mb-5 rounded-3xl bg-white p-4" style={cardShadow}>
          {loading ? (
            <ActivityIndicator color={colors.brand} className="py-6" />
          ) : error || !restaurant ? (
            <View className="items-center py-4">
              <Ionicons
                name="alert-circle"
                size={32}
                color={colors.brandLight}
              />
              <Text className="mt-2 text-center text-sm text-brand-dark">
                {error || "Restaurant not found"}
              </Text>
              <Pressable
                onPress={load}
                className="mt-3 rounded-2xl px-5 py-2.5"
                style={{ backgroundColor: colors.brand }}>
                <Text className="font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View
                className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
                style={{ backgroundColor: colors.brandSoft }}>
                {restaurant.logo ? (
                  <Image
                    source={{ uri: restaurant.logo }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-2xl font-extrabold text-brand">
                    {restaurant.name[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-extrabold text-brand-dark"
                  numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text className="text-sm text-brand-light" numberOfLines={1}>
                  {[restaurant.address.area, restaurant.address.city]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  <View
                    className="flex-row items-center rounded-full px-2.5 py-0.5"
                    style={{
                      backgroundColor: restaurant.isOpenNow
                        ? colors.brand
                        : colors.text,
                    }}>
                    <Ionicons
                      name={restaurant.isOpenNow ? "time" : "moon"}
                      size={11}
                      color={colors.white}
                    />
                    <Text className="ml-1 text-xs font-bold text-white">
                      {restaurant.isOpenNow
                        ? "Open now"
                        : restaurant.isTemporarilyClosed
                          ? "Closed for now"
                          : "Closed"}
                    </Text>
                  </View>
                  {!restaurant.isActive && (
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
          )}
        </View>

        <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-light">
          Manage
        </Text>

        <MenuCard
          icon="receipt"
          title="Orders"
          subtitle="Accept and track customer orders"
          disabled
        />
        <MenuCard
          icon="fast-food"
          title="Menu"
          subtitle="Categories, items, prices and add-ons"
          onPress={() =>
            router.push({
              pathname: "/manager/menu",
              params: restaurant ? { name: restaurant.name } : {},
            })
          }
        />
        <MenuCard
          icon="storefront"
          title="Restaurant info"
          subtitle="Hours, services, details and Close now"
          onPress={() => router.push("/manager/restaurant")}
        />
      </ScrollView>
    </View>
  );
}
