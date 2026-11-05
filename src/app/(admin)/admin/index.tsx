import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { colors, cardShadow } from "../../../constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function MenuCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="mb-3 flex-row items-center rounded-3xl bg-white p-5"
      style={[cardShadow, { opacity: disabled ? 0.55 : 1 }]}
    >
      <View
        className="mr-4 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: disabled ? colors.mistDark : colors.brand }}
      >
        <Ionicons name={icon} size={24} color={colors.white} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-brand-dark">{title}</Text>
        <Text className="text-sm text-brand-light">{subtitle}</Text>
      </View>
      {!disabled && <Ionicons name="chevron-forward" size={20} color={colors.brandLight} />}
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Olive top area */}
      <View style={{ backgroundColor: colors.brand }}>
        <SafeAreaView edges={["top"]}>
          <View className="px-6 pb-8 pt-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: colors.brandDark }}>
                <Ionicons name="shield-checkmark" size={14} color={colors.white} />
                <Text className="ml-1 text-xs font-bold uppercase text-white">Super Admin</Text>
              </View>
              <Pressable onPress={signOut} hitSlop={8} className="flex-row items-center">
                <Ionicons name="log-out" size={20} color={colors.white} />
                <Text className="ml-1 text-sm font-semibold text-white">Log out</Text>
              </Pressable>
            </View>

            <Text className="mt-6 text-sm" style={{ color: colors.brandSoft }}>
              Welcome back
            </Text>
            <Text className="text-3xl font-extrabold text-white">{user?.firstName ?? "Admin"}</Text>
            {!!user?.email && (
              <Text className="mt-1 text-sm" style={{ color: colors.brandSoft }}>
                {user.email}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Menu */}
      <View className="-mt-4 flex-1 rounded-t-3xl px-5 pt-6" style={{ backgroundColor: colors.mist }}>
        <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-light">Manage</Text>

        <MenuCard
          icon="restaurant"
          title="Restaurants"
          subtitle="Create, edit and activate restaurants"
          onPress={() => router.push("/admin/restaurants")}
        />
        <MenuCard icon="people" title="Managers" subtitle="Coming next" disabled />
      </View>
    </View>
  );
}