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
import { Image } from "expo-image";
import { Stack, router, useFocusEffect } from "expo-router";
import { listRestaurants } from "../../../../services/adminRestaurantApi";
import { getErrorMessage } from "../../../../lib/api";
import type { Restaurant, RestaurantStatusFilter } from "../../../../types/restaurant";

const PINK = "#e0e1df";

const FILTERS: { key: RestaurantStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

// ---------- One restaurant card ----------
function RestaurantCard({ item }: { item: Restaurant }) {
  const services = [
    item.services.dineIn && "Dine-in",
    item.services.takeaway && "Takeaway",
    item.services.delivery && "Delivery",
  ].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/admin/restaurants/[id]", params: { id: item._id } })}
      className="mb-3 flex-row rounded-3xl bg-white p-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        shadowColor: PINK,
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      })}
    >
      {/* Logo or first letter */}
      <View className="mr-4 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-pink-100">
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Text className="text-2xl font-extrabold text-pink-500">{item.name[0]?.toUpperCase()}</Text>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="mr-2 flex-1 text-base font-bold text-gray-900" numberOfLines={1}>
            {item.name}
          </Text>
          <View className={`rounded-full px-2 py-0.5 ${item.isActive ? "bg-green-100" : "bg-gray-200"}`}>
            <Text className={`text-xs font-bold ${item.isActive ? "text-green-700" : "text-gray-500"}`}>
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={1}>
          📍 {[item.address.area, item.address.city].filter(Boolean).join(", ")}
        </Text>

        {item.cuisines.length > 0 && (
          <Text className="mt-0.5 text-sm text-pink-700/70" numberOfLines={1}>
            {item.cuisines.join(" · ")}
          </Text>
        )}

        <View className="mt-2 flex-row flex-wrap gap-1">
          {services.map((s) => (
            <View key={s} className="rounded-full bg-pink-50 px-2 py-0.5">
              <Text className="text-xs font-semibold text-pink-600">{s}</Text>
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
        const res = await listRestaurants({ search: debouncedSearch, status, page: pageToLoad });
        if (id !== requestId.current) return; // a newer request started
        setRestaurants((prev) => (mode === "append" ? [...prev, ...res.restaurants] : res.restaurants));
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
    [debouncedSearch, status]
  );

  // Reload when the search/filter changes, and when coming back to this screen
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1, "replace");
    }, [load])
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
    <View className="flex-1 bg-gray-100">
      <Stack.Screen
        options={{
          title: "Restaurants",
          headerRight: () => (
            <Pressable onPress={() => router.push("/admin/restaurants/new")} hitSlop={8}>
              <Text className="text-base font-bold text-[#4e5c4a]">+ Add</Text>
            </Pressable>
          ),
        }}
      />

      {/* Search */}
      <View className="px-4 pt-2">
        <View className="flex-row items-center rounded-full border-2 border-[#e0e1df] bg-white px-4">
          <Text className="mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, area, city or cuisine"
            placeholderTextColor="#C9A3B5"
            autoCorrect={false}
            selectionColor={PINK}
            className="flex-1 py-3 text-base text-gray-900"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Text className="text-gray-400">✕</Text>
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
                className={`rounded-full px-4 py-2 ${selected ? "bg-pink-500" : "bg-white"}`}
              >
                <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-pink-700"}`}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!loading && !error && (
          <Text className="mb-1 mt-3 text-xs text-gray-500">
            {total} restaurant{total === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PINK} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl">😕</Text>
          <Text className="mt-3 text-center text-gray-600">{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load(1, "replace");
            }}
            className="mt-4 rounded-2xl bg-pink-500 px-6 py-3"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <RestaurantCard item={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={PINK} className="my-4" /> : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-5xl">🍽️</Text>
              <Text className="mt-3 text-base font-semibold text-gray-700">
                {debouncedSearch || status !== "all" ? "No matching restaurants" : "No restaurants yet"}
              </Text>
              {!debouncedSearch && status === "all" && (
                <Pressable
                  onPress={() => router.push("/admin/restaurants/new")}
                  className="mt-4 rounded-2xl bg-pink-500 px-6 py-3"
                >
                  <Text className="font-semibold text-white">+ Add your first restaurant</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}