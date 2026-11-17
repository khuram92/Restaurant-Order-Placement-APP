import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { useCart } from "../context/CartContext";
import { getErrorMessage } from "../lib/api";
import { getReorder } from "../services/orderApi";

/**
 * "Order again": rebuilds a past order from today's menu, puts it in the cart
 * and opens the cart. Asks first if the cart already has something in it.
 */
export function useReorder() {
  const cart = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  const reorder = async (orderId: string) => {
    if (busyId) return;
    setBusyId(orderId);
    try {
      const data = await getReorder(orderId);
      const { isOpenNow, ...restaurant } = data.restaurant;
      const skippedText = data.skipped
        .map((s) => `• ${s.name} (${s.reason})`)
        .join("\n");

      if (data.lines.length === 0) {
        Alert.alert(
          "Can't order this again",
          `None of these items are available at ${restaurant.name} right now.\n\n${skippedText}`,
        );
        return;
      }

      const apply = () => {
        cart.fill(restaurant, data.lines);
        router.push("/cart");

        const notes: string[] = [];
        if (data.skipped.length) notes.push(`Not added:\n${skippedText}`);
        if (data.priceChanged)
          notes.push("Some prices have changed since last time. Your cart shows today's prices.");
        if (!isOpenNow)
          notes.push(`${restaurant.name} is closed right now. You can order once it opens.`);
        if (notes.length) Alert.alert("Added to your cart", notes.join("\n\n"));
      };

      if (cart.lines.length > 0) {
        Alert.alert(
          "Replace your cart?",
          cart.restaurant?._id === restaurant._id
            ? "Your current cart will be replaced with this order."
            : `Your cart has food from ${cart.restaurant?.name}. It will be emptied.`,
          [
            { text: "Keep cart", style: "cancel" },
            { text: "Replace", style: "destructive", onPress: apply },
          ],
        );
      } else {
        apply();
      }
    } catch (err) {
      Alert.alert("Couldn't order again", getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return { reorder, busyId };
}