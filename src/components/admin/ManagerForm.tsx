import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, cardShadow } from "../../constants/theme";
import { getRestaurantOptions } from "../../services/adminManagerApi";
import { getErrorMessage } from "../../lib/api";
import type { Manager, ManagerInput, RestaurantOption } from "../../types/manager";

// ================= Form values =================

export interface ManagerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  restaurantId: string;
}

export const emptyManagerValues = (): ManagerFormValues => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  restaurantId: "",
});

export const managerToValues = (m: Manager): ManagerFormValues => ({
  firstName: m.firstName ?? "",
  lastName: m.lastName ?? "",
  email: m.email,
  phone: m.phone ?? "",
  restaurantId: m.restaurantId?._id ?? "",
});

/** Same rules as the backend; returns the body or the first error */
const valuesToInput = (v: ManagerFormValues): { input: ManagerInput } | { error: string } => {
  const nameOk = (s: string) => /^[\p{L}\s'.-]{2,40}$/u.test(s.trim());
  if (!nameOk(v.firstName)) return { error: "Enter a valid first name (letters only)" };
  if (!nameOk(v.lastName)) return { error: "Enter a valid last name (letters only)" };

  const email = v.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email" };

  let phone = v.phone.replace(/[\s-]/g, "");
  if (phone.startsWith("+92")) phone = "0" + phone.slice(3);
  if (phone && !/^03\d{9}$/.test(phone)) return { error: "Phone must be 03XXXXXXXXX" };

  if (!v.restaurantId) return { error: "Choose a restaurant" };

  return {
    input: {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email,
      phone,
      restaurantId: v.restaurantId,
    },
  };
};

// ================= Small UI pieces =================

type FieldProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
  hint?: string;
};

function Field({ label, icon, value, onChangeText, placeholder, required, keyboardType, autoCapitalize = "words", hint }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="mb-3 flex-1">
      <Text className="mb-1.5 text-sm font-semibold text-brand-dark">
        {label}
        {required && <Text className="text-[#b42318]"> *</Text>}
      </Text>
      <View
        className="flex-row items-center rounded-2xl border-2 px-4"
        style={{
          borderColor: focused ? colors.brand : colors.mistDark,
          backgroundColor: focused ? colors.white : colors.mistLight,
        }}
      >
        <Ionicons name={icon} size={16} color={colors.brandLight} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={colors.brand}
          className="ml-2 flex-1 py-3 text-base text-[#2c3329]"
        />
      </View>
      {!!hint && <Text className="mt-1 text-xs text-brand-light">{hint}</Text>}
    </View>
  );
}

function RestaurantThumb({ r, size = 40 }: { r: { name: string; logo?: string }; size?: number }) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, backgroundColor: colors.brandSoft }}
    >
      {r.logo ? (
        <Image source={{ uri: r.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      ) : (
        <Text className="font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
      )}
    </View>
  );
}

