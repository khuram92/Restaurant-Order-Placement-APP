import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "../../constants/theme";

/**
 * Shown when a restaurant offers delivery but has no map coordinates.
 * Without them the delivery-radius check, distance and "Near me" don't work.
 */
export default function NoLocationWarning({ onFix }: { onFix: () => void }) {
  return (
    <View
      className="mb-4 rounded-3xl border-2 p-4"
      style={{ borderColor: "#f5c6c1", backgroundColor: "#fdf3f2" }}>
      <View className="flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.danger }}>
          <Ionicons name="location" size={20} color={colors.white} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold" style={{ color: colors.danger }}>
            No location set
          </Text>
          <Text className="text-xs text-brand-dark">
            Delivery is on, but customers can't see the distance and the
            delivery range isn't checked.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onFix}
        className="mt-3 flex-row items-center justify-center rounded-2xl py-2.5 active:opacity-80"
        style={{ backgroundColor: colors.danger }}>
        <Ionicons name="navigate" size={16} color={colors.white} />
        <Text className="ml-1.5 font-bold text-white">Set location</Text>
      </Pressable>
    </View>
  );
}