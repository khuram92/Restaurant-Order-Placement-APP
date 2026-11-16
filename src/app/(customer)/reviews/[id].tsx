import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import { listRestaurantReviews } from "../../../services/reviewApi";
import type { Review, ReviewListResponse } from "../../../types/review";
import { timeAgo } from "../../../utils/orderFormat";
import { STAR_GOLD, Stars } from "../../../components/customer/Stars";


function ReviewCard({ review, restaurantName }: { review: Review; restaurantName: string }) {
  return (
    <View className="mb-3 rounded-3xl bg-white p-4" style={cardShadow}>
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.brandSoft }}>
          <Text className="font-extrabold text-brand">{review.customerName[0]?.toUpperCase()}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-brand-dark">{review.customerName}</Text>
          <View className="mt-0.5 flex-row items-center">
            <Stars value={review.rating} size={12} />
            <Text className="ml-2 text-xs text-brand-light">{timeAgo(review.createdAt)}</Text>
          </View>
        </View>
      </View>

      {review.tags.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <View key={t} className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.brandSoft }}>
              <Text className="text-xs font-semibold text-brand">{t}</Text>
            </View>
          ))}
        </View>
      )}
      {!!review.comment && <Text className="mt-2 text-sm leading-5 text-brand-dark">{review.comment}</Text>}

      {!!review.reply?.text && (
        <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
          <View className="flex-row items-center">
            <Ionicons name="storefront" size={13} color={colors.brand} />
            <Text className="ml-1.5 text-xs font-bold text-brand">Response from {restaurantName}</Text>
          </View>
          <Text className="mt-1 text-sm text-brand-dark">{review.reply.text}</Text>
        </View>
      )}
    </View>
  );
}

// ---------- Screen ----------
export default function RestaurantReviewsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const restaurantName = name || "the restaurant";
  const [filter, setFilter] = useState<number | undefined>(undefined); // only 5★, 4★…
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(
    async (rating: number | undefined) => {
      setError("");
      try {
        const res = await listRestaurantReviews(String(id), 1, rating);
        if (filterRef.current === rating) setData(res);
      } catch (err) {
        if (filterRef.current === rating) setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
      const more = await listRestaurantReviews(String(id), data.page + 1, filter);
      setData((d) => (d ? { ...more, reviews: [...d.reviews, ...more.reviews] } : more));
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const summary = data?.summary;

  const header = summary ? (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="flex-row items-center">
       
        <View className="mr-5 items-center">
          <Text className="text-5xl font-extrabold text-brand-dark">{summary.count ? summary.avg.toFixed(1) : "–"}</Text>
          <Stars value={summary.avg} size={14} />
          <Text className="mt-1 text-sm text-brand">
            {summary.count} review{summary.count === 1 ? "" : "s"}
          </Text>
        </View>

        
        <View className="flex-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = summary.breakdown[String(n) as "1"] ?? 0;
            const pct = summary.count ? (count / summary.count) * 100 : 0;
            const selected = filter === n;
            return (
              <Pressable
                key={n}
                onPress={() => setFilter(selected ? undefined : n)}
                className="mb-1 flex-row items-center rounded-lg px-1 py-0.5"
                style={{ backgroundColor: selected ? colors.brandSoft : "transparent" }}>
                <Text className="w-3 text-xs font-bold text-brand-dark">{n}</Text>
                <Ionicons name="star" size={10} color={STAR_GOLD} style={{ marginHorizontal: 3 }} />
                <View className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.mistLight }}>
                  <View className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: STAR_GOLD }} />
                </View>
                <Text className="ml-2 w-6 text-right text-xs text-brand-light">{count}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {filter && (
        <Pressable onPress={() => setFilter(undefined)} className="mt-3 flex-row items-center self-start rounded-full px-3 py-1.5" style={{ backgroundColor: colors.brand }}>
          <Text className="text-xs font-bold text-white">Showing {filter}★ only</Text>
          <Ionicons name="close" size={13} color={colors.white} style={{ marginLeft: 4 }} />
        </Pressable>
      )}
    </View>
  ) : undefined;

  return (
    <View className="flex-1 bg-mist">
      <View className=" bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">Reviews</Text>
              <Text className="text-sm text-brand-soft" numberOfLines={1}>
                {restaurantName}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable onPress={() => load(filter)} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.reviews ?? []}
          keyExtractor={(r) => r._id}
          renderItem={({ item }) => <ReviewCard review={item} restaurantName={restaurantName} />}
          ListHeaderComponent={header}
          style={{ opacity: loading ? 0.5 : 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(filter);
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined}
          ListEmptyComponent={
            <View className="items-center py-12">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons name="star" size={34} color={colors.mistDark} />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                {filter ? `No ${filter}★ reviews` : "No reviews yet"}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {filter ? "Try another star filter." : "Be the first to order and rate!"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}