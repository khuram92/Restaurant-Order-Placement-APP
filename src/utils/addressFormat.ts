import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { AddressLabel, SavedAddress } from "../types/address";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const ADDRESS_LABEL_INFO: Record<AddressLabel, { label: string; icon: IconName }> = {
  home: { label: "Home", icon: "home" },
  work: { label: "Work", icon: "briefcase" },
  other: { label: "Other", icon: "location" },
};


export const addressTitle = (a: Pick<SavedAddress, "label" | "name">) =>
  a.label === "other" ? a.name || "Other" : ADDRESS_LABEL_INFO[a.label].label;


export const addressLine = (a: Pick<SavedAddress, "street" | "area" | "city">) =>
  [a.street, a.area, a.city].filter(Boolean).join(", ");