// ---------- Restaurant picker (modal) ----------
function RestaurantPicker({
  value,
  currentManagerId,
  onChange,
}: {
  value: string;
  currentManagerId?: string;
  onChange: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RestaurantOption[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setError("");
    getRestaurantOptions()
      .then(setOptions)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const selected = options?.find((o) => o._id === value);

  // Free = no manager, or managed by the manager being edited
  const isFree = (o: RestaurantOption) => !o.manager || o.manager._id === currentManagerId;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (options ?? []).filter(
      (o) => !term || o.name.toLowerCase().includes(term) || (o.address?.city ?? "").toLowerCase().includes(term)
    );
    // Free restaurants first
    return [...list].sort((a, b) => Number(!isFree(a)) - Number(!isFree(b)));
  }, [options, search, currentManagerId]);

  const freeCount = (options ?? []).filter(isFree).length;

  return (
    <View className="mb-1">
      <Text className="mb-1.5 text-sm font-semibold text-brand-dark">
        Restaurant <Text className="text-[#b42318]">*</Text>
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-2xl border-2 p-3"
        style={{ borderColor: colors.mistDark, backgroundColor: colors.mistLight }}
      >
        {selected ? (
          <>
            <RestaurantThumb r={selected} />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-brand-dark">{selected.name}</Text>
              {!!selected.address?.city && <Text className="text-xs text-brand-light">{selected.address.city}</Text>}
            </View>
          </>
        ) : (
          <>
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name="storefront" size={20} color={colors.brand} />
            </View>
            <Text className="ml-3 flex-1 text-base" style={{ color: colors.placeholder }}>
              {options ? "Choose a restaurant" : error ? "Couldn't load restaurants" : "Loading restaurants…"}
            </Text>
          </>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.brandLight} />
      </Pressable>
      {options && (
        <Text className="mt-1 text-xs text-brand-light">
          {freeCount} restaurant{freeCount === 1 ? "" : "s"} without a manager
        </Text>
      )}
      {!!error && (
        <Pressable onPress={load}>
          <Text className="mt-1 text-xs font-bold text-[#b42318]">{error} · Tap to retry</Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1" style={{ backgroundColor: colors.mist, paddingTop: insets.top }}>
          {/* Modal header */}
          <View className="flex-row items-center px-4 py-3" style={{ backgroundColor: colors.brand }}>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.white} />
            </Pressable>
            <Text className="ml-3 text-lg font-bold text-white">Choose restaurant</Text>
          </View>

          <View className="px-4 pt-3">
            <View className="flex-row items-center rounded-2xl border-2 bg-white px-4" style={{ borderColor: colors.mistDark }}>
              <Ionicons name="search" size={18} color={colors.brandLight} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or city"
                placeholderTextColor={colors.placeholder}
                autoCorrect={false}
                selectionColor={colors.brand}
                className="ml-2 flex-1 py-3 text-base text-[#2c3329]"
              />
            </View>
          </View>

          {!options ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.brand} size="large" />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(o) => o._id}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
              ListEmptyComponent={<Text className="mt-8 text-center text-brand-light">No restaurants found</Text>}
              renderItem={({ item }) => {
                const free = isFree(item);
                const isSelected = item._id === value;
                return (
                  <Pressable
                    disabled={!free}
                    onPress={() => {
                      onChange(item._id);
                      setOpen(false);
                    }}
                    className="mb-2 flex-row items-center rounded-2xl bg-white p-3"
                    style={{
                      opacity: free ? 1 : 0.5,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.brand : "transparent",
                    }}
                  >
                    <RestaurantThumb r={item} size={44} />
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-brand-dark">{item.name}</Text>
                      <Text className="text-xs text-brand-light">
                        {[item.address?.city, item.isActive ? null : "Inactive"].filter(Boolean).join(" · ")}
                      </Text>
                      {!free && item.manager && (
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="person" size={11} color={colors.brandLight} />
                          <Text className="ml-1 text-xs text-brand-light">Managed by {item.manager.name}</Text>
                        </View>
                      )}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
                    ) : !free ? (
                      <Ionicons name="lock-closed" size={16} color={colors.brandLight} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ================= The form =================

type Props = {
  initialValues?: ManagerFormValues;
  /** When editing: the manager's own id, so their current restaurant stays selectable */
  managerId?: string;
  submitLabel: string;
  note?: string;
  /** Return an error message to show it, or nothing on success */
  onSubmit: (input: ManagerInput) => Promise<string | void>;
};

export default function ManagerForm({ initialValues, managerId, submitLabel, note, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ManagerFormValues>(initialValues ?? emptyManagerValues());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ManagerFormValues>(key: K, value: ManagerFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (error) setError("");
  };

  const handleSubmit = async () => {
    const result = valuesToInput(values);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError("");
    const message = await onSubmit(result.input);
    if (message) {
      setError(message);
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
          <Text className="mb-4 text-base font-bold text-brand-dark">Manager details</Text>
          <View className="flex-row gap-3">
            <Field label="First name" icon="person" required value={values.firstName} onChangeText={(t) => set("firstName", t)} placeholder="first name" />
            <Field label="Last name" icon="person" required value={values.lastName} onChangeText={(t) => set("lastName", t)} placeholder="Raza" />
          </View>
          <Field
            label="Email"
            icon="mail"
            required
            value={values.email}
            onChangeText={(t) => set("email", t)}
            placeholder="manager@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            hint="Used to log in. The password is sent here."
          />
          <Field label="Phone" icon="call" value={values.phone} onChangeText={(t) => set("phone", t)} placeholder="03001234567" keyboardType="phone-pad" autoCapitalize="none" />
        </View>

        <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
          <Text className="mb-4 text-base font-bold text-brand-dark">Restaurant</Text>
          <RestaurantPicker
            value={values.restaurantId}
            {...(managerId && { currentManagerId: managerId })}
            onChange={(id) => set("restaurantId", id)}
          />
        </View>

        {!!note && (
          <View className="flex-row rounded-2xl p-4" style={{ backgroundColor: colors.brandSoft }}>
            <Ionicons name="information-circle" size={18} color={colors.brand} />
            <Text className="ml-2 flex-1 text-sm text-brand-dark">{note}</Text>
          </View>
        )}
      </ScrollView>

      {/* Save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t bg-white px-4 pt-3"
        style={{ borderColor: colors.mistDark, paddingBottom: Math.max(insets.bottom, 12) + 8 }}
      >
        {!!error && <Text className="mb-2 text-center text-sm text-[#b42318]">{error}</Text>}
        <Pressable onPress={handleSubmit} disabled={saving} android_ripple={{ color: colors.brandDark }} className="overflow-hidden rounded-2xl">
          <View className="items-center rounded-2xl py-4" style={{ backgroundColor: colors.brand, opacity: saving ? 0.7 : 1 }}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text className="text-base font-bold text-white">{submitLabel}</Text>}
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}