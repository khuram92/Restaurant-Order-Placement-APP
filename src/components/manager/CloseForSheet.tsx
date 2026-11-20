import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";

/** null = closed until the manager opens again */
const OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Until I reopen", minutes: null },
];

const timeIn = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });


export default function CloseForSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (minutes: number | null) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(60);
  const [saving, setSaving] = useState(false);

  
  useEffect(() => {
    if (visible) setMinutes(60);
  }, [visible]);

  const submit = async () => {
    setSaving(true);
    try {
      await onConfirm(minutes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        className="flex-1 "
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={saving ? undefined : onClose}
      />
      <View
        className="rounded-t-[28px] bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View
          className="mb-4 h-1.5 w-12 self-center rounded-full"
          style={{ backgroundColor: colors.mistDark }}
        />
        <Text className="text-xl font-extrabold text-brand-dark">
          Close for how long?
        </Text>
        <Text className="mb-4 text-sm text-brand-light">
          Customers can't order while you're closed
        </Text>

        <View className="mb-4 flex-row flex-wrap justify-between gap-y-2">
          {OPTIONS.map((o) => {
            const on = minutes === o.minutes;
            return (
              <Pressable
                key={o.label}
                onPress={() => setMinutes(o.minutes)}
                className="items-center rounded-2xl border-2 py-3"
                style={{
                  width: "48.5%",
                  borderColor: on ? colors.brand : colors.mistDark,
                  backgroundColor: on ? colors.brand : colors.white,
                }}>
                <Ionicons
                  name={o.minutes ? "timer" : "lock-closed"}
                  size={18}
                  color={on ? colors.white : colors.brand}
                />
                <Text
                  className="mt-1 text-base font-extrabold"
                  style={{ color: on ? colors.white : colors.brandDark }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          className="mb-4 flex-row items-center rounded-2xl px-3 py-2.5"
          style={{ backgroundColor: colors.mistLight }}>
          <Ionicons
            name={minutes ? "refresh-circle" : "information-circle"}
            size={16}
            color={colors.brand}
          />
          <Text className="ml-2 flex-1 text-sm text-brand-dark">
            {minutes ? (
              <>
                Opens again by itself at{" "}
                <Text className="font-bold">{timeIn(minutes)}</Text>
              </>
            ) : (
              "Stays closed until you turn it back on"
            )}
          </Text>
        </View>

        <Pressable
          onPress={submit}
          disabled={saving}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={{ backgroundColor: colors.danger, opacity: saving ? 0.6 : 1 }}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="pause-circle" size={18} color={colors.white} />
              <Text className="ml-1.5 text-base font-bold text-white">
                Close now
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}
