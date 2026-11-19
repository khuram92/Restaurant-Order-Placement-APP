import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import type { Order } from "../../types/order";

const OPTIONS = [10, 15, 20, 30, 45, 60];

/** Accepting an order: "How long will it take?" */
export default function PrepTimeSheet({
  order,
  onClose,
  onConfirm,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (minutes: number) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(20);
  const [saving, setSaving] = useState(false);

  // Start at 20 min each time it opens for a new order
  const orderId = order?._id;
  useEffect(() => {
    if (orderId) setMinutes(20);
  }, [orderId]);

  const readyAt = new Date(Date.now() + minutes * 60_000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const submit = async () => {
    setSaving(true);
    try {
      await onConfirm(minutes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={saving ? undefined : onClose} />
      <View className="rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />
        <Text className="text-xl font-extrabold text-brand-dark">How long will it take?</Text>
        <Text className="mb-4 text-sm text-brand-light">
          #{order?.orderNumber} · The customer sees when it will be ready
        </Text>

        <View className="mb-4 flex-row flex-wrap gap-2">
          {OPTIONS.map((m) => {
            const on = minutes === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMinutes(m)}
                className="items-center rounded-2xl border-2 py-3"
                style={{
                  width: "31%",
                  borderColor: on ? colors.brand : colors.mistDark,
                  backgroundColor: on ? colors.brand : colors.white,
                }}>
                <Text className="text-lg font-extrabold" style={{ color: on ? colors.white : colors.brandDark }}>
                  {m}
                </Text>
                <Text className="text-xs font-semibold" style={{ color: on ? colors.white : colors.brandLight }}>
                  min
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mb-4 flex-row items-center rounded-2xl px-3 py-2.5" style={{ backgroundColor: colors.mistLight }}>
          <Ionicons name="time" size={16} color={colors.brand} />
          <Text className="ml-2 text-sm text-brand-dark">
            Ready around <Text className="font-bold">{readyAt}</Text>
          </Text>
        </View>

        <Pressable
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={{ backgroundColor: colors.brand, opacity: saving ? 0.6 : 1 }}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text className="ml-1.5 text-base font-bold text-white">Accept · ready in {minutes} min</Text>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}