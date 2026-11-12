import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { CartLine } from "../../types/cart";
import { money } from "../../utils/menuFormat";

function LineRow({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const extras = [
    line.sizeName,
    ...line.addOns.map((a) =>
      a.price > 0 ? `${a.name} (+${a.price})` : a.name,
    ),
  ]
    .filter(Boolean)
    .join(" · ");

  const atMin = line.quantity <= 1;
  const atMax = line.quantity >= 20;

  return (
    <View
      className="flex-row border-b py-3"
      style={{ borderColor: colors.mist }}>
      <View
        className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        {line.image ? (
          <Image
            source={{ uri: line.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="fast-food" size={22} color={colors.brandLight} />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-start">
          <Text
            className="flex-1 pr-2 text-base font-bold text-brand-dark"
            numberOfLines={2}>
            {line.name}
          </Text>
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full -top-2"
            style={{ backgroundColor: colors.mistLight }}>
            <Ionicons name="trash" size={16} color={colors.danger} />
          </Pressable>
        </View>

        {!!extras && (
          <Text className="mt-0.5 text-xs text-brand-light" numberOfLines={3}>
            {extras}
          </Text>
        )}
        {!!line.note && (
          <View className="mt-1 flex-row items-center">
            <Ionicons
              name="chatbubble-ellipses"
              size={11}
              color={colors.brandLight}
            />
            <Text
              className="ml-1 flex-1 text-xs italic text-brand-light"
              numberOfLines={2}>
              {line.note}
            </Text>
          </View>
        )}

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-brand">
            {money(line.unitPrice * line.quantity)}
          </Text>

          <View
            className="flex-row items-center rounded-full px-1"
            style={{ backgroundColor: colors.mistLight }}>
            <Pressable
              onPress={() => onChange(line.quantity - 1)}
              disabled={atMin}
              hitSlop={6}
              style={{ opacity: atMin ? 0.3 : 1 }}>
              <Ionicons name="remove-circle" size={28} color={colors.brand} />
            </Pressable>
            <Text className="mx-2 w-5 text-center text-base font-extrabold text-brand-dark">
              {line.quantity}
            </Text>
            <Pressable
              onPress={() => onChange(line.quantity + 1)}
              disabled={atMax}
              hitSlop={6}
              style={{ opacity: atMax ? 0.3 : 1 }}>
              <Ionicons name="add-circle" size={28} color={colors.brand} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { restaurant, lines, itemCount, subtotal, setQuantity, remove, clear } =
    useCart();

  const confirmClear = () =>
    Alert.alert("Empty the cart?", "All items will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Empty cart", style: "destructive", onPress: clear },
    ]);

  const belowMinimum =
    !!restaurant && restaurant.minOrder > 0 && subtotal < restaurant.minOrder;
  const tax = restaurant
    ? Math.round((subtotal * restaurant.taxRate) / 100)
    : 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.brand }}>
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.brandDark }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-xl font-extrabold text-white">
                Your cart
              </Text>
              {!!restaurant && (
                <Text
                  className="text-xs"
                  style={{ color: colors.brandSoft }}
                  numberOfLines={1}>
                  {restaurant.name} · {itemCount} item
                  {itemCount === 1 ? "" : "s"}
                </Text>
              )}
            </View>
            {lines.length > 0 && (
              <Pressable
                onPress={confirmClear}
                hitSlop={8}
                className="flex-row items-center">
                <Ionicons name="trash" size={18} color={colors.white} />
                <Text className="ml-1 text-sm font-semibold text-white">
                  Clear
                </Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>

      {lines.length === 0 || !restaurant ? (
        /* Empty */
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="h-20 w-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: colors.brandSoft }}>
            <Ionicons name="cart" size={38} color={colors.brand} />
          </View>
          <Text className="mt-4 text-lg font-bold text-brand-dark">
            Your cart is empty
          </Text>
          <Text className="mt-1 text-center text-sm text-brand-light">
            Pick a restaurant and add something tasty.
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            className="mt-5 rounded-2xl px-6 py-3"
            style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Browse restaurants</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 120,
            }}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/restaurant/[id]",
                  params: { id: restaurant._id },
                })
              }
              className="mb-4 flex-row items-center rounded-2xl bg-white p-3"
              style={cardShadow}>
              <View
                className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-xl"
                style={{ backgroundColor: colors.brandSoft }}>
                {restaurant.logo ? (
                  <Image
                    source={{ uri: restaurant.logo }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-lg font-extrabold text-brand">
                    {restaurant.name[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <Text
                className="flex-1 text-base font-bold text-brand-dark"
                numberOfLines={1}>
                {restaurant.name}
              </Text>
              <Text className="text-sm font-bold text-brand">Add more</Text>
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color={colors.brand}
                style={{ marginLeft: 4 }}
              />
            </Pressable>

            {/* Items */}
            <View
              className="mb-4 rounded-3xl bg-white px-4 pt-1"
              style={cardShadow}>
              {lines.map((line) => (
                <LineRow
                  key={line.key}
                  line={line}
                  onChange={(q) => setQuantity(line.key, q)}
                  onRemove={() => remove(line.key)}
                />
              ))}
              <View className="h-1" />
            </View>

            {/* Bill */}
            <View className="rounded-3xl bg-white p-4" style={cardShadow}>
              <Text className="mb-2 text-base font-bold text-brand-dark">
                Bill summary
              </Text>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-brand-dark">Subtotal</Text>
                <Text className="text-sm font-semibold text-brand-dark">
                  {money(subtotal)}
                </Text>
              </View>
              {restaurant.taxRate > 0 && (
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-brand-dark">
                    Tax ({restaurant.taxRate}%)
                  </Text>
                  <Text className="text-sm font-semibold text-brand-dark">
                    {money(tax)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-brand-light">Delivery fee</Text>
                <Text className="text-sm text-brand-light">
                  At checkout, if delivered
                </Text>
              </View>
              <View
                className="mt-2 flex-row justify-between border-t pt-2"
                style={{ borderColor: colors.mist }}>
                <Text className="text-base font-extrabold text-brand-dark">
                  Total
                </Text>
                <Text className="text-base font-extrabold text-brand">
                  {money(subtotal + tax)}
                </Text>
              </View>
            </View>

            {belowMinimum && (
              <View
                className="mt-4 flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: colors.white }}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.danger}
                />
                <Text
                  className="ml-2 flex-1 text-sm"
                  style={{ color: colors.danger }}>
                  Minimum order is {money(restaurant.minOrder)}. Add{" "}
                  {money(restaurant.minOrder - subtotal)} more.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Checkout bar */}
          <View
            className="absolute bottom-0 left-0 right-0 px-4 pt-3"
            style={{
              backgroundColor: colors.mist,
              paddingBottom: insets.bottom + 12,
            }}>
            <Pressable
              onPress={() => router.push("/checkout")}
              disabled={belowMinimum}
              className="flex-row items-center justify-between bg-brand-dark rounded-2xl px-5 py-4"
              style={[cardShadow]}>
              <Text className="text-base font-bold text-white">Checkout</Text>
              <View className="flex-row items-center">
                <Text className="text-base font-extrabold text-white">
                  {money(subtotal + tax)}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.white}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
