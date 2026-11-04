import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-pink-50">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-pink-900/60">Welcome back</Text>
            <Text className="text-2xl font-extrabold text-pink-600">
              {user?.firstName ?? "Admin"} 🛡️
            </Text>
          </View>
          <View className="rounded-full bg-pink-100 px-3 py-1">
            <Text className="text-xs font-bold uppercase text-pink-700">Super Admin</Text>
          </View>
        </View>

        {/* Menu */}
        <Text className="mb-3 mt-8 text-sm font-semibold text-gray-500">MANAGE</Text>

        <Pressable
          onPress={() => router.push("/admin/restaurants")}
          className="mb-3 flex-row items-center rounded-3xl bg-white p-5"
          style={{
            shadowColor: "#EC4899",
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-pink-100">
            <Text className="text-2xl">🍽️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">Restaurants</Text>
            <Text className="text-sm text-gray-500">Create, edit and activate restaurants</Text>
          </View>
          <Text className="text-xl text-pink-400">›</Text>
        </Pressable>

        <View className="mb-3 flex-row items-center rounded-3xl bg-white/60 p-5">
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
            <Text className="text-2xl">👤</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-400">Managers</Text>
            <Text className="text-sm text-gray-400">Coming next</Text>
          </View>
        </View>

        <Pressable onPress={signOut} className="mt-auto mb-6 items-center rounded-2xl bg-gray-800 py-4">
          <Text className="font-semibold text-white">Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}