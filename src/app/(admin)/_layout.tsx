import { Stack } from "expo-router";

// Native header with a pink back button for admin screens.
// Screens that don't want it (e.g. the dashboard) hide it themselves.
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#EC4899",
        headerTitleStyle: { fontWeight: "700", color: "#831843" },
        headerStyle: { backgroundColor: "#FFF1F5" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#FFF1F5" },
      }}
    />
  );
}