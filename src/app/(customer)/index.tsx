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
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { browseRestaurants } from "../../services/restaurantApi";
import type { CustomerRestaurant, ServiceKey } from "../../types/restaurant";

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

function RestaurantCard({ item }: { item: CustomerRestaurant }) {
  const services = SERVICES.filter((s) => item.services[s.key]);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/restaurant/[id]", params: { id: item._id } })
      }
      className="mb-4 overflow-hidden rounded-3xl bg-white active:opacity-90"
      style={cardShadow}>
      <View className="h-32 w-full bg-brand-soft">
        {item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="restaurant" size={40} color={colors.brandLight} />
          </View>
        )}

        {!item.isOpenNow && (
          <View className="absolute inset-0 bg-[#2c3329]/35" />
        )}

        <View
          className={`absolute left-3 top-3 flex-row items-center rounded-full px-2.5 py-1 ${
            item.isOpenNow ? "bg-brand" : "bg-[#2c3329]"
          }`}>
          <Ionicons
            name={item.isOpenNow ? "time" : "moon"}
            size={12}
            color={colors.white}
          />
          <Text className="ml-1 text-xs font-bold text-white">
            {item.isOpenNow ? "Open now" : "Closed"}
          </Text>
        </View>
      </View>

      <View className="absolute left-4 top-24 h-16 w-16 bg-brand-soft items-center justify-center overflow-hidden rounded-2xl border-4 border-white">
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text className="text-xl font-extrabold text-brand">
            {item.name[0]?.toUpperCase()}
          </Text>
        )}
      </View>

      <View className="px-4 pb-4 pt-1">
        <View className="ml-[60px] -mt-[18px] min-h-[30px] bg-white self-start px-3  justify-center pb-2">
          <Text
            className="text-lg font-bold text-brand-dark "
            numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {item.cuisines.length > 0 && (
          <Text className="mt-4 text-base text-brand" numberOfLines={1}>
            {item.cuisines.join(" · ")}
          </Text>
        )}

        <View className="mt-2 flex-row items-center">
          <Ionicons name="location" size={13} color={colors.brandLight} />
          <Text
            className="ml-2 flex-1 text-sm text-brand-light"
            numberOfLines={1}>
            {[item.address.area, item.address.city].filter(Boolean).join(", ")}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center">
          <Ionicons name="call" size={13} color={colors.brandLight} />
          <Text
            className="ml-2 flex-1 text-sm text-brand-light"
            numberOfLines={1}>
            {item.phone}
          </Text>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
          {services.map((s) => (
            <View
              key={s.key}
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name={s.icon} size={11} color={colors.brand} />
              <Text className="ml-1 text-xs font-semibold text-brand">
                {s.label}
              </Text>
            </View>
          ))}
          {item.services.delivery && (
            <Text className="ml-1 text-xs text-brand-light">
              {item.deliveryFee > 0
                ? `Rs ${item.deliveryFee} delivery`
                : "Free delivery"}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

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
              <Pressable onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color="white" />
              </Pressable>
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
          renderItem={({ item }) => <RestaurantCard item={item} />}
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
