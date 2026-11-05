import { SplashScreen, Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import "../../global.css";
import { AuthProvider, useAuth } from "../context/AuthContext";

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
  const segments = useSegments();

  const isSuperAdmin = user?.role === "superadmin";
  const isCustomer = user?.role === "customer";
  const isManager = user?.role === "manager";
  const needsProfile = isCustomer && !user?.profileCompleted;

  // Send the user to the right group whenever their state changes
  useEffect(() => {
    if (isLoading) return;
    const group = segments[0];

    if (!user && group !== "(auth)") {
      router.replace("/login");
    } else if (isSuperAdmin && group !== "(admin)") {
      router.replace("/admin");
    } else if (isManager && group !== "(manager)") {
      router.replace("/manager");
    } else if (needsProfile && group !== "(onboarding)") {
      router.replace("/complete-profile");
    } else if (isCustomer && !needsProfile && group !== "(customer)") {
      router.replace("/");
    }
  }, [user, isLoading, isSuperAdmin,isManager, needsProfile, isCustomer, segments]);

  return (
    <Stack screenOptions={{ headerShown: true }}>
      {/* Super Admin */}
      <Stack.Protected guard={isSuperAdmin}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>

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

            {/* Restaurant Manager */}
      <Stack.Protected guard={isManager}>
        <Stack.Screen name="(manager)" />
      </Stack.Protected>
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
