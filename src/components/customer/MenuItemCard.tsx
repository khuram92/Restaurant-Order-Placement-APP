import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { cardShadow, colors } from "../../constants/theme";
import type { MenuItem } from "../../types/menu";
import { ITEM_TAGS, itemPriceText, itemServesText } from "../../utils/menuFormat";

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
      className="mb-3 flex-row rounded-3xl bg-white p-3"
      style={({ pressed }) => [cardShadow, { opacity: soldOut ? 0.55 : pressed ? 0.9 : 1 }]}>
    
      <View className="flex-1 pr-3">
        {tags.length > 0 && (
          <View className="mb-1 flex-row flex-wrap">
            {tags.map((t) => (
              <View key={t.key} className="mb-1 mr-1 flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: colors.brandSoft }}>
                <Ionicons name={t.icon} size={10} color={t.color} />
                <Text className="ml-1 text-[10px] font-bold" style={{ color: t.color }}>
                  {t.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text className="text-base font-bold text-brand-dark" numberOfLines={2}>
          {item.name}
        </Text>
        {!!item.description && (
          <Text className="mt-0.5 text-xs leading-4" style={{ color: colors.textMuted }} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View className="mt-2 flex-row flex-wrap items-center">
          {fromPrice && <Text className="mr-1 text-xs text-brand-light">from</Text>}
          <Text className="text-base font-extrabold text-brand">
            {fromPrice ? itemPriceText({ sizes: [item.sizes.reduce((a, b) => (b.price < a.price ? b : a))] }) : itemPriceText(item)}
          </Text>
          {!!serves && (
            <View className="ml-2 flex-row items-center">
              <Ionicons name="people" size={12} color={colors.brandLight} />
              <Text className="ml-0.5 text-xs text-brand-light">{serves.replace("Serves ", "")}</Text>
            </View>
          )}
        </View>
      </View>

     
      <View className="h-24 w-24">
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Ionicons name="fast-food" size={28} color={colors.brandLight} />
          )}
          {soldOut && (
            <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(44,51,41,0.55)" }}>
              <Text className="text-xs font-extrabold uppercase text-white">Sold out</Text>
            </View>
          )}
        </View>
        {!soldOut && (
          <View
            className="absolute -bottom-1.5 -right-1.5 h-9 w-9 items-center justify-center rounded-full border-2 border-white"
            style={{ backgroundColor: disabled ? colors.mistDark : colors.brand }}>
            <Ionicons name="add" size={20} color={colors.white} />
          </View>
        )}
      </View>
    </Pressable>
  );
}