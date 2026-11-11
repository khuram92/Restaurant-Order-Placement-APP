import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Alert, View } from "react-native";
import MenuEditor from "../../../../components/menu/MenuEditor";
import { colors } from "../../../../constants/theme";
import { adminMenuApi } from "../../../../services/menuApi";

/** Super Admin: menu of any restaurant (opened from the Restaurant screen) */
export default function AdminMenuScreen() {
  const { restaurantId, name } = useLocalSearchParams<{ restaurantId: string; name?: string }>();

  // Same object on every render, so the editor doesn't reload in a loop
  const menuApi = useMemo(() => adminMenuApi(String(restaurantId)), [restaurantId]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: name ? `${name} · Menu` : "Menu" }} />
      <MenuEditor
        menuApi={menuApi}
        onOpenItem={() => {
          // The Add / Edit item form comes in the next step
          Alert.alert("Coming next", "The item form is the next step.");
        }}
      />
    </View>
  );
}