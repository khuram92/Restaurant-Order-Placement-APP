import type { MenuItem } from "../types/menu";

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