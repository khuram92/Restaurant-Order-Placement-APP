import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { colors } from "../../constants/theme";

export const STAR_GOLD = "#e8a33d";

/** ★★★★☆ — read-only (supports halves: 4.5) */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => {
        const name = value >= n ? "star" : value >= n - 0.5 ? "star-half" : "star";
        const filled = value >= n - 0.5;
        return <Ionicons key={n} name={name} size={size} color={filled ? STAR_GOLD : colors.mistDark} style={{ marginRight: 1 }} />;
      })}
    </View>
  );
}


export function StarInput({ value, onChange, size = 40 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View className="flex-row justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} className="mx-1">
          <Ionicons name="star" size={size} color={value >= n ? STAR_GOLD : colors.mistDark} />
        </Pressable>
      ))}
    </View>
  );
}

export const RATING_WORDS = ["", "Terrible", "Bad", "Okay", "Good", "Excellent"];