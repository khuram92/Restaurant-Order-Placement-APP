import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
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
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, cardShadow } from "../../constants/theme";
import type { Day, OpeningHour, Restaurant, RestaurantInput } from "../../types/restaurant";

// ================= Form values =================
// Numbers are kept as strings while typing, and converted on submit.

export interface RestaurantFormValues {
  name: string;
  description: string;
  cuisines: string; // "Pakistani, BBQ"
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
  tableHoldMinutes: string;
  openingHours: OpeningHour[];
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

export const emptyRestaurantValues = (): RestaurantFormValues => ({
  name: "",
  description: "",
  cuisines: "",
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
  tableHoldMinutes: "30",
  openingHours: DAYS.map((d) => ({ day: d.key, open: "11:00", close: "23:00", closed: false })),
});

/** Restaurant from the API → form values (used by the Edit screen later) */
export const restaurantToValues = (r: Restaurant): RestaurantFormValues => ({
  name: r.name,
  description: r.description ?? "",
  cuisines: r.cuisines.join(", "),
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
  tableHoldMinutes: String(r.tableHoldMinutes),
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
    tableHoldMinutes: num(v.tableHoldMinutes),
  };
  if (Object.values(fields).some((n) => Number.isNaN(n) || n < 0)) {
    return { error: "Fees, tax and times must be positive numbers" };
  }
  if (fields.taxRate > 100) return { error: "Tax can't be over 100%" };
  if (fields.deliveryRadiusKm > 50) return { error: "Delivery radius can be at most 50 km" };
  if (!Number.isInteger(fields.tableHoldMinutes) || fields.tableHoldMinutes < 5 || fields.tableHoldMinutes > 240) {
    return { error: "Table hold time must be 5–240 minutes" };
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

  const cuisines = v.cuisines
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    input: {
      name: v.name.trim(),
      ...(v.description.trim() && { description: v.description.trim() }),
      cuisines,
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
  keyboardType,
  autoCapitalize = "sentences",
  multiline,
  suffix,
}: FieldProps) {
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

function TimeButton({ time, onPress, disabled }: { time: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: colors.mistDark,
        backgroundColor: disabled ? colors.mist : colors.mistLight,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text className="text-sm font-semibold text-brand-dark">{formatTime(time)}</Text>
    </Pressable>
  );
}

// ================= The form =================

type Props = {
  initialValues?: RestaurantFormValues;
  submitLabel: string;
  /** Return an error message to show it, or nothing on success */
  onSubmit: (input: RestaurantInput) => Promise<string | void>;
};

export default function RestaurantForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<RestaurantFormValues>(initialValues ?? emptyRestaurantValues());
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

  const handleSubmit = async () => {
    const result = valuesToInput(values);
    if (result.error !== undefined) {
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
    // On success the screen navigates away, so we leave "saving" on
  };

  const pickerHour = picker ? values.openingHours[picker.index] : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Basic info */}
        <Section title="Basic info" subtitle="What customers will see">
          <Field label="Restaurant name" required value={values.name} onChangeText={(t) => set("name", t)} placeholder="e.g. Savour Foods" autoCapitalize="words" />
          <Field label="Description" value={values.description} onChangeText={(t) => set("description", t)} placeholder="A short line about the restaurant" multiline />
          <Field label="Cuisines" value={values.cuisines} onChangeText={(t) => set("cuisines", t)} placeholder="Pakistani, BBQ, Chinese" autoCapitalize="words" />
          {!!values.cuisines.trim() && (
            <View className="-mt-1 mb-3 flex-row flex-wrap gap-1.5">
              {values.cuisines
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
                .map((c, i) => (
                  <View key={`${c}-${i}`} className="rounded-full bg-brand-soft px-3 py-1">
                    <Text className="text-xs font-semibold text-brand">{c}</Text>
                  </View>
                ))}
            </View>
          )}
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
          <ToggleRow icon="🍽️" label="Dine-in" description="Order ahead and reserve a table" value={values.services.dineIn} onChange={(v) => setService("dineIn", v)} />
          <ToggleRow icon="🥡" label="Takeaway" description="Customer picks up the order" value={values.services.takeaway} onChange={(v) => setService("takeaway", v)} />
          <ToggleRow icon="🛵" label="Delivery" description="Restaurant's own riders deliver" value={values.services.delivery} onChange={(v) => setService("delivery", v)} />
        </Section>

        {/* 4. Settings */}
        <Section title="Settings" subtitle="Prices are in PKR">
          <View className="flex-row gap-3">
            <Field label="Minimum order" value={values.minOrder} onChangeText={(t) => set("minOrder", t)} keyboardType="decimal-pad" suffix="Rs" />
            <Field label="Tax" value={values.taxRate} onChangeText={(t) => set("taxRate", t)} keyboardType="decimal-pad" suffix="%" />
          </View>
          {values.services.delivery && (
            <View className="flex-row gap-3">
              <Field label="Delivery fee" value={values.deliveryFee} onChangeText={(t) => set("deliveryFee", t)} keyboardType="decimal-pad" suffix="Rs" />
              <Field label="Delivery radius" value={values.deliveryRadiusKm} onChangeText={(t) => set("deliveryRadiusKm", t)} keyboardType="decimal-pad" suffix="km" />
            </View>
          )}
          {values.services.dineIn && (
            <Field label="Table hold time" value={values.tableHoldMinutes} onChangeText={(t) => set("tableHoldMinutes", t)} keyboardType="number-pad" suffix="min" />
          )}
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
        className="absolute bottom-0 left-0 right-0 border-t bg-white px-4 pb-6 pt-3"
        style={{ borderColor: colors.mist }}
      >
        {!!error && <Text className="mb-2 text-center text-sm text-[#b42318]">{error}</Text>}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          className="items-center rounded-2xl py-4"
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.brandDark : colors.brand,
            opacity: saving ? 0.7 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-base font-bold text-white">{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}