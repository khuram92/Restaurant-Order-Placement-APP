// import { useEffect, useState } from "react";
// import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { Stack, router, useLocalSearchParams } from "expo-router";
// import RestaurantForm, {
//   restaurantToValues,
//   type RestaurantFormImages,
// } from "../../../../../components/admin/RestaurantForm";
// import { getRestaurant, updateRestaurant, uploadRestaurantImages } from "../../../../../services/adminRestaurantApi";
// import { getErrorMessage } from "../../../../../lib/api";
// import { colors } from "../../../../../constants/theme";
// import type { Restaurant, RestaurantInput } from "../../../../../types/restaurant";

// export default function EditRestaurantScreen() {
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
//   const [error, setError] = useState("");

//   const load = () => {
//     setError("");
//     getRestaurant(id)
//       .then(setRestaurant)
//       .catch((err) => setError(getErrorMessage(err)));
//   };

//   useEffect(load, [id]);

//   const handleSave = async (input: RestaurantInput, images: RestaurantFormImages) => {
//     // 1. Save the details
//     try {
//       await updateRestaurant(id, input);
//     } catch (err) {
//       return getErrorMessage(err); // shown above the Save button
//     }

//     // 2. Upload new logo/cover if any were picked
//     if (images.logo || images.cover) {
//       try {
//         await uploadRestaurantImages(id, images);
//       } catch (err) {
//         Alert.alert("Changes saved", `But the images couldn't be uploaded: ${getErrorMessage(err)}`);
//       }
//     }

//     // 3. Back to the detail screen (it reloads itself)
//     router.back();
//   };

//   const header = (
//     <Stack.Screen
//       options={{
//         title: "Edit restaurant",
//         headerStyle: { backgroundColor: colors.brand },
//         headerTintColor: colors.white,
//         headerTitleStyle: { fontWeight: "700", color: colors.white },
//         contentStyle: { backgroundColor: colors.mist },
//       }}
//     />
//   );

//   if (error) {
//     return (
//       <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.mist }}>
//         {header}
//         <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
//         <Text className="mt-3 text-center text-brand-dark">{error}</Text>
//         <Pressable onPress={load} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
//           <Text className="font-bold text-white">Try again</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   if (!restaurant) {
//     return (
//       <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
//         {header}
//         <ActivityIndicator size="large" color={colors.brand} />
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1" style={{ backgroundColor: colors.mist }}>
//       {header}
//       <RestaurantForm
//         initialValues={restaurantToValues(restaurant)}
//         {...(restaurant.logo && { initialLogo: restaurant.logo })}
//         {...(restaurant.coverImage && { initialCover: restaurant.coverImage })}
//         submitLabel="Save changes"
//         onSubmit={handleSave}
//       />
//     </View>
//   );
// }