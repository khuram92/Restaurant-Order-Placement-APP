import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { cardShadow, colors } from "../../constants/theme";
import type { MenuItem } from "../../types/menu";
import {
  ITEM_TAGS,
  itemPriceText,
  itemServesText,
} from "../../utils/menuFormat";

type Props = {
  item: MenuItem;

  canOrder: boolean;
  onPress: () => void;
};

/** One dish on the customer menu: text on the left, photo + add button on the right */
export default function MenuItemCard({ item, canOrder, onPress }: Props) {
  const soldOut = !item.isAvailable;
  const disabled = soldOut || !canOrder;
  const tags = ITEM_TAGS.filter((t) => item[t.key]);
  const serves = itemServesText(item);
  const fromPrice = item.sizes.length > 1;

    return (
    <Pressable
      onPress={onPress}
      disabled={soldOut}
      className={`mb-3 flex-1  rounded-2xl bg-white ${
        soldOut ? "opacity-[0.65]" : "active:opacity-90"
      }`}
      style={cardShadow}>
        {/* Photo (full card width) + add button */}
        <View className="h-32 w-full items-center justify-center rounded-2xl  p-1">
        <View className="h-full w-full items-center justify-center overflow-hidden rounded-xl bg-brand-soft">
          {item.image ? (
            <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Ionicons name="fast-food" size={28} color={colors.brandLight} />
          )}
          {soldOut && (
            <View className="absolute inset-0 items-center justify-center bg-black/60">
              <Text className="w-24 rotate-[-25deg] bg-black text-center text-sm font-extrabold uppercase text-white">
                Sold out
              </Text>
            </View>
          )}
        </View>
        {!soldOut && (
          <View
            className={`absolute -bottom-1.5 right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-white ${
              disabled ? "bg-mist-dark" : "bg-brand"
            }`}>
            <Ionicons name="add" size={20} color={colors.white} />
          </View>
        )}
      </View>
      {/* Text */}
      <View className="flex-1 p-3">
        {tags.length > 0 && (
          <View className="mb-1 flex-row flex-wrap">
            {tags.map((t) => (
              <View
                key={t.key}
                className="mb-1 mr-1 flex-row items-center rounded-full bg-mist-light px-2 py-0.5">
                <Ionicons name={t.icon} size={10} color={t.color} />
                <Text className="ml-1 text-[10px] font-bold text-brand">{t.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text className="text-lg font-bold text-brand-dark" numberOfLines={2}>
          {item.name}
        </Text>
        {!!item.description && (
          <Text className="mt-0.5 text-sm leading-4 text-brand-dark" numberOfLines={3}>
            {item.description}
          </Text>
        )}

        <View className="mb-3 mt-2 flex-row flex-wrap items-center">
          {fromPrice && <Text className="mr-1 text-sm font-semibold text-brand-dark">from:</Text>}
          <Text className="text-base font-extrabold text-brand">
            {fromPrice
              ? itemPriceText({ sizes: [item.sizes.reduce((a, b) => (b.price < a.price ? b : a))] })
              : itemPriceText(item)}
          </Text>
          {!!serves && (
            <View className="ml-2 flex-row items-center">
              <Ionicons name="people" size={14} color={colors.brandDark} />
              <Text className="ml-0.5 text-xs text-brand-dark">{serves.replace("Serves ", "")}</Text>
            </View>
          )}
        </View>
      </View>

      
      
    </Pressable>
  );
}
