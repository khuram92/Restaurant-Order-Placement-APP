import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../../global.css";

// Keep the splash screen visible until we know if the user is logged in
SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  return null;
}

function RootNavigator() {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Logged-in customers only */}
      <Stack.Protected guard={isCustomer}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>

      {/* Logged-out users only */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Later: (manager) and (admin) groups go here with their own guards */}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <RootNavigator />
    </AuthProvider>
  );
}