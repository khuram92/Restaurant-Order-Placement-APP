import { Stack } from "expo-router";
import { colors } from "../../constants/theme";

// Olive header with white title and back arrow for all admin screens.
// Screens that don't want a header (e.g. the dashboard) hide it themselves.
export default function AdminLayout() {
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