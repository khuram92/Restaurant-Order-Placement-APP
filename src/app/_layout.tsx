import { useEffect } from "react";
import { SplashScreen, Stack, router, useSegments } from "expo-router";
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
  const { user, isLoading } = useAuth();
  const segments = useSegments(); // e.g. ["(auth)", "verify-otp"]

  const isCustomer = user?.role === "customer";
  const needsProfile = isCustomer && !user?.profileCompleted;

  // Send the user to the right group whenever their state changes
  useEffect(() => {
    if (isLoading) return;
    const group = segments[0];

    if (!user && group !== "(auth)") {
      router.replace("/login");
    } else if (needsProfile && group !== "(onboarding)") {
      router.replace("/complete-profile");
    } else if (isCustomer && !needsProfile && group !== "(customer)") {
      router.replace("/");
    }
  }, [user, isLoading, needsProfile, isCustomer, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Customers with a complete profile */}
      <Stack.Protected guard={isCustomer && !needsProfile}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>

      {/* Customers who still need to fill their profile */}
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      {/* Logged-out users */}
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