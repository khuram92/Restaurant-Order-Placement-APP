import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import { money } from "../../utils/menuFormat";

type Props = {
  /** Only show when the cart belongs to this restaurant (leave out to always show) */
  restaurantId?: string;
};

/** Floating "View cart" bar at the bottom of the screen */
export default function CartBar({ restaurantId }: Props) {
  const insets = useSafeAreaInsets();
  const { restaurant, itemCount, subtotal } = useCart();

  if (!restaurant || itemCount === 0) return null;
  if (restaurantId && restaurant._id !== restaurantId) return null;

  return (
    <View
      className="absolute left-4 right-4"
      style={{ bottom: insets.bottom + 12 }}>
      <Pressable
        onPress={() => router.push("/cart")}
        className="flex-row items-center rounded-2xl px-4 py-3.5 active:opacity-90"
        style={[cardShadow, { backgroundColor: colors.brandDark }]}>
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.brand }}>
          <Ionicons name="cart" size={20} color={colors.white} />
          <View
            className="absolute -right-1.5 -top-1.5 h-5 min-w-[20px] items-center justify-center rounded-full px-1"
            style={{ backgroundColor: colors.white }}>
            <Text className="text-[11px] font-extrabold text-brand-dark">
              {itemCount}
            </Text>
          </View>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-white">View cart</Text>
          {!restaurantId && (
            <Text
              className="text-xs"
              style={{ color: colors.mistDark }}
              numberOfLines={1}>
              {restaurant.name}
            </Text>
          )}
        </View>
        <Text className="text-base font-extrabold text-white">
          {money(subtotal)}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.white}
          style={{ marginLeft: 4 }}
        />
      </Pressable>
    </View>
  );
}
