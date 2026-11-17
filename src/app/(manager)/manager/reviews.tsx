import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { STAR_GOLD, Stars } from "../../../components/customer/Stars";
import { cardShadow, colors } from "../../../constants/theme";
import { getErrorMessage } from "../../../lib/api";
import {
  listMyRestaurantReviews,
  replyToReview,
} from "../../../services/managerReviewApi";
import type {
  ManagerReview,
  ManagerReviewFilter,
  ManagerReviewListResponse,
} from "../../../types/review";
import { ORDER_TYPE_INFO, timeAgo } from "../../../utils/orderFormat";

/** Quick starts for a reply (the manager can edit them) */
const QUICK_REPLIES_GOOD = [
  "Thank you so much! We're glad you enjoyed it 😊",
  "Thanks for the kind words — see you again soon!",
];
const QUICK_REPLIES_BAD = [
  "We're sorry about this. Thank you for telling us — we'll do better.",
  "Sorry for the trouble. Please call us so we can make it right.",
];

// ---------- One review (with reply box) ----------
function ReviewItem({
  review,
  onReplied,
}: {
  review: ManagerReview;
  onReplied: (r: ManagerReview) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply?.text ?? "");
  const [saving, setSaving] = useState(false);
  const low = review.rating <= 2;
  const typeInfo =
    review.orderType && review.orderType in ORDER_TYPE_INFO
      ? ORDER_TYPE_INFO[review.orderType as keyof typeof ORDER_TYPE_INFO]
      : null;

  const send = async () => {
    if (text.trim().length < 2) return;
    setSaving(true);
    try {
      const saved = await replyToReview(review._id, text.trim());
      onReplied({
        ...review,
        reply: saved.reply ?? {
          text: text.trim(),
          at: new Date().toISOString(),
        },
      });
      setEditing(false);
    } catch (err) {
      Alert.alert("Couldn't post the reply", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      className="mb-3 rounded-3xl bg-white p-4"
      style={[
        cardShadow,
        !review.reply && {
          borderLeftWidth: 4,
          borderLeftColor: low ? colors.danger : colors.brand,
        },
      ]}>
      <View className="flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.brandSoft }}>
          <Text className="font-extrabold text-brand">
            {review.customerName[0]?.toUpperCase()}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-brand-dark" numberOfLines={1}>
            {review.customerName}
          </Text>
          <View className="mt-0.5 flex-row items-center">
            <Stars value={review.rating} size={12} />
            <Text className="ml-2 text-xs text-brand-light">
              {timeAgo(review.createdAt)}
            </Text>
          </View>
        </View>
        {!!review.orderId && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/manager/orders/[id]",
                params: { id: review.orderId },
              })
            }
            hitSlop={6}
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.mistLight }}>
            {typeInfo && (
              <Ionicons name={typeInfo.icon} size={11} color={colors.brand} />
            )}
            <Text className="ml-1 text-sm font-bold text-brand-dark">
              #{review.orderNumber ?? "order"}
            </Text>
          </Pressable>
        )}
      </View>

      {review.tags.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <View
              key={t}
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: colors.brandSoft }}>
              <Text className="text-xs font-semibold text-brand">{t}</Text>
            </View>
          ))}
        </View>
      )}
      {review.comment ? (
        <Text className="mt-2 text-sm leading-5 text-brand-dark">
          {review.comment}
        </Text>
      ) : (
        <Text className="mt-2 text-xs italic text-brand-light">
          No comment — just a rating
        </Text>
      )}

      {editing ? (
        <View className="mt-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}>
            {(low ? QUICK_REPLIES_BAD : QUICK_REPLIES_GOOD).map((q) => (
              <Pressable
                key={q}
                onPress={() => setText(q)}
                className="rounded-full border px-3 py-1.5"
                style={{ borderColor: colors.mistDark }}>
                <Text className="text-xs text-brand-dark" numberOfLines={1}>
                  {q.length > 34 ? `${q.slice(0, 32)}…` : q}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a reply the customer will see…"
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={500}
            autoFocus
            className="mt-2 min-h-[80px] rounded-2xl px-4 py-3 text-base text-brand-dark"
            style={{
              backgroundColor: colors.mistLight,
              textAlignVertical: "top",
            }}
          />
          <View className="mt-2 flex-row gap-2">
            <Pressable
              onPress={() => {
                setEditing(false);
                setText(review.reply?.text ?? "");
              }}
              className="flex-1 items-center rounded-2xl py-3"
              style={{ backgroundColor: colors.mistLight }}>
              <Text className="font-bold text-brand-dark">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={send}
              disabled={saving || text.trim().length < 2}
              className="flex-[1.4] flex-row items-center justify-center rounded-2xl py-3"
              style={{
                backgroundColor: colors.brand,
                opacity: saving || text.trim().length < 2 ? 0.5 : 1,
              }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={15} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">
                    {review.reply ? "Update reply" : "Post reply"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : review.reply?.text ? (
        <View
          className="mt-3 rounded-2xl p-3"
          style={{ backgroundColor: colors.mistLight }}>
          <View className="flex-row items-center">
            <Ionicons name="storefront" size={13} color={colors.brand} />
            <Text className="ml-1.5 flex-1 text-xs font-bold text-brand">
              Your reply · {timeAgo(review.reply.at)}
            </Text>
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={8}
              className="flex-row items-center">
              <Ionicons name="create" size={13} color={colors.brand} />
              <Text className="ml-1 text-xs font-bold text-brand">Edit</Text>
            </Pressable>
          </View>
          <Text className="mt-1 text-sm text-brand-dark">
            {review.reply.text}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          className="mt-3 flex-row items-center justify-center rounded-2xl border-2 py-2.5"
          style={{ borderColor: colors.brand }}>
          <Ionicons name="chatbubble-ellipses" size={15} color={colors.brand} />
          <Text className="ml-1.5 font-bold text-brand">Reply</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------- Screen ----------
export default function ManagerReviewsScreen() {
  const [filter, setFilter] = useState<ManagerReviewFilter>("all");
  const [data, setData] = useState<ManagerReviewListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(async (which: ManagerReviewFilter) => {
    setError("");
    try {
      const res = await listMyRestaurantReviews(which, 1);
      if (filterRef.current === which) setData(res);
    } catch (err) {
      if (filterRef.current === which) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  useFocusEffect(
    useCallback(() => {
      load(filterRef.current);
    }, [load]),
  );

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.pages) return;
    setLoadingMore(true);
    try {
      const more = await listMyRestaurantReviews(filter, data.page + 1);
      setData((d) =>
        d ? { ...more, reviews: [...d.reviews, ...more.reviews] } : more,
      );
    } catch {
      
    } finally {
      setLoadingMore(false);
    }
  };

 
  const onReplied = (updated: ManagerReview) =>
    setData((d) => {
      if (!d) return d;
      const wasUnanswered = !d.reviews.find((r) => r._id === updated._id)?.reply
        ?.text;
      return {
        ...d,
        unanswered: Math.max(0, d.unanswered - (wasUnanswered ? 1 : 0)),
        reviews: d.reviews.map((r) => (r._id === updated._id ? updated : r)),
      };
    });

  const s = data?.summary;
  const chips: { key: ManagerReviewFilter; label: string }[] = [
    { key: "all", label: "All" },
    {
      key: "unanswered",
      label: `Unanswered${data?.unanswered ? ` · ${data.unanswered}` : ""}`,
    },
    { key: 5, label: "5★" },
    { key: 4, label: "4★" },
    { key: 3, label: "3★" },
    { key: 2, label: "2★" },
    { key: 1, label: "1★" },
  ];

  const header = (
    <View>
      {s && (
        <View className="mb-3 rounded-3xl bg-white p-5" style={cardShadow}>
          <View className="flex-row items-center">
            <View className="mr-5 items-center">
              <Text className="text-5xl font-extrabold text-brand-dark">
                {s.count ? s.avg.toFixed(1) : "–"}
              </Text>
              <Stars value={s.avg} size={14} />
              <Text className="mt-1 text-xs text-brand-light">
                {s.count} review{s.count === 1 ? "" : "s"}
              </Text>
            </View>
            <View className="flex-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = s.breakdown[String(n) as "1"] ?? 0;
                const pct = s.count ? (count / s.count) * 100 : 0;
                return (
                  <View key={n} className="mb-1 flex-row items-center">
                    <Text className="w-3 text-sm font-bold text-brand-dark">
                      {n}
                    </Text>
                    <Ionicons
                      name="star"
                      size={10}
                      color={STAR_GOLD}
                      style={{ marginHorizontal: 3 }}
                    />
                    <View
                      className="h-2 flex-1 overflow-hidden rounded-full"
                      style={{ backgroundColor: colors.mistLight }}>
                      <View
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: STAR_GOLD }}
                      />
                    </View>
                    <Text className="ml-2 w-6 text-right text-sm text-brand-light">
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ gap: 8 }}>
        {chips.map((c) => {
          const selected = filter === c.key;
          return (
            <Pressable
              key={String(c.key)}
              onPress={() => setFilter(c.key)}
              className="rounded-full border px-3.5 py-1.5"
              style={{
                backgroundColor: selected ? colors.brand : colors.white,
                borderColor: selected ? colors.brand : colors.mistDark,
              }}>
              <Text
                className="text-sm font-bold"
                style={{ color: selected ? colors.white : colors.brandDark }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "Reviews" }} />

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable
            onPress={() => load(filter)}
            className="mt-4 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.reviews ?? []}
          keyExtractor={(r) => r._id}
          renderItem={({ item }) => (
            <ReviewItem review={item} onReplied={onReplied} />
          )}
          ListHeaderComponent={header}
          style={{ opacity: loading ? 0.5 : 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 32,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
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
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.brand} /> : undefined
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons
                  name={filter === "unanswered" ? "checkmark-done" : "star"}
                  size={34}
                  color={colors.brandLight}
                />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                {filter === "unanswered"
                  ? "All caught up!"
                  : filter === "all"
                    ? "No reviews yet"
                    : `No ${filter}★ reviews`}
              </Text>
              <Text className="mt-1 text-center text-sm text-brand-light">
                {filter === "unanswered"
                  ? "You've replied to every review."
                  : "Customers can rate completed orders. Their reviews show here."}
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
