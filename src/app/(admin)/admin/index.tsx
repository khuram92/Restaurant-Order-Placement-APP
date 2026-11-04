import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-gray-900/80">Welcome back</Text>
            <Text className="text-2xl font-extrabold text-[#4e5c4a]">
              {user?.firstName ?? "Admin"} 🛡️
            </Text>
          </View>
          <View className="rounded-full bg-[#4e5c4a] px-3 py-1">
            <Text className="text-xs font-bold uppercase text-[#e0e1df]">Super Admin</Text>
          </View>
        </View>

        {/* Menu */}
        <Text className="mb-3 mt-8 text-sm font-semibold text-gray-600">MANAGE</Text>

        <Pressable
          onPress={() => router.push("/admin/restaurants")}
          className="mb-3 flex-row items-center rounded-3xl bg-[#e0e1df] p-5"
          style={{
            shadowColor: "#EC4899",
            shadowOpacity: 0.35,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-gray-100/90">
            <Text className="text-2xl">🍽️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">Restaurants</Text>
            <Text className="text-sm text-gray-600">Create, edit and activate restaurants</Text>
          </View>
          <Text className="text-xl text-gray-800">›</Text>
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