import { Stack, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import MenuEditor from "../../../../components/menu/MenuEditor";
import { colors } from "../../../../constants/theme";
import { managerMenuApi } from "../../../../services/menuApi";

/** Manager: their own restaurant's menu */
export default function ManagerMenuScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: name ? `${name} · Menu` : "Menu" }} />
      <MenuEditor
        menuApi={managerMenuApi}
        onOpenItem={(categoryId, item) =>
          router.push({
            pathname: "/manager/menu/item",
            params: { categoryId, ...(item && { itemId: item._id }) },
          })
        }
      />
    </View>
  );
}