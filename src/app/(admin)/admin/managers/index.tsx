import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useFocusEffect } from "expo-router";
import { listManagers, managerInitials, managerName } from "../../../../services/adminManagerApi";
import { getErrorMessage } from "../../../../lib/api";
import { colors, cardShadow } from "../../../../constants/theme";
import type { Manager, ManagerStatusFilter } from "../../../../types/manager";

const FILTERS: { key: ManagerStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];
function ManagerCard({ item }: { item: Manager }) {
  const restaurant = item.restaurantId;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/admin/managers/[id]", params: { id: item._id } })}
      className="mb-3 flex-row items-center rounded-3xl bg-white p-4"
      style={cardShadow}
    >
      <View className="mr-4 h-14 w-14 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: colors.brand }}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Text className="text-lg font-extrabold text-white">{managerInitials(item)}</Text>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="mr-2 flex-1 text-base font-bold text-brand-dark" numberOfLines={1}>
            {managerName(item)}
          </Text>
          <View
            className="flex-row items-center rounded-full px-2 py-0.5"
            style={{ backgroundColor: item.isActive ? colors.brand : colors.mistDark }}
          >
            <Ionicons name={item.isActive ? "checkmark-circle" : "close-circle"} size={12} color={colors.white} />
            <Text className="ml-1 text-xs font-bold text-white">{item.isActive ? "Active" : "Inactive"}</Text>
          </View>
        </View>
        <Text className="text-sm text-brand-light" numberOfLines={1}>
          {item.email}
        </Text>
        <View className="mt-1.5 flex-row items-center">
          <Ionicons name="storefront" size={13} color={colors.brand} />
          <Text className="ml-1 flex-1 text-sm font-semibold text-brand" numberOfLines={1}>
            {restaurant?.name ?? "No restaurant"}
          </Text>
          {item.mustChangePassword && (
            <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: colors.mistLight }}>
              <Ionicons name="time" size={11} color={colors.brandLight} />
              <Text className="ml-1 text-[10px] font-semibold text-brand-light">Not logged in yet</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function AdminManagersScreen() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ManagerStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
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
        const res = await listManagers({ search: debouncedSearch, status, page: pageToLoad });
        if (id !== requestId.current) return;
        setManagers((prev) => (mode === "append" ? [...prev, ...res.managers] : res.managers));
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1, "replace");
    }, [load])
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen
        options={{
          title: "Managers",
          headerRight: () => (
            <Pressable onPress={() => router.push("/admin/managers/new")} hitSlop={8} className="flex-row items-center">
              <Ionicons name="person-add" size={20} color={colors.white} />
              <Text className="ml-1 text-base font-bold text-white">Add</Text>
            </Pressable>
          ),
        }}
      />

      <View className="px-4 pt-3">
        <View
          className="flex-row items-center rounded-2xl border-2 bg-white px-4"
          style={{ borderColor: searchFocused ? colors.brand : colors.mistDark }}
        >
          <Ionicons name="search" size={18} color={colors.brandLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by name, email or phone"
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={colors.brand}
            className="ml-2 flex-1 py-3 text-base text-[#2c3329]"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.brandLight} />
            </Pressable>
          )}
        </View>
        <View className="mt-3 flex-row gap-2">
          {FILTERS.map((f) => {
            const selected = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: selected ? colors.brand : colors.white }}
              >
                <Text className="text-sm font-semibold" style={{ color: selected ? colors.white : colors.brand }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!loading && !error && (
          <Text className="mb-1 mt-3 text-xs text-brand-light">
            {total} manager{total === 1 ? "" : "s"}
          </Text>
        )}
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
            style={{ backgroundColor: colors.brand }}
          >
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={managers}
          keyExtractor={(m) => m._id}
          renderItem={({ item }) => <ManagerCard item={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(1, "replace");
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          onEndReached={() => {
            if (loadingMore || loading || page >= pages) return;
            setLoadingMore(true);
            load(page + 1, "append");
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} className="my-4" /> : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="people" size={30} color={colors.brand} />
              </View>
              <Text className="mt-3 text-base font-semibold text-brand-dark">
                {debouncedSearch || status !== "all" ? "No matching managers" : "No managers yet"}
              </Text>
              {!debouncedSearch && status === "all" && (
                <Pressable
                  onPress={() => router.push("/admin/managers/new")}
                  className="mt-4 flex-row items-center rounded-2xl px-6 py-3"
                  style={{ backgroundColor: colors.brand }}
                >
                  <Ionicons name="person-add" size={16} color={colors.white} />
                  <Text className="ml-2 font-bold text-white">Add your first manager</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}