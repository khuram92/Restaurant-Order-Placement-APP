import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../constants/theme";
import type { MenuItem } from "../types/menu";

export type ItemTagKey = "isBestseller" | "isChefSpecial" | "isNew" | "isSpicy";

/** Item tags, in the order they're shown (form chips, menu rows, customer cards) */
export const ITEM_TAGS: {
  key: ItemTagKey;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  color: string;
}[] = [
  { key: "isBestseller", label: "Bestseller", icon: "star", color: colors.brand },
  { key: "isChefSpecial", label: "Chef's special", icon: "ribbon", color: colors.brand },
  { key: "isNew", label: "New", icon: "sparkles", color: colors.brand },
  { key: "isSpicy", label: "Spicy", icon: "flame", color: colors.danger },
];

export const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;


export const itemPriceText = (item: Pick<MenuItem, "price" | "sizes">) => {
  if (item.sizes.length === 0) return item.price !== undefined ? money(item.price) : "";
  const prices = item.sizes.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} – ${max.toLocaleString("en-PK")}`;
};

export const itemServesText = (item: Pick<MenuItem, "serves" | "sizes">) => {
  const values =
    item.sizes.length > 0
      ? item.sizes.map((s) => s.serves).filter((v): v is number => !!v)
      : item.serves
        ? [item.serves]
        : [];
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `Serves ${min}` : `Serves ${min}–${max}`;
};