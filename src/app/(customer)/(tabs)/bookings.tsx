import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/theme";

// Placeholder — the full "My bookings" list (Active / Past) comes in the next step
export default function BookingsScreen() {
  return (
    <View className="flex-1 bg-mist">
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="px-4 pb-6 pt-2">
            <Text className="text-2xl font-extrabold text-white">My bookings</Text>
            <Text className="text-sm text-brand-soft">Your orders and table bookings</Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
          <Ionicons name="receipt" size={34} color={colors.brandLight} />
        </View>
        <Text className="mt-4 text-base font-bold text-brand-dark">Coming next</Text>
        <Text className="mt-1 text-center text-sm text-brand-light">Your active and past orders will show here.</Text>
      </View>
    </View>
  );
}