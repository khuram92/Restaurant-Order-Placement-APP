import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import type { MenuApi } from "../../services/menuApi";
import type { CategoryInput, MenuCategory, MenuCategoryWithItems, MenuItem } from "../../types/menu";
// import { itemPriceText, itemServesText } from "../../utils/menuFormat";
// import CategorySheet from "./CategorySheet";

type IconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  menuApi: MenuApi;
  /** Open the item form (add when item is null) */
  onOpenItem: (categoryId: string, item: MenuItem | null) => void;
};

/** Move one element of a list up (-1) or down (+1) */
const move = <T,>(list: T[], index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy;
};

function IconButton({
  icon,
  onPress,
  disabled,
  color = colors.brand,
}: {
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      className="ml-1.5 h-8 w-8 items-center justify-center rounded-xl"
      style={{ backgroundColor: colors.brandSoft, opacity: disabled ? 0.35 : 1 }}>
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

// ---------- One item row ----------
function ItemRow({
  item,
  isFirst,
  isLast,
  busy,
  onPress,
  onToggle,
  onMove,
}: {
  item: MenuItem;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onPress: () => void;
  onToggle: (value: boolean) => void;
  onMove: (direction: -1 | 1) => void;
}) {
//   const serves = itemServesText(item);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-t py-3"
      style={{ borderColor: colors.mist, opacity: item.isAvailable ? 1 : 0.6 }}>
      {/* Photo */}
      <View
        className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Ionicons name="image" size={20} color={colors.brandLight} />
        )}
      </View>

     
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="flex-shrink text-sm font-bold text-brand-dark" numberOfLines={1}>
            {item.name}
          </Text>
          {item.isVeg && <Ionicons name="leaf" size={13} color={colors.brand} style={{ marginLeft: 4 }} />}
          {item.isSpicy && <Ionicons name="flame" size={13} color={colors.danger} style={{ marginLeft: 4 }} />}
        </View>
        {/* <Text className="mt-0.5 text-sm font-semibold text-brand">{itemPriceText(item)}</Text>
        <Text className="text-xs text-brand-light" numberOfLines={1}>
          {[
            item.sizes.length > 0 && `${item.sizes.length} sizes`,
            serves,
            item.addOnGroups.length > 0 && `${item.addOnGroups.length} add-on group${item.addOnGroups.length === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text> */}
      </View>

      {/* Sold out switch */}
      <View className="items-center">
        <Switch
          value={item.isAvailable}
          onValueChange={onToggle}
          disabled={busy}
          trackColor={{ false: colors.mistDark, true: colors.brandLight }}
          thumbColor={item.isAvailable ? colors.brand : colors.white}
        />
        <Text className="text-[10px] font-semibold" style={{ color: item.isAvailable ? colors.brand : colors.danger }}>
          {item.isAvailable ? "Available" : "Sold out"}
        </Text>
      </View>

      {/* Order */}
      <View className="ml-1">
        <Pressable onPress={() => onMove(-1)} disabled={isFirst || busy} hitSlop={4} style={{ opacity: isFirst ? 0.25 : 1 }}>
          <Ionicons name="chevron-up" size={18} color={colors.brandLight} />
        </Pressable>
        <Pressable onPress={() => onMove(1)} disabled={isLast || busy} hitSlop={4} style={{ opacity: isLast ? 0.25 : 1 }}>
          <Ionicons name="chevron-down" size={18} color={colors.brandLight} />
        </Pressable>
      </View>
    </Pressable>
  );
}


