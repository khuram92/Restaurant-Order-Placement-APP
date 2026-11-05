import { useState, type ReactNode } from "react";
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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, cardShadow } from "../../constants/theme";
import type { Day, OpeningHour, PickedImage, Restaurant, RestaurantInput } from "../../types/restaurant";

// ================= Form values =================
// Numbers are kept as strings while typing, and converted on submit.

export interface RestaurantFormValues {
  name: string;
  description: string;
  cuisines: string[];
  phone: string;
  email: string;
  street: string;
  area: string;
  city: string;
  lat: string;
  lng: string;
  services: { dineIn: boolean; takeaway: boolean; delivery: boolean };
  deliveryFee: string;
  minOrder: string;
  deliveryRadiusKm: string;
  taxRate: string;
 
  seatingCapacity: string;
  openingHours: OpeningHour[];
}

/** New images picked in this form (existing ones are shown from the restaurant's URLs) */
export interface RestaurantFormImages {
  logo?: PickedImage;
  cover?: PickedImage;
}

const DAYS: { key: Day; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const CUISINE_SUGGESTIONS = ["Pakistani", "BBQ", "Chinese", "Fast Food", "Pizza", "Desserts", "Cafe", "Seafood"];
const MAX_CUISINES = 10;

export const emptyRestaurantValues = (): RestaurantFormValues => ({
  name: "",
  description: "",
  cuisines: [],
  phone: "",
  email: "",
  street: "",
  area: "",
  city: "",
  lat: "",
  lng: "",
  services: { dineIn: true, takeaway: true, delivery: false },
  deliveryFee: "0",
  minOrder: "0",
  deliveryRadiusKm: "5",
  taxRate: "0",
 
  seatingCapacity: "0",
  openingHours: DAYS.map((d) => ({ day: d.key, open: "11:00", close: "23:00", closed: false })),
});

/** Restaurant from the API → form values (used by the Edit screen) */
export const restaurantToValues = (r: Restaurant): RestaurantFormValues => ({
  name: r.name,
  description: r.description ?? "",
  cuisines: [...r.cuisines],
  phone: r.phone ?? "",
  email: r.email ?? "",
  street: r.address.street,
  area: r.address.area ?? "",
  city: r.address.city,
  lat: r.location ? String(r.location.coordinates[1]) : "",
  lng: r.location ? String(r.location.coordinates[0]) : "",
  services: { ...r.services },
  deliveryFee: String(r.deliveryFee),
  minOrder: String(r.minOrder),
  deliveryRadiusKm: String(r.deliveryRadiusKm),
  taxRate: String(r.taxRate),
  seatingCapacity: String(r.seatingCapacity ?? 0),
  openingHours: r.openingHours.map((h) => ({ ...h })),
});

/** Checks the form and builds the API body, or returns the first error */
export const valuesToInput = (
  v: RestaurantFormValues
): { input: RestaurantInput; error?: undefined } | { input?: undefined; error: string } => {
  if (v.name.trim().length < 2) return { error: "Enter the restaurant name" };
  if (v.street.trim().length < 3) return { error: "Enter the street address" };
  if (v.city.trim().length < 2) return { error: "Enter the city" };

  if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) return { error: "Enter a valid email" };
  if (v.phone.trim() && !/^\+?\d{10,13}$/.test(v.phone.replace(/[\s-]/g, ""))) {
    return { error: "Enter a valid phone number" };
  }

  if (!v.services.dineIn && !v.services.takeaway && !v.services.delivery) {
    return { error: "Turn on at least one service" };
  }

  const num = (text: string) => Number(text.replace(",", "."));
  const fields = {
    deliveryFee: num(v.deliveryFee),
    minOrder: num(v.minOrder),
    deliveryRadiusKm: num(v.deliveryRadiusKm),
    taxRate: num(v.taxRate),
  
    seatingCapacity: num(v.seatingCapacity),
  };
  if (Object.values(fields).some((n) => Number.isNaN(n) || n < 0)) {
    return { error: "Fees, tax, seats and times must be positive numbers" };
  }
  if (fields.taxRate > 100) return { error: "Tax can't be over 100%" };
  if (fields.deliveryRadiusKm > 50) return { error: "Delivery radius can be at most 50 km" };
  
  if (!Number.isInteger(fields.seatingCapacity) || fields.seatingCapacity > 2000) {
    return { error: "Seats must be a whole number up to 2000" };
  }
  if (v.services.dineIn && fields.seatingCapacity < 1) {
    return { error: "Enter the number of seats for Dine-in" };
  }

  // Coordinates: both or none
  let location: RestaurantInput["location"] = null;
  if (v.lat.trim() || v.lng.trim()) {
    const lat = num(v.lat);
    const lng = num(v.lng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) return { error: "Latitude must be between -90 and 90" };
    if (Number.isNaN(lng) || lng < -180 || lng > 180) return { error: "Longitude must be between -180 and 180" };
    location = { lat, lng };
  }

  return {
    input: {
      name: v.name.trim(),
      ...(v.description.trim() && { description: v.description.trim() }),
      cuisines: v.cuisines,
      ...(v.phone.trim() && { phone: v.phone.replace(/[\s-]/g, "") }),
      ...(v.email.trim() && { email: v.email.trim().toLowerCase() }),
      address: {
        street: v.street.trim(),
        ...(v.area.trim() && { area: v.area.trim() }),
        city: v.city.trim(),
      },
      ...(location && { location }),
      services: v.services,
      ...fields,
      openingHours: v.openingHours,
    },
  };
};

