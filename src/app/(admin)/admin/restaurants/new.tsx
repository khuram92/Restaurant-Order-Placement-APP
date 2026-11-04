import { View } from "react-native";
import { Stack, router } from "expo-router";
import RestaurantForm from "../../../../components/admin/RestaurantForm";
import { createRestaurant } from "../../../../services/adminRestaurantApi";
import { getErrorMessage } from "../../../../lib/api";
import { colors } from "../../../../constants/theme";
import type { RestaurantInput } from "../../../../types/restaurant";

export default function NewRestaurantScreen() {
  const handleCreate = async (input: RestaurantInput) => {
    try {
      const restaurant = await createRestaurant(input);
      // Open the new restaurant; Back from there returns to the list
      router.replace({ pathname: "/admin/restaurants/[id]", params: { id: restaurant._id } });
    } catch (err) {
      return getErrorMessage(err); // shown above the Save button
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen
        options={{
          title: "New restaurant",
          headerStyle: { backgroundColor: colors.brand },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700", color: colors.white },
          contentStyle: { backgroundColor: colors.mist },
        }}
      />
      <RestaurantForm submitLabel="Create restaurant" onSubmit={handleCreate} />
    </View>
  );
}