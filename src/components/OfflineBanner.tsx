import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/theme";
import { useIsOffline } from "../lib/network";

/** Slides down "You're offline", then "Back online" for 2 seconds when the connection returns */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const [mode, setMode] = useState<"hidden" | "offline" | "back">("hidden");
  const slide = useRef(new Animated.Value(0)).current; // 0 hidden → 1 shown
  const wasOffline = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (offline) {
      wasOffline.current = true;
      setMode("offline");
    } else if (wasOffline.current) {
      wasOffline.current = false;
      setMode("back");
      timer = setTimeout(() => setMode("hidden"), 2000);
    }
    return () => clearTimeout(timer);
  }, [offline]);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: mode === "hidden" ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [mode, slide]);

  const isBack = mode === "back";
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute left-0 right-0 top-0 flex-row items-center justify-center px-4 pb-2.5"
      style={{
        paddingTop: insets.top + 8,
        backgroundColor: isBack ? colors.brand : colors.text,
        transform: [
          {
            translateY: slide.interpolate({
              inputRange: [0, 1],
              outputRange: [-(insets.top + 60), 0],
            }),
          },
        ],
        zIndex: 1000,
        elevation: 10,
      }}>
      <Ionicons
        name={isBack ? "wifi" : "cloud-offline"}
        size={16}
        color={colors.white}
      />
      <Text className="ml-2 text-sm font-bold text-white">
        {isBack ? "Back online" : "You're offline · check your internet"}
      </Text>
    </Animated.View>
  );
}