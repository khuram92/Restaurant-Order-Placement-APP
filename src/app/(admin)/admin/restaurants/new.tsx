import { Text, View } from "react-native";
import { Stack } from "expo-router";

// Placeholder: the form comes in Step B
export default function NewRestaurantScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-pink-50">
      <Stack.Screen options={{ title: "New restaurant" }} />
      <Text className="text-gray-500">Form coming in the next step</Text>
    </View>
  );
}