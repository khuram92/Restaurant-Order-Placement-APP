import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import RestaurantForm, { restaurantToValues, type RestaurantFormImages } from "../../../../components/admin/RestaurantForm";
import { colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { getMyRestaurant, updateMyRestaurant, uploadMyRestaurantImages } from "../../../../services/managerApi";
import type { ManagerRestaurant, RestaurantInput } from "../../../../types/restaurant";

/** Manager: edit their own restaurant (same form as the Super Admin) */
export default function ManagerEditRestaurantScreen() {
  const [restaurant, setRestaurant] = useState<ManagerRestaurant | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    getMyRestaurant()
      .then(setRestaurant)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const handleSave = async (input: RestaurantInput, images: RestaurantFormImages) => {
    // 1. Save the details
    try {
      await updateMyRestaurant(input);
    } catch (err) {
      return getErrorMessage(err); // shown above the Save button
    }

    // 2. Upload a new logo/cover if picked
    if (images.logo || images.cover) {
      try {
        await uploadMyRestaurantImages(images);
      } catch (err) {
        Alert.alert("Changes saved", `But the images couldn't be uploaded: ${getErrorMessage(err)}`);
      }
    }

    router.back(); // the info screen reloads itself
  };

  const header = <Stack.Screen options={{ title: "Edit restaurant" }} />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
        {header}
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">{error}</Text>
        <Pressable onPress={load} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
        {header}
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      {header}
      <RestaurantForm
        initialValues={restaurantToValues(restaurant)}
        {...(restaurant.logo && { initialLogo: restaurant.logo })}
        {...(restaurant.coverImage && { initialCover: restaurant.coverImage })}
        submitLabel="Save changes"
        onSubmit={handleSave}
      />
    </View>
  );
}