export default function MenuEditor({ menuApi, onOpenItem }: Props) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // a reorder/toggle is saving
  const [sheet, setSheet] = useState<{ open: boolean; category: MenuCategory | null }>({
    open: false,
    category: null,
  });

  const load = useCallback(async () => {
    setError("");
    try {
      setCategories(await menuApi.getMenu());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [menuApi]);

  // Reload when coming back from the item form
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Runs a change; on failure shows the error and reloads the real menu */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      Alert.alert("Couldn't save", getErrorMessage(err));
      await load();
    } finally {
      setBusy(false);
    }
  };

  // ---------- Categories ----------
  const saveCategory = async (input: CategoryInput) => {
    try {
      if (sheet.category) await menuApi.updateCategory(sheet.category._id, input);
      else await menuApi.createCategory(input);
    } catch (err) {
      throw new Error(getErrorMessage(err)); // shown inside the sheet
    }
    setSheet({ open: false, category: null });
    await load();
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const next = move(categories, index, direction);
    setCategories(next); // show it right away
    run(() => menuApi.reorderCategories(next.map((c) => c._id)));
  };

  const deleteCategory = (category: MenuCategoryWithItems) => {
    if (category.items.length > 0) {
      return Alert.alert(
        "Category has items",
        `Move or delete the ${category.items.length} item${category.items.length === 1 ? "" : "s"} in "${category.name}" first.`,
      );
    }
    Alert.alert("Delete category?", `"${category.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(async () => {
            await menuApi.deleteCategory(category._id);
            setCategories((prev) => prev.filter((c) => c._id !== category._id));
          }),
      },
    ]);
  };

  // ---------- Items ----------
  const updateItemInState = (updated: MenuItem) =>
    setCategories((prev) =>
      prev.map((c) => ({ ...c, items: c.items.map((i) => (i._id === updated._id ? updated : i)) })),
    );

  const toggleItem = (item: MenuItem, isAvailable: boolean) => {
    updateItemInState({ ...item, isAvailable });
    run(async () => {
      updateItemInState(await menuApi.setItemAvailability(item._id, isAvailable));
    });
  };

  const moveItem = (category: MenuCategoryWithItems, index: number, direction: -1 | 1) => {
    const items = move(category.items, index, direction);
    setCategories((prev) => prev.map((c) => (c._id === category._id ? { ...c, items } : c)));
    run(() => menuApi.reorderItems(category._id, items.map((i) => i._id)));
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">{error}</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            load();
          }}
          className="mt-4 rounded-2xl px-6 py-3"
          style={{ backgroundColor: colors.brand }}>
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const itemCount = categories.reduce((sum, c) => sum + c.items.length, 0);
  const soldOut = categories.reduce((sum, c) => sum + c.items.filter((i) => !i.isAvailable).length, 0);

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }>
        {categories.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="fast-food" size={30} color={colors.brand} />
            </View>
            <Text className="mt-3 text-base font-bold text-brand-dark">No menu yet</Text>
            <Text className="mt-1 text-center text-sm text-brand-light">
              Start with a category like "Burgers" or "Drinks", then add items to it.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-3 text-xs text-brand-light">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"} · {itemCount} item
              {itemCount === 1 ? "" : "s"}
              {soldOut > 0 ? ` · ${soldOut} sold out` : ""}
            </Text>

            {categories.map((category, index) => (
              <View key={category._id} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
                {/* Category header */}
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="flex-shrink text-base font-extrabold text-brand-dark" numberOfLines={1}>
                        {category.name}
                      </Text>
                      {!category.isActive && (
                        <View
                          className="ml-2 flex-row items-center rounded-full px-2 py-0.5"
                          style={{ backgroundColor: colors.mistDark }}>
                          <Ionicons name="eye-off" size={10} color={colors.text} />
                          <Text className="ml-1 text-[10px] font-bold" style={{ color: colors.text }}>
                            Hidden
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-brand-light">
                      {category.items.length} item{category.items.length === 1 ? "" : "s"}
                    </Text>
                  </View>

                  <IconButton icon="arrow-up" onPress={() => moveCategory(index, -1)} disabled={index === 0 || busy} />
                  <IconButton
                    icon="arrow-down"
                    onPress={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1 || busy}
                  />
                  <IconButton icon="create" onPress={() => setSheet({ open: true, category })} />
                  <IconButton icon="trash" color={colors.danger} onPress={() => deleteCategory(category)} />
                </View>

                {!!category.description && (
                  <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                    {category.description}
                  </Text>
                )}

                {/* Items */}
                <View className="mt-2">
                  {category.items.map((item, i) => (
                    <ItemRow
                      key={item._id}
                      item={item}
                      isFirst={i === 0}
                      isLast={i === category.items.length - 1}
                      busy={busy}
                      onPress={() => onOpenItem(category._id, item)}
                      onToggle={(value) => toggleItem(item, value)}
                      onMove={(direction) => moveItem(category, i, direction)}
                    />
                  ))}
                </View>

                <Pressable
                  onPress={() => onOpenItem(category._id, null)}
                  className="mt-2 flex-row items-center justify-center rounded-2xl border-2 border-dashed py-3"
                  style={{ borderColor: colors.mistDark }}>
                  <Ionicons name="add-circle" size={18} color={colors.brand} />
                  <Text className="ml-1.5 text-sm font-bold text-brand">Add item</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating "Add category" button */}
      <View className="absolute left-4 right-4" style={{ bottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => setSheet({ open: true, category: null })}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={[cardShadow, { backgroundColor: colors.brand }]}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text className="ml-1 text-base font-bold text-white">Add category</Text>
        </Pressable>
      </View>

      {/* <CategorySheet
        visible={sheet.open}
        category={sheet.category}
        onClose={() => setSheet({ open: false, category: null })}
        onSave={saveCategory}
      /> */}
    </View>
  );
}