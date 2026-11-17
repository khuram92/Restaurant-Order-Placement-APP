import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { cardShadow, colors } from "../../constants/theme";
import type { CustomerRestaurant, ServiceKey } from "../../types/restaurant";
import { formatKm } from "../../utils/geo";
import FavoriteButton from "./FavoriteButton";
import RatingBadge from "./RatingBadge";

type IconName = ComponentProps<typeof Ionicons>["name"];

const SERVICES: { key: ServiceKey; label: string; icon: IconName }[] = [
  { key: "dineIn", label: "Dine-in", icon: "restaurant" },
  { key: "takeaway", label: "Takeaway", icon: "bag-handle" },
  { key: "delivery", label: "Delivery", icon: "bicycle" },
];

export default function RestaurantCard({
  item,
  onFavoriteChange,
}: {
  item: CustomerRestaurant;

  onFavoriteChange?: (favorite: boolean) => void;
}) {
  const services = SERVICES.filter((s) => item.services[s.key]);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/restaurant/[id]", params: { id: item._id } })
      }
      className="mb-4 overflow-hidden rounded-3xl bg-white active:opacity-90"
      style={cardShadow}>
      <View className="h-32 w-full bg-brand-soft">
        {item.coverImage ? (
          <Image
            source={{ uri: item.coverImage }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="restaurant" size={40} color={colors.brandLight} />
          </View>
        )}

        {!item.isOpenNow && (
          <View className="absolute inset-0 bg-[#2c3329]/35" />
        )}

        <View
          className={`absolute left-3 top-3 flex-row items-center rounded-full px-2.5 py-1 ${
            item.isOpenNow ? "bg-brand" : "bg-[#2c3329]"
          }`}>
          <Ionicons
            name={item.isOpenNow ? "time" : "moon"}
            size={12}
            color={colors.white}
          />
          <Text className="ml-1 text-xs font-bold text-white">
            {item.isOpenNow ? "Open now" : "Closed"}
          </Text>
        </View>
        <View className="absolute right-3 top-1">
          <View className="absolute right-3 top-3">
            <RatingBadge avg={item.ratingAvg} count={item.ratingCount} />
          </View>

          {onFavoriteChange && (
            <View className="absolute bottom-3 right-3">
              <FavoriteButton
                restaurantId={item._id}
                isFavorite={!!item.isFavorite}
                onChange={onFavoriteChange}
              />
            </View>
          )}
        </View>
      </View>

      <View className="absolute left-4 top-24 h-16 w-16 bg-brand-soft items-center justify-center overflow-hidden rounded-2xl border-4 border-white">
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text className="text-xl font-extrabold text-brand">
            {item.name[0]?.toUpperCase()}
          </Text>
        )}
      </View>

      <View className="px-4 pb-4 pt-1">
        <View className="ml-[60px] -mt-[18px] min-h-[30px] bg-white self-start px-3  justify-center pb-2">
          <Text
            className="text-lg font-bold text-brand-dark "
            numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {item.cuisines.length > 0 && (
          <Text className="mt-4 text-base text-brand" numberOfLines={1}>
            {item.cuisines.join(" · ")}
          </Text>
        )}

        <View className="mt-2 flex-row items-center">
          <Ionicons name="location" size={13} color={colors.brandLight} />
          <Text
            className="ml-2 flex-1 text-sm text-brand-light"
            numberOfLines={1}>
            {[item.address.area, item.address.city].filter(Boolean).join(", ")}
          </Text>
          {item.distanceKm !== undefined && (
            <View className="ml-2 flex-row items-center">
              <Ionicons name="navigate" size={12} color={colors.brand} />
              <Text className="ml-1 text-sm font-bold text-brand">
                {formatKm(item.distanceKm)}
              </Text>
            </View>
          )}
        </View>
        <View className="mt-2 flex-row items-center">
          <Ionicons name="call" size={13} color={colors.brandLight} />
          <Text
            className="ml-2 flex-1 text-sm text-brand-light"
            numberOfLines={1}>
            {item.phone}
          </Text>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
                      {item.deliversToYou === true && (
            <View
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.brand }}>
              <Ionicons name="checkmark-circle" size={11} color={colors.white} />
              <Text className="ml-1 text-xs font-bold text-white">
                Delivers to you
              </Text>
            </View>
          )}
          {item.deliversToYou === false && item.services.delivery && (
            <View
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: "#fdecea" }}>
              <Ionicons name="close-circle" size={11} color={colors.danger} />
              <Text className="ml-1 text-xs font-bold" style={{ color: colors.danger }}>
                Too far to deliver
              </Text>
            </View>
          )}
          {services.map((s) => (
            <View
              key={s.key}
              className="flex-row items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name={s.icon} size={11} color={colors.brand} />
              <Text className="ml-1 text-xs font-semibold text-brand">
                {s.label}
              </Text>
            </View>
          ))}
          {item.services.delivery && (
            <Text className="ml-1 text-xs text-brand">
              {item.deliveryFee > 0
                ? `Rs ${item.deliveryFee} delivery`
                : "Free delivery"}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
