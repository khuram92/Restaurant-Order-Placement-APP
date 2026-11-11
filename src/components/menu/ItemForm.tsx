import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import type { MenuApi } from "../../services/menuApi";
import type {
  AddOnGroup,
  ItemSize,
  MenuCategory,
  MenuItem,
  MenuItemInput,
} from "../../types/menu";
import type { PickedImage } from "../../types/restaurant";
import { ITEM_TAGS, type ItemTagKey } from "../../utils/menuFormat";
type IconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  menuApi: MenuApi;

  initialCategoryId?: string;
 
  itemId?: string;

  onDone: () => void;
};


type SizeRow = {
  key: string;
  _id?: string;
  name: string;
  price: string;
  serves: string;
};
type OptionRow = {
  key: string;
  _id?: string;
  name: string;
  price: string;
  isAvailable: boolean;
};
type GroupRow = {
  key: string;
  _id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: OptionRow[];
};

const MAX_SIZES = 6;
const MAX_GROUPS = 10;
const MAX_OPTIONS = 20;

const toText = (n?: number) => (n === undefined || n === null ? "" : String(n));
const toInt = (text: string) =>
  text.trim() === "" ? NaN : Number(text.trim());
const isWhole = (n: number) => Number.isInteger(n) && n >= 0;

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
};

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: IconName;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <Ionicons name={icon} size={18} color={colors.brand} />
        <Text className="ml-2 flex-1 text-base font-bold text-brand-dark">
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <View className="mb-1.5 flex-row justify-between">
      <Text className="text-sm font-semibold text-brand-dark">{text}</Text>
      {!!hint && <Text className="text-xs text-brand-light">{hint}</Text>}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  maxLength,
  prefix,
  className = "",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  prefix?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={`flex-row items-center rounded-2xl border-2 px-3 ${className}`}
      style={{
        borderColor: focused ? colors.brand : colors.mistDark,
        backgroundColor: focused ? colors.white : colors.mistLight,
      }}>
      {!!prefix && (
        <Text className="mr-1 text-sm font-semibold text-brand-light">
          {prefix}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        selectionColor={colors.brand}
        className={`flex-1 py-3 text-base ${multiline ? "min-h-[72px]" : ""}`}
        style={{
          color: colors.text,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl py-2 bg-mist-light"
      >
      <Text className="text-xs text-brand-light">{label}</Text>
      <View className="mt-1 flex-row items-center">
        <Pressable
          onPress={() => onChange(value - 1)}
          disabled={value <= min}
          hitSlop={6}
          style={{ opacity: value <= min ? 0.3 : 1 }}>
          <Ionicons name="remove-circle" size={26} color={colors.brand} />
        </Pressable>
        <Text className="mx-3 w-6 text-center text-lg font-extrabold text-brand-dark">
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(value + 1)}
          disabled={value >= max}
          hitSlop={6}
          style={{ opacity: value >= max ? 0.3 : 1 }}>
          <Ionicons name="add-circle" size={26} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="flex-row items-center py-2">
      <View
        className="h-9 w-9 items-center justify-center rounded-xl "
        style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-brand-dark">{title}</Text>
        <Text className="text-xs text-brand-light">{subtitle}</Text>
      </View>
      <View pointerEvents="none">
        <Switch
          value={value}
          trackColor={{ false: colors.mistDark, true: colors.brandLight }}
          thumbColor={value ? colors.brand : colors.white}
        />
      </View>
    </Pressable>
  );
}


const groupRuleText = (required: boolean, max: number) => {
  if (!required) return `Optional · customer can pick up to ${max}`;
  if (max === 1) return "Required · customer must pick 1";
  return `Required · customer picks 1 to ${max}`;
};
// ---------- Form ----------
export default function ItemForm({
  menuApi,
  initialCategoryId,
  itemId,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyCounter = useRef(0);
  const newKey = () => `row-${++keyCounter.current}`;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [original, setOriginal] = useState<MenuItem | null>(null);

  // Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [mode, setMode] = useState<"single" | "sizes">("single");
  const [price, setPrice] = useState("");
  const [serves, setServes] = useState("");
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [tags, setTags] = useState<Record<ItemTagKey, boolean>>({
    isBestseller: false,
    isChefSpecial: false,
    isNew: false,
    isSpicy: false,
  });

  const [isAvailable, setIsAvailable] = useState(true);

  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    const load = async () => {
      try {
        const [menu, item] = await Promise.all([
          menuApi.getMenu(),
          itemId ? menuApi.getItem(itemId) : null,
        ]);
        setCategories(menu.categories);
        if (!itemId && !initialCategoryId && menu.categories[0])
          setCategoryId(menu.categories[0]._id);

        if (item) {
          setOriginal(item);
          setName(item.name);
          setDescription(item.description ?? "");
          setCategoryId(item.categoryId);
          setMode(item.sizes.length > 0 ? "sizes" : "single");
          setPrice(toText(item.price));
          setServes(toText(item.serves));
          setSizes(
            item.sizes.map((s) => ({
              key: newKey(),
              _id: s._id,
              name: s.name,
              price: toText(s.price),
              serves: toText(s.serves),
            })),
          );
          setGroups(
            item.addOnGroups.map((g) => ({
              key: newKey(),
              _id: g._id,
              name: g.name,
              minSelect: g.minSelect > 0 ? 1 : 0,
              maxSelect: g.maxSelect,
              options: g.options.map((o) => ({
                key: newKey(),
                _id: o._id,
                name: o.name,
                price: toText(o.price),
                isAvailable: o.isAvailable,
              })),
            })),
          );
          setTags({
            isBestseller: item.isBestseller,
            isChefSpecial: item.isChefSpecial,
            isNew: item.isNew,
            isSpicy: item.isSpicy,
          });
          setIsAvailable(item.isAvailable);
          setImageUrl(item.image);
        }
      } catch (err) {
        setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuApi, itemId]);

  const clearError = () => {
    if (error) setError("");
  };

  
  const handlePicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPickedImage({
      uri: asset.uri,
      ...(asset.mimeType && { mimeType: asset.mimeType }),
      ...(asset.fileName && { fileName: asset.fileName }),
    });
    setRemoveImage(false);
  };

  const choosePhoto = () => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }[] = [
      {
        text: "Take photo",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted)
            return Alert.alert("Camera permission is needed to take a photo");
          handlePicked(await ImagePicker.launchCameraAsync(pickerOptions));
        },
      },
      {
        text: "Choose from gallery",
        onPress: async () =>
          handlePicked(
            await ImagePicker.launchImageLibraryAsync(pickerOptions),
          ),
      },
    ];
    if (pickedImage || (imageUrl && !removeImage)) {
      options.push({
        text: "Remove photo",
        style: "destructive",
        onPress: () => {
          setPickedImage(null);
          setRemoveImage(true);
        },
      });
    } else {
      options.push({ text: "Cancel", style: "cancel" });
    }
    Alert.alert("Item photo", "A clear photo helps customers choose", options);
  };

  const previewUri = pickedImage?.uri ?? (removeImage ? undefined : imageUrl);


  const addSize = () =>
    setSizes((prev) => [
      ...prev,
      { key: newKey(), name: "", price: "", serves: "" },
    ]);
  const updateSize = (key: string, patch: Partial<SizeRow>) => {
    setSizes((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
    clearError();
  };
  const removeSize = (key: string) =>
    setSizes((prev) => prev.filter((s) => s.key !== key));

  const switchMode = (next: "single" | "sizes") => {
    setMode(next);
    if (next === "sizes" && sizes.length === 0) {
      // Start with two rows, the first one prefilled from the single price
      setSizes([
        { key: newKey(), name: "Regular", price, serves },
        { key: newKey(), name: "Large", price: "", serves: "" },
      ]);
    }
    clearError();
  };

  const addGroup = () =>
    setGroups((prev) => [
      ...prev,
      {
        key: newKey(),
        name: "",
        minSelect: 0,
        maxSelect: 1,
        options: [{ key: newKey(), name: "", price: "", isAvailable: true }],
      },
    ]);
  const updateGroup = (key: string, patch: Partial<GroupRow>) => {
    setGroups((prev) =>
      prev.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
    clearError();
  };
  const removeGroup = (key: string) =>
    setGroups((prev) => prev.filter((g) => g.key !== key));

  const addOption = (groupKey: string) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              options: [
                ...g.options,
                { key: newKey(), name: "", price: "", isAvailable: true },
              ],
            }
          : g,
      ),
    );
  const updateOption = (
    groupKey: string,
    optionKey: string,
    patch: Partial<OptionRow>,
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              options: g.options.map((o) =>
                o.key === optionKey ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );
    clearError();
  };
  const removeOption = (groupKey: string, optionKey: string) =>
    setGroups((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        const options = g.options.filter((o) => o.key !== optionKey);
        const maxSelect = Math.max(1, Math.min(g.maxSelect, options.length));
        return { ...g, options, maxSelect };
      }),
    );

  // ---------- Build + check the input ----------
  const buildInput = (): MenuItemInput | string => {
    if (!name.trim()) return "Enter an item name";
    if (!categoryId) return "Choose a category";

    const input: MenuItemInput = {
      categoryId,
      name: name.trim(),
      description: description.trim(),
      ...tags,
      isAvailable,
    };

    if (mode === "single") {
      const p = toInt(price);
      if (!isWhole(p)) return "Enter a valid price (whole rupees)";
      const s = toInt(serves);
      if (serves.trim() && (!isWhole(s) || s < 1 || s > 50))
        return "Serves must be 1 to 50 persons";
      input.price = p;
      input.serves = serves.trim() ? s : null;
      input.sizes = [];
    } else {
      if (sizes.length === 0) return "Add at least one size";
      const builtSizes: ItemSize[] = [];
      for (const [i, row] of sizes.entries()) {
        const label = row.name.trim() || `Size ${i + 1}`;
        if (!row.name.trim()) return `Enter a name for size ${i + 1}`;
        const p = toInt(row.price);
        if (!isWhole(p)) return `Enter a valid price for "${label}"`;
        const s = toInt(row.serves);
        if (row.serves.trim() && (!isWhole(s) || s < 1 || s > 50))
          return `"${label}": serves must be 1 to 50`;
        builtSizes.push({
          ...(row._id && { _id: row._id }),
          name: row.name.trim(),
          price: p,
          ...(row.serves.trim() && { serves: s }),
        });
      }
      const names = builtSizes.map((s) => s.name.toLowerCase());
      if (new Set(names).size !== names.length)
        return "Each size needs a different name";
      input.sizes = builtSizes;
      input.price = null;
      input.serves = null;
    }

    const builtGroups: AddOnGroup[] = [];
    for (const [i, group] of groups.entries()) {
      if (!group.name.trim()) return `Enter a name for add-on group ${i + 1}`;
      if (group.options.length === 0)
        return `"${group.name}" needs at least one option`;
      const options = [];
      for (const [j, option] of group.options.entries()) {
        if (!option.name.trim())
          return `"${group.name}": enter a name for option ${j + 1}`;
        const p = option.price.trim() ? toInt(option.price) : 0;
        if (!isWhole(p))
          return `"${option.name}": enter a valid price (or leave it empty for free)`;
        options.push({
          ...(option._id && { _id: option._id }),
          name: option.name.trim(),
          price: p,
          isAvailable: option.isAvailable,
        });
      }
      builtGroups.push({
        ...(group._id && { _id: group._id }),
        name: group.name.trim(),
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        options,
      });
    }
    input.addOnGroups = builtGroups;

    return input;
  };

  
  const save = async () => {
    const input = buildInput();
    if (typeof input === "string") return setError(input);

    setSaving(true);
    setError("");
    try {
      const saved = original
        ? await menuApi.updateItem(original._id, input)
        : await menuApi.createItem(input);

      // Photo after the item exists (a new item needs its id first)
      try {
        if (pickedImage) await menuApi.uploadItemImage(saved._id, pickedImage);
        else if (removeImage && original?.image)
          await menuApi.removeItemImage(saved._id);
      } catch (err) {
        setSaving(false);
        return Alert.alert(
          "Item saved",
          `But the photo couldn't be saved: ${getErrorMessage(err)}`,
          [{ text: "OK", onPress: onDone }],
        );
      }

      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!original) return;
    Alert.alert(
      "Delete item?",
      `"${original.name}" will be removed from the menu.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await menuApi.deleteItem(original._id);
              onDone();
            } catch (err) {
              setDeleting(false);
              Alert.alert("Couldn't delete", getErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">{loadError}</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="albums" size={44} color={colors.brandLight} />
        <Text className="mt-3 text-center text-brand-dark">
          Add a category first, then add items to it.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 110,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        <Pressable
          onPress={choosePhoto}
          className="mb-4 h-48 items-center justify-center overflow-hidden rounded-3xl bg-brand-soft"
          style={[cardShadow, ]}>
          {previewUri ? (
            <>
              <Image
                source={{ uri: previewUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View
                className="absolute bottom-3 right-3 flex-row items-center rounded-full px-3 py-1.5 bg-[rgba(59,70,56,0.8)]"
                >
                <Ionicons name="camera" size={14} color={colors.white} />
                <Text className="ml-1 text-xs font-bold text-white">
                  Change
                </Text>
              </View>
            </>
          ) : (
            <>
              <View
                className="h-14 w-14 items-center justify-center rounded-full bg-brand"
                >
                <Ionicons name="camera" size={26} color={colors.white} />
              </View>
              <Text className="mt-2 text-sm font-bold text-brand-dark">
                Add a photo
              </Text>
              
            </>
          )}
        </Pressable>

        {/* Basic info */}
        <Section title="Item details" icon="fast-food">
          <Label text="Name" />
          <Input
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError();
            }}
            placeholder="e.g. Chicken Fried Rice"
            maxLength={60}
            className="mb-3"
          />
          <Label text="Description" hint="Optional" />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Egg fried rice with chicken and veggies"
            multiline
            maxLength={300}
            className="mb-3"
          />

          <Label text="Category" />
          <View className="flex-row flex-wrap">
            {categories.map((c) => {
              const selected = c._id === categoryId;
              return (
                <Pressable
                  key={c._id}
                  onPress={() => {
                    setCategoryId(c._id);
                    clearError();
                  }}
                  className="mb-2 mr-2 flex-row items-center rounded-full px-3 py-2"
                  style={{
                    backgroundColor: selected ? colors.brand : colors.brandSoft,
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
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Price */}
        <Section title="Price" icon="pricetag">
          <View
            className="mb-4 flex-row rounded-2xl p-1"
            style={{ backgroundColor: colors.mistLight }}>
            {(["single", "sizes"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                className="flex-1 items-center rounded-xl py-2.5"
                style={{
                  backgroundColor: mode === m ? colors.brand : "transparent",
                }}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: mode === m ? colors.white : colors.brand }}>
                  {m === "single" ? "One price" : "Sizes"}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === "single" ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Label text="Price" />
                <Input
                  value={price}
                  onChangeText={(t) => {
                    setPrice(t.replace(/[^\d]/g, ""));
                    clearError();
                  }}
                  placeholder="650"
                  keyboardType="number-pad"
                  prefix="Rs"
                  maxLength={7}
                />
              </View>
              <View className="flex-1">
                <Label text="Serves" hint="Optional" />
                <Input
                  value={serves}
                  onChangeText={(t) => setServes(t.replace(/[^\d]/g, ""))}
                  placeholder="1"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          ) : (
            <>
              <View className="mb-1 flex-row px-1">
                <Text className="flex-[1.4] text-xs font-semibold text-brand-light">
                  Size
                </Text>
                <Text className="ml-2 flex-1 text-xs font-semibold text-brand-light">
                  Price (Rs)
                </Text>
                <Text className="ml-2 w-16 text-xs font-semibold text-brand-light">
                  Serves
                </Text>
                <View className="ml-2 w-6" />
              </View>
              {sizes.map((row) => (
                <View key={row.key} className="mb-2 flex-row items-center">
                  <View className="flex-[1.4]">
                    <Input
                      value={row.name}
                      onChangeText={(t) => updateSize(row.key, { name: t })}
                      placeholder="Small"
                      maxLength={30}
                    />
                  </View>
                  <View className="ml-2 flex-1">
                    <Input
                      value={row.price}
                      onChangeText={(t) =>
                        updateSize(row.key, { price: t.replace(/[^\d]/g, "") })
                      }
                      placeholder="800"
                      keyboardType="number-pad"
                      maxLength={7}
                    />
                  </View>
                  <View className="ml-2 w-16">
                    <Input
                      value={row.serves}
                      onChangeText={(t) =>
                        updateSize(row.key, { serves: t.replace(/[^\d]/g, "") })
                      }
                      placeholder="1"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <Pressable
                    onPress={() => removeSize(row.key)}
                    hitSlop={8}
                    className="ml-2 w-6 items-center">
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={colors.danger}
                    />
                  </Pressable>
                </View>
              ))}
              {sizes.length < MAX_SIZES && (
                <Pressable
                  onPress={addSize}
                  className="mt-1 flex-row items-center self-start py-1">
                  <Ionicons name="add-circle" size={18} color={colors.brand} />
                  <Text className="ml-1 text-sm font-bold text-brand">
                    Add size
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </Section>

        {/* Add-ons */}
        <Section
          title="Add-ons"
          icon="layers"
          right={<Text className="text-xs text-brand-light">Optional</Text>}>
          {groups.length === 0 && (
            <Text className="mb-2 text-xs text-brand-light">
              e.g. "Choose a drink" (pick 1) or "Extras" like Extra cheese +Rs
              150
            </Text>
          )}

          {groups.map((group, gi) => (
            <View
              key={group.key}
              className="mb-3 rounded-2xl p-3"
              style={{ backgroundColor: colors.mist }}>
              <View className="mb-2 flex-row items-center">
                <View className="flex-1">
                  <Input
                    value={group.name}
                    onChangeText={(t) => updateGroup(group.key, { name: t })}
                    placeholder={gi === 0 ? "Choose a drink" : "Extras"}
                    maxLength={40}
                  />
                </View>
                <Pressable
                  onPress={() => removeGroup(group.key)}
                  hitSlop={8}
                  className="ml-2">
                  <Ionicons name="trash" size={20} color={colors.danger} />
                </Pressable>
              </View>

              {/* Required? + how many the customer can pick */}
              <View className="mb-1 flex-row gap-2">
                <Pressable
                  onPress={() =>
                    updateGroup(group.key, {
                      minSelect: group.minSelect > 0 ? 0 : 1,
                    })
                  }
                  className="flex-1 items-center justify-center rounded-2xl py-2"
                  style={{ backgroundColor: colors.mistLight }}>
                  <Text className="text-xs text-brand-light">Required?</Text>
                  <View
                    pointerEvents="none"
                    className="mt-0.5 flex-row items-center">
                    <Switch
                      value={group.minSelect > 0}
                      trackColor={{
                        false: colors.mistDark,
                        true: colors.brandLight,
                      }}
                      thumbColor={
                        group.minSelect > 0 ? colors.brand : colors.white
                      }
                    />
                    <Text className="ml-1 text-sm font-bold text-brand-dark">
                      {group.minSelect > 0 ? "Yes" : "No"}
                    </Text>
                  </View>
                </Pressable>
                <Stepper
                  label="Can pick up to"
                  value={group.maxSelect}
                  min={1}
                  max={Math.max(1, group.options.length)}
                  onChange={(n) => updateGroup(group.key, { maxSelect: n })}
                />
              </View>
              <Text className="mb-3 text-center text-xs font-semibold text-brand">
                {groupRuleText(group.minSelect > 0, group.maxSelect)}
              </Text>

             
              {group.options.map((option) => (
                <View key={option.key} className="mb-2 flex-row items-center">
                  <View className="flex-[1.6]">
                    <Input
                      value={option.name}
                      onChangeText={(t) =>
                        updateOption(group.key, option.key, { name: t })
                      }
                      placeholder="Coke"
                      maxLength={40}
                    />
                  </View>
                  <View className="ml-2 flex-1">
                    <Input
                      value={option.price}
                      onChangeText={(t) =>
                        updateOption(group.key, option.key, {
                          price: t.replace(/[^\d]/g, ""),
                        })
                      }
                      placeholder="Free"
                      keyboardType="number-pad"
                      prefix="+"
                      maxLength={6}
                    />
                  </View>
                  <Pressable
                    onPress={() =>
                      updateOption(group.key, option.key, {
                        isAvailable: !option.isAvailable,
                      })
                    }
                    hitSlop={6}
                    className="ml-2 items-center">
                    <Ionicons
                      name={
                        option.isAvailable
                          ? "checkmark-circle"
                          : "remove-circle"
                      }
                      size={22}
                      color={option.isAvailable ? colors.brand : colors.danger}
                    />
                    <Text
                      className="text-[9px] font-semibold"
                      style={{
                        color: option.isAvailable
                          ? colors.brand
                          : colors.danger,
                      }}>
                      {option.isAvailable ? "In stock" : "Sold out"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeOption(group.key, option.key)}
                    hitSlop={8}
                    className="ml-2">
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={colors.mistDark}
                    />
                  </Pressable>
                </View>
              ))}
              {group.options.length < MAX_OPTIONS && (
                <Pressable
                  onPress={() => addOption(group.key)}
                  className="flex-row items-center self-start py-1">
                  <Ionicons name="add-circle" size={18} color={colors.brand} />
                  <Text className="ml-1 text-sm font-bold text-brand">
                    Add option
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {groups.length < MAX_GROUPS && (
            <Pressable
              onPress={addGroup}
              className="flex-row items-center justify-center rounded-2xl border-2 border-dashed py-3"
              style={{ borderColor: colors.mistDark }}>
              <Ionicons name="add-circle" size={18} color={colors.brand} />
              <Text className="ml-1.5 text-sm font-bold text-brand">
                Add add-on group
              </Text>
            </Pressable>
          )}
        </Section>

        {/* Tags + availability */}
        <Section title="Tags & availability" icon="pricetags">
          {ITEM_TAGS.map((tag) => (
            <ToggleRow
              key={tag.key}
              icon={tag.icon}
              title={tag.label}
              subtitle={`Shows a "${tag.label}" badge`}
              value={tags[tag.key]}
              onChange={(value) =>
                setTags((prev) => ({ ...prev, [tag.key]: value }))
              }
            />
          ))}
          <ToggleRow
            icon={isAvailable ? "checkmark-circle" : "close-circle"}
            title="Available"
            subtitle={
              isAvailable ? "Customers can order it" : "Shown as Sold out"
            }
            value={isAvailable}
            onChange={setIsAvailable}
          />
        </Section>

       
        {original && (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting || saving}
            className="mb-4 flex-row items-center justify-center rounded-2xl border-2 bg-white py-4"
            style={{ borderColor: colors.danger, opacity: deleting ? 0.6 : 1 }}>
            {deleting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash" size={18} color={colors.danger} />
                <Text
                  className="ml-2 font-bold"
                  style={{ color: colors.danger }}>
                  Delete item
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

    
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-3"
        style={{
          backgroundColor: colors.mist,
          paddingBottom: insets.bottom + 12,
        }}>
        {!!error && (
          <View
            className="mb-2 flex-row items-center rounded-xl px-3 py-2"
            style={{ backgroundColor: colors.white }}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text
              className="ml-2 flex-1 text-sm"
              style={{ color: colors.danger }}>
              {error}
            </Text>
          </View>
        )}
        <Pressable
          onPress={save}
          disabled={saving || deleting}
          className="items-center rounded-2xl py-4"
          style={[
            cardShadow,
            { backgroundColor: colors.brand, opacity: saving ? 0.7 : 1 },
          ]}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-base font-bold text-white">
              {original ? "Save changes" : "+ Add item"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
