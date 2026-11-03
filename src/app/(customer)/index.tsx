import { Pressable, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function CustomerHome() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-orange-50 px-6">
      <Text className="text-2xl font-bold text-orange-600">Welcome, {user?.name} 👋</Text>
      <Text className="text-gray-600">{user?.email ?? user?.phone}</Text>

      <Pressable onPress={signOut} className="rounded-xl bg-gray-800 px-6 py-3">
        <Text className="font-semibold text-white">Log out</Text>
      </Pressable>
    </View>
  );
}