import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

// Placeholder: the detail screen comes in Step C
export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 items-center justify-center bg-pink-50">
      <Stack.Screen options={{ title: "Restaurant" }} />
      <Text className="text-gray-500">Details for {id} coming soon</Text>
    </View>
  );
}