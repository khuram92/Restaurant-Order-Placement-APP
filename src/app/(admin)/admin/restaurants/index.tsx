import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { listRestaurants } from "../../../../services/adminRestaurantApi";
import type {
  Restaurant,
  RestaurantStatusFilter,
} from "../../../../types/restaurant";

const FILTERS: { key: RestaurantStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

// ---------- One restaurant card ----------
function RestaurantCard({ item }: { item: Restaurant }) {
  const services = [
    { on: item.services.dineIn, icon: "restaurant" as const, label: "Dine-in" },
    {
      on: item.services.takeaway,
      icon: "bag-handle" as const,
      label: "Takeaway",
    },
    { on: item.services.delivery, icon: "bicycle" as const, label: "Delivery" },
  ].filter((s) => s.on);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/admin/restaurants/[id]",
          params: { id: item._id },
        })
      }
      className="mb-3 flex-row rounded-3xl bg-white p-4"
      style={cardShadow}>
      {/* Logo or first letter */}
      <View
        className="mr-4 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: colors.brandSoft }}>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text className="text-2xl font-extrabold text-brand">
            {item.name[0]?.toUpperCase()}
          </Text>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text
            className="mr-2 flex-1 text-base font-bold text-brand-dark"
            numberOfLines={1}>
            {item.name}
          </Text>
          <View
            className="flex-row items-center rounded-full px-2 py-0.5"
            style={{
              backgroundColor: item.isActive ? colors.brand : colors.mistDark,
            }}>
            <Ionicons
              name={item.isActive ? "checkmark-circle" : "close-circle"}
              size={12}
              color={colors.white}
            />
            <Text className="ml-1 text-xs font-bold text-white">
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View className="mt-1 flex-row items-center">
          <Ionicons name="location" size={13} color={colors.brandLight} />
          <Text
            className="ml-1 flex-1 text-sm text-brand-light"
            numberOfLines={1}>
            {[item.address.area, item.address.city].filter(Boolean).join(", ")}
          </Text>
        </View>

        {item.cuisines.length > 0 && (
          <Text className="mt-0.5 text-sm text-brand" numberOfLines={1}>
            {item.cuisines.join(" · ")}
          </Text>
        )}

        <View className="mt-2 flex-row flex-wrap gap-1">
          {services.map((s) => (
            <View
              key={s.label}
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name={s.icon} size={11} color={colors.brand} />
              <Text className="ml-1 text-xs font-semibold text-brand">
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Screen ----------
export default function AdminRestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<RestaurantStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Ignore answers from old requests (e.g. user typed fast)
  const requestId = useRef(0);

  // Wait 400ms after typing stops before searching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (pageToLoad: number, mode: "replace" | "append") => {
      const id = ++requestId.current;
      setError("");
      try {
        const res = await listRestaurants({
          search: debouncedSearch,
          status,
          page: pageToLoad,
        });
        if (id !== requestId.current) return; // a newer request started
        setRestaurants((prev) =>
          mode === "append" ? [...prev, ...res.restaurants] : res.restaurants,
        );
        setPage(res.page);
        setPages(res.pages);
        setTotal(res.total);
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
    [debouncedSearch, status],
  );

  // Reload when the search/filter changes, and when coming back to this screen
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen
        options={{
          title: "Restaurants",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/admin/restaurants/new")}
              hitSlop={8}
              className="flex-row items-center">
              <Ionicons name="add-circle" size={22} color={colors.white} />
              <Text className="ml-1 text-base font-bold text-white">Add</Text>
            </Pressable>
          ),
        }}
      />

      {/* Search */}
      <View className="px-4 pt-3">
        <View
          className="flex-row items-center rounded-2xl border-2 bg-white px-4"
          style={{
            borderColor: searchFocused ? colors.brand : colors.mistDark,
          }}>
          <Ionicons name="search" size={18} color={colors.brandLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by name, area, city or cuisine"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            selectionColor={colors.brand}
            className="ml-2 flex-1 py-3 text-base text-[#2c3329]"
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

        {/* Status filter */}
        <View className="mt-3 flex-row gap-2">
          {FILTERS.map((f) => {
            const selected = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: selected ? colors.brand : colors.white,
                }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: selected ? colors.white : colors.brand }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!loading && !error && (
          <Text className="mb-1 mt-3 text-xs text-brand-light">
            {total} restaurant{total === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      {/* Content */}
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
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
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
              <View
                className="h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="restaurant" size={30} color={colors.brand} />
              </View>
              <Text className="mt-3 text-base font-semibold text-brand-dark">
                {debouncedSearch || status !== "all"
                  ? "No matching restaurants"
                  : "No restaurants yet"}
              </Text>
              {!debouncedSearch && status === "all" && (
                <Pressable
                  onPress={() => router.push("/admin/restaurants/new")}
                  className="mt-4 flex-row items-center rounded-2xl px-6 py-3"
                  style={{ backgroundColor: colors.brand }}>
                  <Ionicons name="add" size={18} color={colors.white} />
                  <Text className="ml-1 font-bold text-white">
                    Add your first restaurant
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