// ================= Small UI pieces =================

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <Text className="text-base font-bold text-brand-dark">{title}</Text>
      {!!subtitle && <Text className="mt-0.5 text-xs text-brand-light">{subtitle}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words";
  multiline?: boolean;
  suffix?: string;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  disabled,
  keyboardType,
  autoCapitalize = "sentences",
  multiline,
  suffix,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="mb-3 flex-1" style={{ opacity: disabled ? 0.45 : 1 }}>
      <Text className="mb-1.5 text-sm font-semibold text-brand-dark">
        {label}
        {required && <Text className="text-[#b42318]"> *</Text>}
      </Text>
      <View
        className="flex-row items-center rounded-2xl border-2 px-4"
        style={{
          borderColor: focused && !disabled ? colors.brand : colors.mistDark,
          backgroundColor: disabled ? colors.mist : focused ? colors.white : colors.mistLight,
        }}
      >
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
          multiline={multiline}
          editable={!disabled}
          selectionColor={colors.brand}
          className="flex-1 py-3 text-base text-[#2c3329]"
          style={multiline ? { minHeight: 80, textAlignVertical: "top" } : undefined}
        />
        {!!suffix && <Text className="ml-2 text-sm font-semibold text-brand-light">{suffix}</Text>}
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="mb-2 flex-row items-center rounded-2xl p-3"
      style={{ backgroundColor: value ? colors.brandSoft : colors.mistLight }}
    >
      <Text className="mr-3 text-2xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-brand-dark">{label}</Text>
        <Text className="text-xs text-brand-light">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.mistDark, true: colors.brandLight }}
        thumbColor={value ? colors.brand : colors.white}
      />
    </Pressable>
  );
}

/** Small grey note shown when a group of settings is locked */
function LockedNote({ text }: { text: string }) {
  return (
    <View className="mb-3 flex-row items-center rounded-xl px-3 py-2" style={{ backgroundColor: colors.mistLight }}>
      <Text className="mr-2">🔒</Text>
      <Text className="flex-1 text-xs text-brand-light">{text}</Text>
    </View>
  );
}

