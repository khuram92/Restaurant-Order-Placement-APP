import { Alert, View } from "react-native";
import { Stack, router } from "expo-router";
import RestaurantForm, { type RestaurantFormImages } from "../../../../components/admin/RestaurantForm";
import { createRestaurant, uploadRestaurantImages } from "../../../../services/adminRestaurantApi";
import { getErrorMessage } from "../../../../lib/api";
import { colors } from "../../../../constants/theme";
import type { RestaurantInput } from "../../../../types/restaurant";

export default function NewRestaurantScreen() {
  const handleCreate = async (input: RestaurantInput, images: RestaurantFormImages) => {
    // 1. Create the restaurant (we need its id for the images)
    let restaurantId: string;
    try {
      const restaurant = await createRestaurant(input);
      restaurantId = restaurant._id;
    } catch (err) {
      return getErrorMessage(err); // shown above the Save button
    }

    // 2. Upload logo/cover if any were picked
    if (images.logo || images.cover) {
      try {
        await uploadRestaurantImages(restaurantId, images);
      } catch (err) {
        // The restaurant exists; images can be added again from its page
        Alert.alert("Restaurant created", `But the images couldn't be uploaded: ${getErrorMessage(err)}`);
      }
    }

    // 3. Open the new restaurant; Back from there returns to the list
    router.replace({ pathname: "/admin/restaurants/[id]", params: { id: restaurantId } });
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