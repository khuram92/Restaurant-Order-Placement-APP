import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

/**
 * Any address that doesn't exist for the signed-in user
 * (e.g. the app opens at "/" but you're signed in as admin or manager)
 * → send them to their own home instead of "Unmatched Route".
 */
export default function NotFound() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.mist }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.role === "superadmin") return <Redirect href="/admin" />;
  if (user.role === "manager") return <Redirect href={user.mustChangePassword ? "/change-password" : "/manager"} />;
  if (!user.profileCompleted) return <Redirect href="/complete-profile" />;
  return <Redirect href="/" />;
}