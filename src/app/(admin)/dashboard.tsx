import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-pink-50">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-5xl">🛡️</Text>
        <Text className="text-2xl font-extrabold text-pink-600">
          Welcome, {user?.firstName ?? "Admin"}
        </Text>
        <Text className="text-gray-600">{user?.email}</Text>
        <View className="rounded-full bg-pink-100 px-4 py-1">
          <Text className="text-xs font-bold uppercase text-pink-700">{user?.role}</Text>
        </View>
        <Text className="mt-2 text-center text-gray-500">
          Restaurants and managers will be managed from here.
        </Text>

        <Pressable onPress={signOut} className="mt-6 rounded-2xl bg-gray-800 px-6 py-3">
          <Text className="font-semibold text-white">Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}