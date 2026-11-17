import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RestaurantCard from "../../components/customer/RestaurantCard";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { getFavoriteRestaurants } from "../../services/restaurantApi";
import type { CustomerRestaurant } from "../../types/restaurant";

export default function FavoritesScreen() {
  const [restaurants, setRestaurants] = useState<CustomerRestaurant[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRestaurants(await getFavoriteRestaurants());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when coming back (a ❤️ may have changed on the restaurant page)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Un-❤️ here = remove the card from the list
  const onFavoriteChange = (id: string, favorite: boolean) => {
    if (!favorite)
      setRestaurants((prev) => prev?.filter((r) => r._id !== id) ?? prev);
  };

  const count = restaurants?.length ?? 0;
  const openNow = restaurants?.filter((r) => r.isOpenNow).length ?? 0;

  return (
    <View className="flex-1 bg-mist">
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center gap-2 px-4 pb-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">
                Favourites
              </Text>
              <Text className="text-sm text-brand-soft">
                {count
                  ? `${count} restaurant${count === 1 ? "" : "s"} · ${openNow} open now`
                  : "Restaurants you've saved"}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {loading && !restaurants ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error && !restaurants ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            className="mt-4 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={restaurants ?? []}
          keyExtractor={(r) => r._id}
          renderItem={({ item }) => (
            <RestaurantCard
              item={item}
              onFavoriteChange={(favorite) =>
                onFavoriteChange(item._id, favorite)
              }
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons name="heart" size={34} color={colors.danger} />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                No favourites yet
              </Text>
              <Text className="mt-1 px-6 text-center text-sm text-brand-light">
                Tap the heart on any restaurant to save it here for quick
                ordering.
              </Text>
              <Pressable
                onPress={() => router.navigate("/")}
                className="mt-5 flex-row items-center rounded-2xl px-5 py-3"
                style={{ backgroundColor: colors.brand }}>
                <Ionicons name="restaurant" size={16} color={colors.white} />
                <Text className="ml-1.5 font-bold text-white">
                  Browse restaurants
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}