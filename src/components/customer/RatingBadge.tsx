import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { STAR_GOLD } from "./Stars";


export default function RatingBadge({
  avg,
  count,
  size = "sm",
}: {
  avg?: number | undefined;
  count?: number | undefined;
  size?: "sm" | "md";
}) {
  const text = size === "md" ? "text-sm" : "text-xs";
  if (!count) {
    return (
      <View className="flex-row items-center rounded-full bg-brand-light px-2.5 py-1">
        <Ionicons name="sparkles" size={size === "md" ? 13 : 11} color={STAR_GOLD} />
        <Text className={`ml-1 font-bold text-white ${text}`}>New</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-full bg-brand-light px-2.5 py-1">
      <Ionicons name="star" size={size === "md" ? 13 : 11} color={STAR_GOLD} />
      <Text className={`ml-1 font-extrabold text-white ${text}`}>{(avg ?? 0).toFixed(1)}</Text>
      <Text className={`ml-0.5 text-white ${text}`}>({count})</Text>
    </View>
  );
}