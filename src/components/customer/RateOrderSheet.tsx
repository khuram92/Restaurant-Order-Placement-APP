import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { createReview } from "../../services/reviewApi";
import { REVIEW_TAGS, type Review, type ReviewTag } from "../../types/review";
import { RATING_WORDS, StarInput } from "./Stars";

/** Bottom sheet: stars + quick tags + comment → saves the review */
export default function RateOrderSheet({
  visible,
  orderId,
  restaurantName,
  initialRating = 0,
  onClose,
  onDone,
}: {
  visible: boolean;
  orderId: string;
  restaurantName: string;
  initialRating?: number;
  onClose: () => void;
  onDone: (review: Review) => void;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(initialRating);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fresh form each time it opens
  useEffect(() => {
    if (!visible) return;
    setRating(initialRating);
    setTags([]);
    setComment("");
    setError("");
  }, [visible, initialRating]);

  const toggleTag = (tag: ReviewTag) =>
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  const submit = async () => {
    if (!rating) return setError("Tap the stars to rate");
    setError("");
    setSaving(true);
    try {
      const review = await createReview(orderId, { rating, tags, comment });
      onDone(review);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={saving ? undefined : onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text className="text-center text-xl font-extrabold text-brand-dark">How was {restaurantName}?</Text>
            <Text className="mb-4 mt-1 text-center text-sm text-brand-light">Your rating helps other customers</Text>

            <StarInput value={rating} onChange={setRating} />
            <Text className="mt-2 h-6 text-center text-base font-bold" style={{ color: rating ? colors.brand : colors.placeholder }}>
              {rating ? RATING_WORDS[rating] : "Tap a star"}
            </Text>

            {/* Quick tags */}
            <Text className="mb-2 mt-4 text-sm font-semibold text-brand-dark">What did you like?</Text>
            <View className="flex-row flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className="flex-row items-center rounded-full border px-3 py-1.5"
                    style={{
                      backgroundColor: selected ? colors.brand : colors.white,
                      borderColor: selected ? colors.brand : colors.mistDark,
                    }}>
                    {selected && <Ionicons name="checkmark" size={13} color={colors.white} style={{ marginRight: 3 }} />}
                    <Text className="text-sm font-semibold" style={{ color: selected ? colors.white : colors.brandDark }}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Comment */}
            <Text className="mb-2 mt-4 text-sm font-semibold text-brand-dark">
              Tell us more <Text className="font-normal text-brand-light">(optional)</Text>
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="What was great? What could be better?"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={500}
              className="min-h-[90px] rounded-2xl px-4 py-3 text-base text-brand-dark"
              style={{ backgroundColor: colors.mistLight, textAlignVertical: "top" }}
            />
            <Text className="mt-1 text-right text-xs text-brand-light">{comment.length}/500</Text>

            {!!error && (
              <View className="mt-2 flex-row items-center rounded-2xl p-3" style={{ backgroundColor: "#fde8e6" }}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text className="ml-2 flex-1 text-sm" style={{ color: colors.danger }}>
                  {error}
                </Text>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={saving || !rating}
              className="mt-4 flex-row items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: colors.brand, opacity: saving || !rating ? 0.5 : 1 }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={colors.white} />
                  <Text className="ml-1.5 text-base font-bold text-white">Submit review</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}