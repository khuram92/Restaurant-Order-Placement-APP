import { Stack, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import ItemForm from "../../../../components/menu/ItemForm";
import { colors } from "../../../../constants/theme";
import { managerMenuApi } from "../../../../services/menuApi";

/** Manager: add or edit a menu item  (/manager/menu/item?categoryId=&itemId=) */
export default function ManagerMenuItemScreen() {
  const { categoryId, itemId } = useLocalSearchParams<{ categoryId?: string; itemId?: string }>();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: itemId ? "Edit item" : "New item" }} />
      <ItemForm
        menuApi={managerMenuApi}
        {...(categoryId && { initialCategoryId: categoryId })}
        {...(itemId && { itemId })}
        onDone={() => router.back()}
      />
    </View>
  );
}