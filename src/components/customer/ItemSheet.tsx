import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import type { CartAddOn, CartSelection } from "../../types/cart";
import type { AddOnGroup, MenuItem } from "../../types/menu";
import { ITEM_TAGS, money } from "../../utils/menuFormat";

type Props = {
  item: MenuItem | null;
  visible: boolean;
  /** false when the restaurant is closed: options can be viewed but not added */
  canOrder: boolean;
  onClose: () => void;
  onAdd: (selection: CartSelection) => void;
};

/** "Pick 1" / "Pick up to 3" / "Pick 1 to 3" */
const groupHint = (g: AddOnGroup) => {
  if (g.minSelect === 0)
    return g.maxSelect === 1
      ? "Optional · pick 1"
      : `Optional · up to ${g.maxSelect}`;
  if (g.minSelect === g.maxSelect) return `Pick ${g.minSelect}`;
  return `Pick ${g.minSelect} to ${g.maxSelect}`;
};

export default function ItemSheet({
  item,
  visible,
  canOrder,
  onClose,
  onAdd,
}: Props) {
  const insets = useSafeAreaInsets();

  const [sizeId, setSizeId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string[]>>({}); // groupId → optionIds
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  // Reset each time a new item opens (first size preselected)
  useEffect(() => {
    if (!visible || !item) return;
    setSizeId(item.sizes[0]?._id ?? null);
    setPicked({});
    setQuantity(1);
    setNote("");
    setShowErrors(false);
    dragY.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?._id]);

  // ---------- Drag down to close ----------
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 1) onClose();
        else
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
      },
    }),
  ).current;

  if (!item) return null;

  // ---------- Choosing ----------
  const toggleOption = (group: AddOnGroup, optionId: string) => {
    const groupId = group._id!;
    setPicked((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId))
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (group.maxSelect === 1) return { ...prev, [groupId]: [optionId] }; // radio: replace
      if (current.length >= group.maxSelect) return prev; // full
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  // ---------- Price ----------
  const size = item.sizes.find((s) => s._id === sizeId);
  const basePrice =
    item.sizes.length > 0 ? (size?.price ?? 0) : (item.price ?? 0);

  const chosenAddOns: CartAddOn[] = item.addOnGroups.flatMap((g) =>
    (picked[g._id!] ?? []).flatMap((optionId) => {
      const o = g.options.find((x) => x._id === optionId);
      return o
        ? [
            {
              groupId: g._id!,
              groupName: g.name,
              optionId,
              name: o.name,
              price: o.price,
            },
          ]
        : [];
    }),
  );
  const unitPrice =
    basePrice + chosenAddOns.reduce((sum, a) => sum + a.price, 0);
  const total = unitPrice * quantity;

  // ---------- Checks ----------
  const missingGroups = item.addOnGroups.filter(
    (g) => (picked[g._id!]?.length ?? 0) < g.minSelect,
  );
  const needsSize = item.sizes.length > 0 && !size;
  const ready = !needsSize && missingGroups.length === 0;

  const add = () => {
    if (!ready) return setShowErrors(true);
    onAdd({
      itemId: item._id,
      name: item.name,
      ...(item.image && { image: item.image }),
      ...(size?._id && { sizeId: size._id, sizeName: size.name }),
      basePrice,
      addOns: chosenAddOns,
      unitPrice,
      quantity,
      ...(note.trim() && { note: note.trim() }),
    });
  };

  const tags = ITEM_TAGS.filter((t) => item[t.key]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(44,51,41,0.45)" }}
          onPress={onClose}
        />

        <Animated.View
          style={{
            maxHeight: "92%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            backgroundColor: "white",
            transform: [{ translateY: dragY }],
          }}>
          {/* Photo + drag area */}
          <View {...panResponder.panHandlers}>
            <View
              className="h-52 w-full items-center justify-center"
              style={{ backgroundColor: colors.brandSoft }}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons
                  name="fast-food"
                  size={56}
                  color={colors.brandLight}
                />
              )}
              <View className="absolute left-0 right-0 top-2 items-center">
                <View
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
                />
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="absolute right-3 top-4 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(59,70,56,0.75)" }}>
                <Ionicons name="close" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Title */}
            {tags.length > 0 && (
              <View className="mb-1.5 flex-row flex-wrap">
                {tags.map((t) => (
                  <View
                    key={t.key}
                    className="mb-1 mr-1 flex-row items-center rounded-full bg-mist-light px-2 py-0.5">
                    <Ionicons name={t.icon} size={11} color={t.color} />
                    <Text className="ml-1 text-sm font-bold text-brand">
                      {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text className="text-2xl font-extrabold text-brand-dark">
              {item.name}
            </Text>
            {!!item.description && (
              <Text className="mt-1 text-sm leading-5 text-brand-dark">
                {item.description}
              </Text>
            )}
            {item.sizes.length === 0 && (
              <View className="mt-2 flex-row items-center">
                <Text className="text-lg font-extrabold text-brand">
                  {money(item.price ?? 0)}
                </Text>
                {!!item.serves && (
                  <View className="ml-2 flex-row items-center">
                    <Ionicons
                      name="people"
                      size={14}
                      color={colors.brandDark}
                    />
                    <Text className="ml-1 text-xs text-brand-dark">
                      Serves {item.serves}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Sizes */}
            {item.sizes.length > 0 && (
              <View className="mt-5">
                <View className="mb-2 flex-row items-center">
                  <Text className="flex-1 text-base font-bold text-brand-dark">
                    Choose a size
                  </Text>
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: colors.brandSoft }}>
                    <Text className="text-[10px] font-bold uppercase text-brand">
                      Required
                    </Text>
                  </View>
                </View>
                {item.sizes.map((s) => {
                  const selected = s._id === sizeId;
                  return (
                    <Pressable
                      key={s._id}
                      onPress={() => setSizeId(s._id ?? null)}
                      className="mb-2 flex-row items-center rounded-2xl border-2 px-4 py-3"
                      style={{
                        borderColor: selected ? colors.brand : colors.mist,
                        backgroundColor: selected
                          ? colors.brandSoft
                          : colors.white,
                      }}>
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={22}
                        color={selected ? colors.brand : colors.mistDark}
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-brand-dark">
                          {s.name}
                        </Text>
                        {!!s.serves && (
                          <Text className="text-xs text-brand-light">
                            Serves {s.serves}
                          </Text>
                        )}
                      </View>
                      <Text className="text-base font-bold text-brand">
                        {money(s.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Add-on groups */}
            {item.addOnGroups.map((group) => {
              const chosen = picked[group._id!] ?? [];
              const missing = chosen.length < group.minSelect;
              const full =
                group.maxSelect > 1 && chosen.length >= group.maxSelect;
              const radio = group.maxSelect === 1;
              return (
                <View key={group._id} className="mt-5">
                  <View className="mb-2 flex-row justify-between items-center">
                    <Text className="text-base font-bold text-brand-dark">
                      {group.name}
                    </Text>
                    <Text className="text-xs right-1 text-brand-light">
                      {groupHint(group)}
                    </Text>

                    {group.minSelect > 0 && (
                      <View
                        className="flex-row items-center rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: missing
                            ? showErrors
                              ? colors.danger
                              : colors.brandSoft
                            : colors.brand,
                        }}>
                        {!missing && (
                          <Ionicons
                            name="checkmark"
                            size={11}
                            color={colors.white}
                          />
                        )}
                        <Text
                          className="ml-0.5 text-[10px] font-bold uppercase"
                          style={{
                            color: missing
                              ? showErrors
                                ? colors.white
                                : colors.brand
                              : colors.white,
                          }}>
                          {missing ? "Required" : "Done"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {group.options.map((option) => {
                    const selected = chosen.includes(option._id!);
                    const disabled = !option.isAvailable || (full && !selected);
                    const icon = radio
                      ? selected
                        ? "radio-button-on"
                        : "radio-button-off"
                      : selected
                        ? "checkbox"
                        : "square";
                    return (
                      <Pressable
                        key={option._id}
                        onPress={() => toggleOption(group, option._id!)}
                        disabled={disabled}
                        className="mb-2 flex-row items-center rounded-2xl border-2 px-4 py-3"
                        style={{
                          borderColor: selected ? colors.brand : colors.mist,
                          backgroundColor: selected
                            ? colors.brandSoft
                            : colors.white,
                          opacity: disabled ? 0.45 : 1,
                        }}>
                        <Ionicons
                          name={icon}
                          size={22}
                          color={selected ? colors.brand : colors.mistDark}
                        />
                        <Text className="ml-3 flex-1 text-base text-brand-dark">
                          {option.name}
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color: option.isAvailable
                              ? colors.brand
                              : colors.danger,
                          }}>
                          {!option.isAvailable
                            ? "Sold out"
                            : option.price > 0
                              ? `+${money(option.price)}`
                              : "Free"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            {/* Special instructions */}
            <View className="mt-5">
              <Text className="mb-2 text-base font-bold text-brand-dark">
                Special instructions
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. No onions, extra spicy"
                placeholderTextColor={colors.placeholder}
                maxLength={150}
                multiline
                selectionColor={colors.brand}
                className="min-h-[64px] rounded-2xl border-2 px-4 py-3 text-base"
                style={{
                  borderColor: colors.mist,
                  backgroundColor: colors.mistLight,
                  color: colors.text,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </ScrollView>

          {/* Bottom bar: quantity + add */}
          <View
            className="border-t px-5 pt-3"
            style={{
              borderColor: colors.mist,
              backgroundColor: colors.white,
              paddingBottom: insets.bottom + 12,
            }}>
            {showErrors && !ready && (
              <View className="mb-2 flex-row items-center">
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text
                  className="ml-1.5 flex-1 text-sm"
                  style={{ color: colors.danger }}>
                  {needsSize
                    ? "Choose a size"
                    : `Choose: ${missingGroups.map((g) => g.name).join(", ")}`}
                </Text>
              </View>
            )}
            {!canOrder && (
              <Text
                className="mb-2 text-center text-sm font-semibold"
                style={{ color: colors.danger }}>
                The restaurant is closed right now
              </Text>
            )}
            <View className="flex-row items-center">
              <View
                className="mr-3 flex-row items-center rounded-2xl px-1 py-1"
                style={{ backgroundColor: colors.mistLight }}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  hitSlop={6}
                  style={{ opacity: quantity <= 1 ? 0.3 : 1 }}>
                  <Ionicons
                    name="remove-circle"
                    size={34}
                    color={colors.brand}
                  />
                </Pressable>
                <Text className="mx-2 w-6 text-center text-lg font-extrabold text-brand-dark">
                  {quantity}
                </Text>
                <Pressable
                  onPress={() => setQuantity((q) => Math.min(20, q + 1))}
                  disabled={quantity >= 20}
                  hitSlop={6}
                  style={{ opacity: quantity >= 20 ? 0.3 : 1 }}>
                  <Ionicons name="add-circle" size={34} color={colors.brand} />
                </Pressable>
              </View>

              <Pressable
                onPress={add}
                disabled={!canOrder}
                className="flex-1 flex-row items-center justify-between rounded-2xl px-4 py-4"
                style={{
                  backgroundColor:
                    canOrder && ready ? colors.brand : colors.mistDark,
                }}>
                <Text className="text-base font-bold text-white">
                  Add to cart
                </Text>
                <Text className="text-base font-extrabold text-white">
                  {money(total)}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
