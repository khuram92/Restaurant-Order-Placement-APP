import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotificationBell from "../../../components/customer/NotificationBell";
import RatingBadge from "../../../components/customer/RatingBadge";
import { cardShadow, colors } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/api";
import { browseRestaurants } from "../../../services/restaurantApi";
import type { CustomerRestaurant, ServiceKey } from "../../../types/restaurant";
import RestaurantCard from "../../../components/customer/RestaurantCard";

type IconName = ComponentProps<typeof Ionicons>["name"];

const SERVICES: { key: ServiceKey; label: string; icon: IconName }[] = [
  { key: "dineIn", label: "Dine-in", icon: "restaurant" },
  { key: "takeaway", label: "Takeaway", icon: "bag-handle" },
  { key: "delivery", label: "Delivery", icon: "bicycle" },
];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};



export default function CustomerHome() {
  const { user, signOut } = useAuth();

  const [restaurants, setRestaurants] = useState<CustomerRestaurant[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [service, setService] = useState<ServiceKey | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (pageToLoad: number, mode: "replace" | "append") => {
      const id = ++requestId.current;
      setError("");
      try {
        const res = await browseRestaurants({
          search: debouncedSearch,
          ...(service && { service }),
          page: pageToLoad,
        });
        if (id !== requestId.current) return;
        setRestaurants((prev) =>
          mode === "append" ? [...prev, ...res.restaurants] : res.restaurants,
        );
        setPage(res.page);
        setPages(res.pages);
      } catch (err) {
        if (id === requestId.current) setError(getErrorMessage(err));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, service],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1, "replace");
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(1, "replace");
  };

  const onEndReached = () => {
    if (loadingMore || loading || page >= pages) return;
    setLoadingMore(true);
    load(page + 1, "append");
  };
  
  const setFavoriteInList = (id: string, favorite: boolean) =>
    setRestaurants((prev) =>
      prev.map((r) => (r._id === id ? { ...r, isFavorite: favorite } : r)),
    );
  const filtered = !!debouncedSearch || !!service;

  return (
    <View className="flex-1 bg-mist">
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="px-4 pb-8 ">
            <View className="flex-row items-center">
              <View
                className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white"
                style={{ backgroundColor: colors.brandDark }}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color={colors.white} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base text-brand-soft">{greeting()}</Text>
                <Text
                  className="text-2xl font-extrabold text-white"
                  numberOfLines={1}>
                  {user?.firstName ?? "there"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                                <Pressable
                  onPress={() => router.push("/my-reviews")}
                  hitSlop={8}
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                  <Ionicons name="star" size={22} color={colors.white} />
                </Pressable>
                <Pressable
                  onPress={() => router.push("/favorites")}
                  hitSlop={8}
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                  <Ionicons name="heart" size={22} color={colors.white} />
                </Pressable>
                <NotificationBell />
              </View>
            </View>
            <Text className="mt-5 text-2xl font-extrabold text-white">
              What are you craving?
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="-mt-5 px-4">
        <View
          className="flex-row items-center rounded-2xl border-2 bg-white px-4"
          style={[
            cardShadow,
            { borderColor: searchFocused ? colors.brand : colors.white },
          ]}>
          <Ionicons name="search" size={18} color={colors.brandLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Restaurant, cuisine or area"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            className="ml-2 flex-1 py-3.5 text-base"
            style={{ color: colors.text }}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.brandLight}
              />
            </Pressable>
          )}
        </View>

        <View className="mt-4 flex-row justify-between">
          <Pressable
            onPress={() => setService(null)}
            className="rounded-full px-4 py-2"
            style={{
              backgroundColor: service === null ? colors.brand : colors.white,
            }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: service === null ? colors.white : colors.brand }}>
              All
            </Text>
          </Pressable>
          {SERVICES.map((s) => {
            const selected = service === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setService(selected ? null : s.key)}
                className={`flex-row items-center rounded-full px-3 py-2 ${selected ? "bg-brand" : "bg-white"} `}>
                <Ionicons
                  name={s.icon}
                  size={14}
                  color={selected ? colors.white : colors.brand}
                />
                <Text
                  className="ml-1 text-base font-semibold"
                  style={{ color: selected ? colors.white : colors.brand }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load(1, "replace");
            }}
            className="mt-4 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              onFavoriteChange={(favorite) => setFavoriteInList(item._id, favorite)}
            />
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.brand} className="my-4" />
            ) : undefined
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
                <Ionicons
                  name={filtered ? "search" : "restaurant"}
                  size={30}
                  color={colors.brand}
                />
              </View>
              <Text className="mt-3 text-base font-semibold text-brand-dark">
                {filtered ? "No matching restaurants" : "No restaurants yet"}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {filtered ? "Try another search or filter" : "Check back soon"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