// ---------- Cuisines: chips + add ----------
function CuisinesInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const has = (c: string) => value.some((v) => v.toLowerCase() === c.toLowerCase());

  const add = (raw: string) => {
    // Allow "Pakistani, BBQ" in one go
    const items = raw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const next = [...value];
    for (const item of items) {
      if (next.length >= MAX_CUISINES) break;
      if (!next.some((v) => v.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, 30));
    }
    onChange(next);
    setText("");
  };

  const remove = (c: string) => onChange(value.filter((v) => v !== c));
  const full = value.length >= MAX_CUISINES;

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row justify-between">
        <Text className="text-sm font-semibold text-brand-dark">Cuisines</Text>
        <Text className="text-xs text-brand-light">
          {value.length}/{MAX_CUISINES}
        </Text>
      </View>

      {/* Selected chips */}
      {value.length > 0 && (
        <View className="mb-2 flex-row flex-wrap gap-1.5">
          {value.map((c) => (
            <Pressable
              key={c}
              onPress={() => remove(c)}
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.brand }}
              hitSlop={4}
            >
              <Text className="text-xs font-semibold text-white">{c}</Text>
              <Text className="ml-1.5 text-xs text-white/80">✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input + Add */}
      {!full && (
        <View className="flex-row items-center gap-2">
          <View
            className="flex-1 rounded-2xl border-2 px-4"
            style={{
              borderColor: focused ? colors.brand : colors.mistDark,
              backgroundColor: focused ? colors.white : colors.mistLight,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={() => add(text)}
              placeholder="Type a cuisine"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              submitBehavior="submit"
              selectionColor={colors.brand}
              className="py-3 text-base text-[#2c3329]"
            />
          </View>
          <Pressable
            onPress={() => add(text)}
            disabled={!text.trim()}
            className="rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: text.trim() ? colors.brand : colors.mistDark }}
          >
            <Text className="font-bold text-white">Add</Text>
          </Pressable>
        </View>
      )}

      {/* Quick suggestions (only ones not added yet) */}
      {!full && (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {CUISINE_SUGGESTIONS.filter((s) => !has(s)).map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              className="rounded-full border px-3 py-1"
              style={{ borderColor: colors.mistDark, backgroundColor: colors.mistLight }}
            >
              <Text className="text-xs font-semibold text-brand">+ {s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- Images: cover + logo ----------
const pickImage = (aspect: [number, number]) =>
  new Promise<PickedImage | null>((resolve) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect,
      quality: 0.8,
    };
    const fromResult = (result: ImagePicker.ImagePickerResult) => {
      const asset = result.canceled ? undefined : result.assets[0];
      resolve(
        asset
          ? {
              uri: asset.uri,
              ...(asset.mimeType && { mimeType: asset.mimeType }),
              ...(asset.fileName && { fileName: asset.fileName }),
            }
          : null
      );
    };

    Alert.alert("Choose image", undefined, [
      {
        text: "Take photo",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) return resolve(null);
          fromResult(await ImagePicker.launchCameraAsync(options));
        },
      },
      { text: "Choose from gallery", onPress: async () => fromResult(await ImagePicker.launchImageLibraryAsync(options)) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });

function ImagesSection({
  coverUri,
  logoUri,
  name,
  onPickCover,
  onPickLogo,
}: {
  coverUri?: string;
  logoUri?: string;
  name: string;
  onPickCover: () => void;
  onPickLogo: () => void;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-3xl bg-white" style={cardShadow}>
      {/* Cover (2:1) */}
      <Pressable onPress={onPickCover} style={{ aspectRatio: 2, backgroundColor: colors.brandSoft }}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-3xl">🖼️</Text>
            <Text className="mt-1 text-sm font-semibold text-brand">Add cover photo</Text>
          </View>
        )}
        <View className="absolute right-3 top-3 rounded-full px-3 py-1" style={{ backgroundColor: "rgba(59,70,56,0.8)" }}>
          <Text className="text-xs font-semibold text-white">{coverUri ? "Change cover" : "Cover"}</Text>
        </View>
      </Pressable>

      {/* Logo overlapping the cover */}
      <View className="flex-row items-end px-5 pb-4" style={{ marginTop: -40 }}>
        <Pressable
          onPress={onPickLogo}
          className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white"
          style={{ backgroundColor: colors.mistLight }}
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Text className="text-2xl font-extrabold text-brand">{name.trim()[0]?.toUpperCase() ?? "📷"}</Text>
          )}
        </Pressable>
        <View className="ml-3 flex-1 pb-1">
          <Pressable onPress={onPickLogo} hitSlop={6}>
            <Text className="text-sm font-bold text-brand">{logoUri ? "Change logo" : "Add logo"}</Text>
          </Pressable>
          <Text className="text-xs text-brand-light">Square logo · wide cover · optional</Text>
        </View>
      </View>
    </View>
  );
}

// "14:30" ⇄ Date
const timeToDate = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};
const dateToTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// "14:30" → "2:30 PM"
const formatTime = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

function TimeButton({ time, onPress }: { time: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border px-3 py-2"
      style={{ borderColor: colors.mistDark, backgroundColor: colors.mistLight }}
    >
      <Text className="text-sm font-semibold text-brand-dark">{formatTime(time)}</Text>
    </Pressable>
  );
}

// ================= The form =================

type Props = {
  initialValues?: RestaurantFormValues;
  /** Current image URLs (Edit screen) */
  initialLogo?: string;
  initialCover?: string;
  submitLabel: string;
  /** Return an error message to show it, or nothing on success */
  onSubmit: (input: RestaurantInput, images: RestaurantFormImages) => Promise<string | void>;
};

export default function RestaurantForm({ initialValues, initialLogo, initialCover, submitLabel, onSubmit }: Props) {
  const insets = useSafeAreaInsets(); // space taken by Android's nav bar / iPhone home bar
  const [values, setValues] = useState<RestaurantFormValues>(initialValues ?? emptyRestaurantValues());
  const [images, setImages] = useState<RestaurantFormImages>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ index: number; field: "open" | "close" } | null>(null);

  // Update one top-level field
  const set = <K extends keyof RestaurantFormValues>(key: K, value: RestaurantFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (error) setError("");
  };

  const setService = (key: keyof RestaurantFormValues["services"], on: boolean) =>
    set("services", { ...values.services, [key]: on });

  const setHour = (index: number, changes: Partial<OpeningHour>) =>
    set(
      "openingHours",
      values.openingHours.map((h, i) => (i === index ? { ...h, ...changes } : h))
    );

  const copyMondayToAll = () => {
    const monday = values.openingHours[0];
    if (!monday) return;
    set(
      "openingHours",
      values.openingHours.map((h) => ({ ...h, open: monday.open, close: monday.close, closed: monday.closed }))
    );
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    const current = picker;
    if (Platform.OS === "android") setPicker(null); // Android shows a dialog
    if (event.type === "set" && date && current) {
      setHour(current.index, { [current.field]: dateToTime(date) });
    }
  };

  const chooseCover = async () => {
    const picked = await pickImage([2, 1]);
    if (picked) setImages((i) => ({ ...i, cover: picked }));
  };
  const chooseLogo = async () => {
    const picked = await pickImage([1, 1]);
    if (picked) setImages((i) => ({ ...i, logo: picked }));
  };

  const handleSubmit = async () => {
    const result = valuesToInput(values);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError("");
    const message = await onSubmit(result.input, images);
    if (message) {
      setError(message);
      setSaving(false);
    }
    // On success the screen navigates away, so we leave "saving" on
  };

  const pickerHour = picker ? values.openingHours[picker.index] : undefined;
  const deliveryOff = !values.services.delivery;
  const dineInOff = !values.services.dineIn;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 0. Images */}
        <ImagesSection
          coverUri={images.cover?.uri ?? initialCover}
          logoUri={images.logo?.uri ?? initialLogo}
          name={values.name}
          onPickCover={chooseCover}
          onPickLogo={chooseLogo}
        />

        {/* 1. Basic info */}
        <Section title="Basic info" subtitle="What customers will see">
          <Field label="Restaurant name" required value={values.name} onChangeText={(t) => set("name", t)} placeholder="e.g. Savour Foods" autoCapitalize="words" />
          <Field label="Description" value={values.description} onChangeText={(t) => set("description", t)} placeholder="A short line about the restaurant" multiline />
          <CuisinesInput value={values.cuisines} onChange={(next) => set("cuisines", next)} />
          <View className="flex-row gap-3">
            <Field label="Phone" value={values.phone} onChangeText={(t) => set("phone", t)} placeholder="0512345678" keyboardType="phone-pad" autoCapitalize="none" />
            <Field label="Email" value={values.email} onChangeText={(t) => set("email", t)} placeholder="info@..." keyboardType="email-address" autoCapitalize="none" />
          </View>
        </Section>

        {/* 2. Address */}
        <Section title="Address" subtitle="Where the restaurant is">
          <Field label="Street address" required value={values.street} onChangeText={(t) => set("street", t)} placeholder="Plot 12, Jinnah Avenue" autoCapitalize="words" />
          <View className="flex-row gap-3">
            <Field label="Area" value={values.area} onChangeText={(t) => set("area", t)} placeholder="Blue Area" autoCapitalize="words" />
            <Field label="City" required value={values.city} onChangeText={(t) => set("city", t)} placeholder="Islamabad" autoCapitalize="words" />
          </View>
          <Text className="mb-2 mt-1 text-xs text-brand-light">
            Map coordinates (optional) — needed later for delivery distance and "near me"
          </Text>
          <View className="flex-row gap-3">
            <Field label="Latitude" value={values.lat} onChangeText={(t) => set("lat", t)} placeholder="33.7104" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            <Field label="Longitude" value={values.lng} onChangeText={(t) => set("lng", t)} placeholder="73.0563" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
          </View>
        </Section>

        {/* 3. Services */}
        <Section title="Services" subtitle="Turn on at least one">
          <ToggleRow icon="🍽️" label="Dine-in" description="Order ahead and reserve seats" value={values.services.dineIn} onChange={(v) => setService("dineIn", v)} />
          <ToggleRow icon="🥡" label="Takeaway" description="Customer picks up the order" value={values.services.takeaway} onChange={(v) => setService("takeaway", v)} />
          <ToggleRow icon="🛵" label="Delivery" description="Restaurant's own riders deliver" value={values.services.delivery} onChange={(v) => setService("delivery", v)} />
        </Section>

        {/* 4. Settings */}
        <Section title="Settings" subtitle="Prices are in PKR">
          {/* Always editable */}
          <Field label="Tax" value={values.taxRate} onChangeText={(t) => set("taxRate", t)} keyboardType="decimal-pad" suffix="%" />

          {/* Delivery settings */}
          <Text className="mb-2 mt-1 text-xs font-bold uppercase tracking-wide text-brand-light">Delivery</Text>
          {deliveryOff && <LockedNote text="Turn on Delivery to edit these" />}
          <View className="flex-row gap-3">
            <Field label="Minimum order" value={values.minOrder} onChangeText={(t) => set("minOrder", t)} keyboardType="decimal-pad" suffix="Rs" disabled={deliveryOff} />
            <Field label="Delivery fee" value={values.deliveryFee} onChangeText={(t) => set("deliveryFee", t)} keyboardType="decimal-pad" suffix="Rs" disabled={deliveryOff} />
          </View>
          <Field label="Delivery radius" value={values.deliveryRadiusKm} onChangeText={(t) => set("deliveryRadiusKm", t)} keyboardType="decimal-pad" suffix="km" disabled={deliveryOff} />

          {/* Dine-in settings */}
          <Text className="mb-2 mt-1 text-xs font-bold uppercase tracking-wide text-brand-light">Dine-in</Text>
          {dineInOff && <LockedNote text="Turn on Dine-in to edit these" />}
          <View className="flex-row gap-3">
            <Field label="Number of seats" required={!dineInOff} value={values.seatingCapacity} onChangeText={(t) => set("seatingCapacity", t)} keyboardType="number-pad" suffix="seats" disabled={dineInOff} />
            
          </View>
        </Section>

        {/* 5. Opening hours */}
        <Section title="Opening hours" subtitle="Closing before opening means after midnight">
          {values.openingHours.map((hour, index) => {
            const label = DAYS.find((d) => d.key === hour.day)?.label ?? hour.day;
            return (
              <View
                key={hour.day}
                className="flex-row items-center border-b py-2.5"
                style={{ borderColor: index === 6 ? "transparent" : colors.mist }}
              >
                <Text className="w-24 text-sm font-semibold text-brand-dark">{label}</Text>
                {hour.closed ? (
                  <Text className="flex-1 text-sm italic text-brand-light">Closed</Text>
                ) : (
                  <View className="flex-1 flex-row items-center gap-1.5">
                    <TimeButton time={hour.open} onPress={() => setPicker({ index, field: "open" })} />
                    <Text className="text-brand-light">–</Text>
                    <TimeButton time={hour.close} onPress={() => setPicker({ index, field: "close" })} />
                  </View>
                )}
                <Switch
                  value={!hour.closed}
                  onValueChange={(open) => setHour(index, { closed: !open })}
                  trackColor={{ false: colors.mistDark, true: colors.brandLight }}
                  thumbColor={!hour.closed ? colors.brand : colors.white}
                />
              </View>
            );
          })}

          <Pressable onPress={copyMondayToAll} className="mt-3 items-center rounded-2xl bg-brand-soft py-3">
            <Text className="text-sm font-bold text-brand">Copy Monday to all days</Text>
          </Pressable>

          {/* Time picker */}
          {picker && pickerHour && (
            <DateTimePicker
              value={timeToDate(pickerHour[picker.field])}
              mode="time"
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onTimeChange}
            />
          )}
          {picker && Platform.OS === "ios" && (
            <Pressable onPress={() => setPicker(null)} className="items-end">
              <Text className="font-semibold text-brand">Done</Text>
            </Pressable>
          )}
        </Section>
      </ScrollView>

      {/* Save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t bg-white px-4 pt-3"
        style={{ borderColor: colors.mistDark, paddingBottom: Math.max(insets.bottom, 12) + 8 }}
      >
        {!!error && <Text className="mb-2 text-center text-sm text-[#b42318]">{error}</Text>}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          android_ripple={{ color: colors.brandDark }}
          className="overflow-hidden rounded-2xl"
        >
          <View
            className="items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.brand, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-base font-bold text-white">{submitLabel}</Text>
            )}
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}