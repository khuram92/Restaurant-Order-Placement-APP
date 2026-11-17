import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { setFavorite } from "../../services/restaurantApi";

const HEART_RED = colors.danger;

interface Props {
  restaurantId: string;
  isFavorite: boolean;
  /** Called after the server agrees (use it to update lists) */
  onChange?: (favorite: boolean) => void;
  /** sm = on restaurant cards, md = on the restaurant page */
  size?: "sm" | "md";
}

/**
 * ❤️ toggle. Changes straight away, then saves.
 * If saving fails it flips back and shows the error.
 */
export default function FavoriteButton({
  restaurantId,
  isFavorite,
  onChange,
  size = "sm",
}: Props) {
  const [on, setOn] = useState(isFavorite);
  const busy = useRef(false);

  // Follow the parent when the list reloads
  useEffect(() => setOn(isFavorite), [isFavorite]);

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !on;
    setOn(next);
    try {
      await setFavorite(restaurantId, next);
      onChange?.(next);
    } catch (err) {
      setOn(!next);
      Alert.alert("Couldn't update favourites", getErrorMessage(err));
    } finally {
      busy.current = false;
    }
  };

  const box = size === "md" ? "h-10 w-10" : "h-9 w-9";

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? "Remove from favourites" : "Add to favourites"}
      className={`${box} items-center justify-center rounded-full active:opacity-80`}
      style={{ backgroundColor: on ? colors.white : "rgba(44,51,41,0.45)" }}>
      <Ionicons
        name="heart"
        size={size === "md" ? 22 : 19}
        color={on ? HEART_RED : colors.white}
      />
    </Pressable>
  );
}