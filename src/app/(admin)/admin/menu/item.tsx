import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import ItemForm from "../../../../components/menu/ItemForm";
import { colors } from "../../../../constants/theme";
import { adminMenuApi } from "../../../../services/menuApi";

/** Super Admin: add or edit a menu item  (/admin/menu/item?restaurantId=&categoryId=&itemId=) */
export default function AdminMenuItemScreen() {
  const { restaurantId, categoryId, itemId } = useLocalSearchParams<{
    restaurantId: string;
    categoryId?: string;
    itemId?: string;
  }>();

  const menuApi = useMemo(() => adminMenuApi(String(restaurantId)), [restaurantId]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: itemId ? "Edit item" : "New item" }} />
      <ItemForm
        menuApi={menuApi}
        {...(categoryId && { initialCategoryId: categoryId })}
        {...(itemId && { itemId })}
        onDone={() => router.back()}
      />
    </View>
  );
}