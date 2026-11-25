import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { listBroadcasts } from "../../../../services/adminBroadcastApi";
import type { Broadcast, BroadcastHistory } from "../../../../types/broadcast";

const audienceLabel = (b: Broadcast) => {
  switch (b.audience) {
    case "everyone":
      return "Everyone";
    case "customers":
      return "All customers";
    case "managers":
      return "All managers";
    case "restaurants": {
      const names = b.restaurantIds.map((r) => r.name);
      const who = b.restaurantTarget === "both" ? "customers + managers" : b.restaurantTarget;
      return `${names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ")} · ${who}`;
    }
  }
};

const STATUS = {
  sending: { label: "Sending…", color: colors.brandLight },
  sent: { label: "Sent", color: colors.brand },
  failed: { label: "Failed", color: colors.danger },
} as const;

function BroadcastRow({ item }: { item: Broadcast }) {
  const total = item.recipients.customers + item.recipients.managers;
  const when = new Date(item.createdAt).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <View className="mb-3 rounded-3xl bg-white p-4" style={cardShadow}>
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name="megaphone" size={18} color={colors.brand} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-brand-dark" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-xs text-brand-light">{when}</Text>
        </View>
        <Text className="text-xs font-bold" style={{ color: STATUS[item.status].color }}>
          {STATUS[item.status].label}
        </Text>
      </View>
      <Text className="mt-2 text-sm text-brand-dark">{item.body}</Text>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <View className="flex-row items-center">
          <Ionicons name="people" size={13} color={colors.brandLight} />
          <Text className="ml-1 text-xs text-brand-light">
            {audienceLabel(item)} · {total} people
          </Text>
        </View>
        {!!item.linkRestaurantId && (
          <View className="flex-row items-center">
            <Ionicons name="link" size={13} color={colors.brandLight} />
            <Text className="ml-1 text-xs text-brand-light">Opens {item.linkRestaurantId.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function BroadcastsScreen() {
  const [data, setData] = useState<BroadcastHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await listBroadcasts());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const left = data?.remainingToday ?? 0;

  return (
    <View className="flex-1 bg-mist">
      <Stack.Screen options={{ title: "Broadcasts" }} />

      {loading ? (
        <ActivityIndicator className="mt-10" color={colors.brand} />
      ) : (
        <FlatList
          data={data?.broadcasts ?? []}
          keyExtractor={(b) => b._id}
          renderItem={({ item }) => <BroadcastRow item={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={
            <View className="mb-4">
              {!!error && <Text className="mb-3 text-sm" style={{ color: colors.danger }}>{error}</Text>}
              <View className="flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name="time" size={16} color={colors.brand} />
                <Text className="ml-2 flex-1 text-sm text-brand-dark">
                  {left > 0
                    ? `You can send ${left} more today (limit ${data?.dailyLimit ?? 3})`
                    : "Today's limit is used. You can send more tomorrow."}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="mt-10 items-center px-6">
              <Ionicons name="megaphone" size={44} color={colors.mistDark} />
              <Text className="mt-3 text-base font-bold text-brand-dark">No broadcasts yet</Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                Send news, offers or notices to customers and managers.
              </Text>
            </View>
          }
        />
      )}

      <View className="absolute bottom-6 left-4 right-4">
        <Pressable
        //   onPress={() => router.push("/admin/broadcasts/new")}
          disabled={!loading && left === 0}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={[cardShadow, { backgroundColor: colors.brand, opacity: !loading && left === 0 ? 0.45 : 1 }]}>
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text className="ml-2 text-base font-bold text-white">New broadcast</Text>
        </Pressable>
      </View>
    </View>
  );
}