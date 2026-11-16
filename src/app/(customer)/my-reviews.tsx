import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RATING_WORDS, Stars } from "../../components/customer/Stars";
import { cardShadow, colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { listMyReviews } from "../../services/reviewApi";
import type { MyReview, MyReviewListResponse } from "../../types/review";
import { timeAgo } from "../../utils/orderFormat";

// ---------- One review ----------
function MyReviewCard({ review }: { review: MyReview }) {
  return (
    <View className="mb-3 rounded-3xl bg-white p-4" style={cardShadow}>
      {/* Restaurant → its page */}
      <Pressable
        onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: review.restaurantId } })}
        className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
          {review.restaurantLogo ? (
            <Image source={{ uri: review.restaurantLogo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Text className="text-lg font-extrabold text-brand">{review.restaurantName[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-brand-dark" numberOfLines={1}>
            {review.restaurantName}
          </Text>
          <Text className="text-xs text-brand-light">
            {review.orderNumber ? `#${review.orderNumber} · ` : ""}
            {timeAgo(review.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brandLight} />
      </Pressable>

      {/* My rating */}
      <View className="mt-3 flex-row items-center">
        <Stars value={review.rating} size={16} />
        <Text className="ml-2 text-sm font-bold text-brand">{RATING_WORDS[review.rating]}</Text>
      </View>

      {review.tags.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <View key={t} className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.brandSoft }}>
              <Text className="text-xs font-semibold text-brand">{t}</Text>
            </View>
          ))}
        </View>
      )}
      {!!review.comment && <Text className="mt-2 text-sm leading-5 text-brand-dark">{review.comment}</Text>}

      {/* Restaurant's reply */}
      {review.reply?.text ? (
        <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
          <View className="flex-row items-center">
            <Ionicons name="chatbubble-ellipses" size={13} color={colors.brand} />
            <Text className="ml-1.5 text-xs font-bold text-brand">{review.restaurantName} replied</Text>
            <Text className="ml-auto text-[11px] text-brand-light">{timeAgo(review.reply.at)}</Text>
          </View>
          <Text className="mt-1 text-sm text-brand-dark">{review.reply.text}</Text>
        </View>
      ) : (
        <Text className="mt-3 text-xs italic text-brand-light">No reply from the restaurant yet</Text>
      )}

      {/* The order */}
      {!!review.orderId && (
        <Pressable
          onPress={() => router.push({ pathname: "/order/[id]", params: { id: review.orderId } })}
          className="mt-3 flex-row items-center self-start">
          <Ionicons name="receipt" size={13} color={colors.brand} />
          <Text className="ml-1 text-xs font-bold text-brand">View order</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------- Screen ----------
export default function MyReviewsScreen() {
  const [data, setData] = useState<MyReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await listMyReviews(1));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when coming back (a reply may have arrived)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
      const more = await listMyReviews(data.page + 1);
      setData((d) => (d ? { ...more, reviews: [...d.reviews, ...more.reviews] } : more));
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const replies = data?.reviews.filter((r) => r.reply?.text).length ?? 0;

  return (
    <View className="flex-1 bg-mist">
      <View className=" bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-5 pt-2 gap-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">My reviews</Text>
              <Text className="text-sm text-brand-soft">
                {data?.total
                  ? `${data.total} review${data.total === 1 ? "" : "s"}${replies ? ` · ${replies} with a reply` : ""}`
                  : "Reviews you've written"}
              </Text>
            </View>
            <Ionicons name="heart" size={22} color={colors.white} />
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
          <Pressable onPress={load} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.reviews ?? []}
          keyExtractor={(r) => r._id}
          renderItem={({ item }) => <MyReviewCard review={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
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
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons name="heart" size={34} color={colors.brandLight} />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">No reviews yet</Text>
              <Text className="mt-1 px-6 text-center text-sm text-brand-light">
                After an order is completed, rate it from My bookings. Your reviews will show here.
              </Text>
              <Pressable
                onPress={() => router.navigate("/bookings")}
                className="mt-5 flex-row items-center rounded-2xl px-5 py-3"
                style={{ backgroundColor: colors.brand }}>
                <Ionicons name="receipt" size={16} color={colors.white} />
                <Text className="ml-1.5 font-bold text-white">Go to My bookings</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}