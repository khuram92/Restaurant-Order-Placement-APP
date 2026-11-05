import { Stack } from "expo-router";
import { colors } from "../../constants/theme";

// Same olive header as the admin area
export default function ManagerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700", color: colors.white },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.mist },
      }}
    />
  );
}