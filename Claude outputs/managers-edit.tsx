import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import ManagerForm, { managerToValues } from "../../../../../components/admin/ManagerForm";
import { getManager, updateManager } from "../../../../../services/adminManagerApi";
import { getErrorMessage } from "../../../../../lib/api";
import { colors } from "../../../../../constants/theme";
import type { Manager, ManagerInput } from "../../../../../types/manager";

export default function EditManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [manager, setManager] = useState<Manager | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    getManager(id)
      .then(setManager)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, [id]);

  const handleSave = async (input: ManagerInput) => {
    try {
      await updateManager(id, input); // phone "" removes it
      router.back(); // details reload themselves
    } catch (err) {
      return getErrorMessage(err);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "Edit manager" }} />
      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
          <Text className="mt-3 text-center text-brand-dark">{error}</Text>
          <Pressable onPress={load} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : !manager ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ManagerForm
          initialValues={managerToValues(manager)}
          managerId={manager._id}
          submitLabel="Save changes"
          note="Changing the restaurant moves this manager there; the old restaurant becomes free."
          onSubmit={handleSave}
        />
      )}
    </View>
  );
}
