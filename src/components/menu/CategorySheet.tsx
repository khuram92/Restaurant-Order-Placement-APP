import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  category: MenuCategory | null;
  onClose: () => void;
  onSave: (input: CategoryInput) => Promise<void>;
};

/** Bottom sheet to add or edit a category */
export default function CategorySheet({ visible, category, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"name" | "description" | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setIsActive(category?.isActive ?? true);
    setError("");
    setSaving(false);
  }, [visible, category]);

  const save = async () => {
    if (!name.trim()) return setError("Enter a category name");
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), description: description.trim(), isActive });
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(44,51,41,0.45)]" onPress={onClose} />

        <View className="rounded-t-3xl bg-white px-5 pt-3 pb-6" >
          <View className="mb-3 items-center">
            <View className="h-1.5 w-12 rounded-full bg-mist-dark"  />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-brand-dark">
              {category ? "Edit category" : "New category"}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft"
              >
              <Ionicons name="close" size={20} color={colors.brand} />
            </Pressable>
          </View>

          <Text className="mb-2 text-sm font-semibold text-brand-dark">Name</Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError("");
            }}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Burgers, Pizza etc..."
            placeholderTextColor={colors.placeholder}
            maxLength={40}
            selectionColor={colors.brand}
            className="mb-4 rounded-2xl border-2 px-4 py-3.5 text-base"
            style={inputStyle("name")}
          />

          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm font-semibold text-brand-dark">Description</Text>
            <Text className="text-xs text-brand-light">Optional</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            onFocus={() => setFocused("description")}
            onBlur={() => setFocused(null)}
            placeholder="Write Discription..."
            placeholderTextColor={colors.placeholder}
            maxLength={200}
            multiline
            selectionColor={colors.brand}
            className="mb-4 min-h-[72px] rounded-2xl border-2 px-4 py-3 text-base"
            style={[inputStyle("description"), { textAlignVertical: "top" }]}
          />

          <Pressable
            onPress={() => setIsActive((v) => !v)}
            className="mb-4 flex-row items-center rounded-2xl px-4 py-3 bg-mist-light"
            >
            <Ionicons name={isActive ? "eye" : "eye-off"} size={18} color={colors.brand} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-brand-dark">Show to customers</Text>
              <Text className="text-xs text-brand-light">
                {isActive ? "Customers can see this category" : "Hidden from customers"}
              </Text>
            </View>
            <View pointerEvents="none">
              <Switch
                value={isActive}
                trackColor={{ false: colors.mistDark, true: colors.brandLight }}
                thumbColor={isActive ? colors.brand : colors.white}
              />
            </View>
          </Pressable>

          {!!error && (
            <Text className="mb-3 text-sm text-[#b42318]" >
              {error}
            </Text>
          )}

          <Pressable
            onPress={save}
            disabled={saving}
            className="items-center rounded-2xl py-4 bg-brand-dark"
            >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base text-center font-bold text-white">{category ? "Save changes" : "+ Add Category"}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}