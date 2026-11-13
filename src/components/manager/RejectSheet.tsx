import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import type { Order } from "../../types/order";

const REJECT_REASONS = [
  "Too busy right now",
  "An item is not available",
  "Closing soon",
  "Outside delivery area",
];

export default function RejectSheet({
  order,
  onClose,
  onConfirm,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Clear the reason when the sheet opens for an order
  // (by id, so the 15 s refresh doesn't wipe what's being typed)
  const orderId = order?._id;
  useEffect(() => {
    if (orderId) setReason("");
  }, [orderId]);

  const submit = async () => {
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  const valid = reason.trim().length >= 3;

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />
          <Text className="text-xl font-extrabold text-brand-dark">Reject order</Text>
          <Text className="mb-4 text-sm text-brand-light">#{order?.orderNumber} · The customer will see this reason</Text>

          <View className="mb-3 flex-row flex-wrap gap-2">
            {REJECT_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  className="rounded-full px-3.5 py-2"
                  style={{ backgroundColor: selected ? colors.brand : colors.mistLight }}>
                  <Text className="text-sm font-semibold" style={{ color: selected ? colors.white : colors.brandDark }}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Or write a reason…"
            placeholderTextColor={colors.placeholder}
            maxLength={200}
            multiline
            className="mb-4 min-h-[70px] rounded-2xl px-4 py-3 text-base text-brand-dark"
            style={{ backgroundColor: colors.mistLight, textAlignVertical: "top" }}
          />

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 items-center rounded-2xl py-4" style={{ backgroundColor: colors.mistLight }}>
              <Text className="font-bold text-brand-dark">Keep</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!valid || saving}
              className="flex-1 flex-row items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: colors.danger, opacity: !valid || saving ? 0.5 : 1 }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color={colors.white} />
                  <Text className="ml-1.5 font-bold text-white">Reject</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}