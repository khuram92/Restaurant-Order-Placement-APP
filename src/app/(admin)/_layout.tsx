import { Stack } from "expo-router";

// Native header with a pink back button for admin screens.
// Screens that don't want it (e.g. the dashboard) hide it themselves.
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#4e5c4a",
        headerTitleStyle: { fontWeight: "700", color: "#4e5c4a" },
        headerStyle: { backgroundColor: "#e0e1df" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#e0e1df" },
      }}
    />
  );
}