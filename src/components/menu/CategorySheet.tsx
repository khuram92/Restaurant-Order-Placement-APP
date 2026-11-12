import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import type { CategoryInput, MenuCategory } from "../../types/menu";

type Props = {
  visible: boolean;
  /** null = adding a new category */
  category: MenuCategory | null;
  /** The restaurant's cuisines, shown as quick-pick chips */
  cuisines: string[];
  /** Names already used by other categories (their chips are marked "Added") */
  usedNames: string[];
  onClose: () => void;
  onSave: (input: CategoryInput) => Promise<void>;
};

function Chip({
  label,
  selected,
  muted,
  onPress,
}: {
  label: string;
  selected: boolean;
  muted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 mr-2 flex-row items-center rounded-full px-3 py-2"
      style={{
        backgroundColor: selected ? colors.brand : colors.brandSoft,
        opacity: muted && !selected ? 0.55 : 1,
      }}>
      {selected && (
        <Ionicons
          name="checkmark"
          size={14}
          color={colors.white}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        className="text-sm font-semibold"
        style={{ color: selected ? colors.white : colors.brand }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Bottom sheet to add or edit a category */
export default function CategorySheet({
  visible,
  category,
  cuisines,
  usedNames,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState(""); // "" = no cuisine link
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"name" | "description" | null>(null);

  // Fill the form each time the sheet opens
  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setCuisine(category?.cuisine ?? "");
    setIsActive(category?.isActive ?? true);
    setError("");
    setSaving(false);
  }, [visible, category]);

  const isUsed = (label: string) =>
    usedNames.some(
      (n) =>
        n.toLowerCase() === label.toLowerCase() &&
        n.toLowerCase() !== category?.name.toLowerCase(),
    );

  /** Tap a cuisine: link it, and use it as the name if the name is empty or was the previous cuisine */
  const pickCuisine = (value: string) => {
    if (cuisine === value) {
      setCuisine("");
      return;
    }
    if (!name.trim() || name.trim().toLowerCase() === cuisine.toLowerCase())
      setName(value);
    setCuisine(value);
    if (error) setError("");
  };

  const save = async () => {
    if (!name.trim()) return setError("Enter a category name");
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        cuisine,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
    }
  };

  const inputStyle = (field: "name" | "description") => ({
    borderColor: focused === field ? colors.brand : colors.mistDark,
    backgroundColor: focused === field ? colors.white : colors.mistLight,
    color: colors.text,
  });

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

        <View
          className="max-h-[90%] rounded-t-3xl bg-white pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-3 items-center">
            <View
              className="h-1.5 w-12 rounded-full"
              style={{ backgroundColor: colors.mistDark }}
            />
          </View>

          <View className="mb-2 flex-row items-center justify-between px-5">
            <Text className="text-xl font-extrabold text-brand-dark">
              {category ? "Edit category" : "New category"}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="close" size={20} color={colors.brand} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {cuisines.length > 0 ? (
              <>
                <View className="mb-2 flex-row justify-between">
                  <Text className="text-sm font-semibold text-brand-dark">
                    Cuisine
                  </Text>
                  <Text className="text-xs text-brand-light">
                    Optional · tap to use as name
                  </Text>
                </View>
                <View className="mb-2 flex-row flex-wrap">
                  {cuisines.map((c) => (
                    <Chip
                      key={c}
                      label={isUsed(c) && cuisine !== c ? `${c} · added` : c}
                      selected={cuisine === c}
                      muted={isUsed(c)}
                      onPress={() => pickCuisine(c)}
                    />
                  ))}
                  <Chip
                    label="No cuisine"
                    selected={cuisine === ""}
                    onPress={() => setCuisine("")}
                  />
                </View>
              </>
            ) : (
              <View
                className="mb-4 flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: colors.mistLight }}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={colors.brandLight}
                />
                <Text className="ml-2 flex-1 text-xs text-brand-light">
                  Add cuisines in the restaurant settings to link categories to
                  them.
                </Text>
              </View>
            )}

            <Text className="mb-2 text-sm font-semibold text-brand-dark">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError("");
              }}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              placeholder={
                cuisine
                  ? `e.g. ${cuisine} or ${cuisine} Starters`
                  : "e.g. Drinks, Deals, Desserts"
              }
              placeholderTextColor={colors.placeholder}
              maxLength={40}
              selectionColor={colors.brand}
              className="mb-4 rounded-2xl border-2 px-4 py-3.5 text-base"
              style={inputStyle("name")}
            />

            <View className="mb-2 flex-row justify-between">
              <Text className="text-sm font-semibold text-brand-dark">
                Description
              </Text>
              <Text className="text-xs text-brand-light">Optional</Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocused("description")}
              onBlur={() => setFocused(null)}
              placeholder="e.g. All burgers come with fries"
              placeholderTextColor={colors.placeholder}
              maxLength={200}
              multiline
              selectionColor={colors.brand}
              className="mb-4 min-h-[72px] rounded-2xl border-2 px-4 py-3 text-base"
              style={[inputStyle("description"), { textAlignVertical: "top" }]}
            />

            <Pressable
              onPress={() => setIsActive((v) => !v)}
              className="mb-4 flex-row items-center rounded-2xl px-4 py-3"
              style={{ backgroundColor: colors.mistLight }}>
              <Ionicons
                name={isActive ? "eye" : "eye-off"}
                size={18}
                color={colors.brand}
              />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-brand-dark">
                  Show to customers
                </Text>
                <Text className="text-xs text-brand-light">
                  {isActive
                    ? "Customers can see this category"
                    : "Hidden from customers"}
                </Text>
              </View>
              <View pointerEvents="none">
                <Switch
                  value={isActive}
                  trackColor={{
                    false: colors.mistDark,
                    true: colors.brandLight,
                  }}
                  thumbColor={isActive ? colors.brand : colors.white}
                />
              </View>
            </Pressable>

            {!!error && (
              <Text className="mb-3 text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={save}
              disabled={saving}
              className="items-center rounded-2xl py-4"
              style={{
                backgroundColor: colors.brand,
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="text-base text-center font-bold text-white">
                  {category ? "Save changes" : "+ Add category"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
