import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { cardShadow, colors } from "../../constants/theme";
import { getMyOrderReview } from "../../services/reviewApi";
import type { Review } from "../../types/review";
import RateOrderSheet from "./RateOrderSheet";
import { RATING_WORDS, StarInput, Stars } from "./Stars";

/** On a completed order: "Rate your order" — or the review you already left */
export default function OrderReviewCard({ orderId, restaurantName }: { orderId: string; restaurantName: string }) {
  const [review, setReview] = useState<Review | null | undefined>(undefined); // undefined = loading
  const [sheetRating, setSheetRating] = useState<number | null>(null); // open sheet with this many stars

  useEffect(() => {
    getMyOrderReview(orderId)
      .then(setReview)
      .catch(() => setReview(null));
  }, [orderId]);

  if (review === undefined) {
    return (
      <View className="mb-4 items-center rounded-3xl bg-white p-5" style={cardShadow}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  // Already rated → show it
  if (review) {
    return (
      <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
        <View className="flex-row items-center">
          <Text className="flex-1 text-base font-bold text-brand-dark">Your review</Text>
          <Stars value={review.rating} size={16} />
        </View>
        <Text className="mt-0.5 text-xs font-semibold text-brand">{RATING_WORDS[review.rating]}</Text>
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
        {!!review.reply?.text && (
          <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
            <View className="flex-row items-center">
              <Ionicons name="storefront" size={13} color={colors.brand} />
              <Text className="ml-1.5 text-xs font-bold text-brand">{restaurantName} replied</Text>
            </View>
            <Text className="mt-1 text-sm text-brand-dark">{review.reply.text}</Text>
          </View>
        )}
      </View>
    );
  }

  // Not rated yet → tap a star to start
  return (
    <View className="mb-4 rounded-3xl p-5" style={[cardShadow, { backgroundColor: colors.brand }]}>
      <Text className="text-center text-lg font-extrabold text-white">How was your order?</Text>
      <Text className="mb-3 mt-0.5 text-center text-sm" style={{ color: colors.brandSoft }}>
        Rate {restaurantName}
      </Text>
      <View className="self-center rounded-2xl bg-white px-3 py-2">
        <StarInput value={0} onChange={setSheetRating} size={34} />
      </View>

      <RateOrderSheet
        visible={sheetRating !== null}
        orderId={orderId}
        restaurantName={restaurantName}
        initialRating={sheetRating ?? 0}
        onClose={() => setSheetRating(null)}
        onDone={(r) => {
          setSheetRating(null);
          setReview(r);
        }}
      />
    </View>
  );
}