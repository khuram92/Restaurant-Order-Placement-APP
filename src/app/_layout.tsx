import { SplashScreen, Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import "../../global.css";
import { AuthProvider, useAuth } from "../context/AuthContext";


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
  const mustChangePassword = isManager && !!user?.mustChangePassword;

 
  useEffect(() => {
    if (isLoading) return;
    const group = segments[0];

    if (!user && group !== "(auth)") {
      router.replace("/login");
    } else if (isSuperAdmin && group !== "(admin)") {
      router.replace("/admin");
    } else if (mustChangePassword && group !== "(setup)") {
      router.replace("/change-password");
    } else if (isManager && !mustChangePassword && group !== "(manager)") {
      router.replace("/manager");
    } else if (needsProfile && group !== "(onboarding)") {
      router.replace("/complete-profile");
    } else if (isCustomer && !needsProfile && group !== "(customer)") {
      router.replace("/");
    }
  }, [user, isLoading, isSuperAdmin, isManager, mustChangePassword, needsProfile, isCustomer, segments]);

  return (
    <Stack screenOptions={{ headerShown: true }}>
      {/* Super Admin */}
      <Stack.Protected guard={isSuperAdmin}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>

      {/* Restaurant Manager (password already set) */}
      <Stack.Protected guard={isManager && !mustChangePassword}>
        <Stack.Screen name="(manager)" />
      </Stack.Protected>

      {/* Manager who must replace the temporary password */}
      <Stack.Protected guard={mustChangePassword}>
        <Stack.Screen name="(setup)" />
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