import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { getCurrentAddress } from "../../lib/location";
import { setMyLocation } from "../../lib/myLocation";
import { saveAddress, updateAddress } from "../../services/addressApi";
import type { AddressInput, AddressLabel, SavedAddress } from "../../types/address";
import { ADDRESS_LABEL_INFO } from "../../utils/addressFormat";

const PK_PHONE = /^03\d{9}$/;

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  optional,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  optional?: boolean;
}) {
  return (
    <View className="mb-3 flex-1">
      <View className="mb-1.5 flex-row justify-between">
        <Text className="text-sm font-semibold text-brand-dark">{label}</Text>
        {optional && <Text className="text-xs text-brand-light">Optional</Text>}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        className="rounded-2xl border-2 px-4 py-3 text-base"
        style={{ borderColor: colors.mistDark, backgroundColor: colors.mistLight, color: colors.text }}
      />
    </View>
  );
}

/**
 * Add / edit a saved address. `editing` = null → closed, "new" → add, an address → edit.
 */
export default function AddressSheet({
  editing,
  defaultPhone,
  onClose,
  onSaved,
}: {
  editing: SavedAddress | "new" | null;
  defaultPhone?: string;
  onClose: () => void;
  onSaved: (addresses: SavedAddress[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState<AddressLabel>("home");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fill the form every time the sheet opens
  useEffect(() => {
    if (!editing) return;
    const a = editing === "new" ? null : editing;
    setLabel(a?.label ?? "home");
    setName(a?.name ?? "");
    setStreet(a?.street ?? "");
    setArea(a?.area ?? "");
    setCity(a?.city ?? "");
    setPhone(a?.phone ?? defaultPhone ?? "");
    setInstructions(a?.instructions ?? "");
    setPin(a?.location ?? null);
    setError("");
  }, [editing, defaultPhone]);

  if (!editing) return null;

  const fillLocation = async () => {
    setLocating(true);
    setError("");
    try {
      const here = await getCurrentAddress();
      setMyLocation(here, true);
      setPin({ lat: here.lat, lng: here.lng });
      if (here.street) setStreet(here.street);
      if (here.area) setArea(here.area);
      if (here.city) setCity(here.city);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location");
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (label === "other" && !name.trim()) return setError("Give this address a name (e.g. Mom's place)");
    if (street.trim().length < 3) return setError("Enter the street / house address");
    if (city.trim().length < 2) return setError("Enter the city");
    if (!PK_PHONE.test(phone.trim())) return setError("Enter a phone number like 03001234567");

    const input: AddressInput = {
      label,
      street: street.trim(),
      city: city.trim(),
      phone: phone.trim(),
      ...(label === "other" && { name: name.trim() }),
      ...(area.trim() && { area: area.trim() }),
      ...(instructions.trim() && { instructions: instructions.trim() }),
      ...(pin && { location: pin }),
    };

    setBusy(true);
    setError("");
    try {
      const list = editing === "new" ? await saveAddress(input) : await updateAddress(editing._id, input);
      onSaved(list);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={busy ? undefined : onClose} />
        <View className="max-h-[88%] rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />
          <Text className="mb-4 text-xl font-extrabold text-brand-dark">
            {editing === "new" ? "Add address" : "Edit address"}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Home / Work / Other */}
            <View className="mb-3 flex-row gap-2">
              {(Object.keys(ADDRESS_LABEL_INFO) as AddressLabel[]).map((l) => {
                const on = label === l;
                return (
                  <Pressable
                    key={l}
                    onPress={() => setLabel(l)}
                    className="flex-1 flex-row items-center justify-center rounded-2xl border-2 py-2.5"
                    style={{ borderColor: on ? colors.brand : colors.mistDark, backgroundColor: on ? colors.brand : colors.white }}>
                    <Ionicons name={ADDRESS_LABEL_INFO[l].icon} size={16} color={on ? colors.white : colors.brand} />
                    <Text className="ml-1.5 font-bold" style={{ color: on ? colors.white : colors.brand }}>
                      {ADDRESS_LABEL_INFO[l].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {label === "other" && (
              <Input label="Name" value={name} onChangeText={setName} placeholder="Mom's place" maxLength={30} />
            )}

            {/* GPS */}
            <Pressable
              onPress={fillLocation}
              disabled={locating}
              className="mb-1 flex-row items-center justify-center rounded-2xl border-2 py-3 active:opacity-80"
              style={{ borderColor: colors.brand, backgroundColor: pin ? colors.brandSoft : colors.white }}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name={pin ? "checkmark-circle" : "navigate"} size={18} color={colors.brand} />
              )}
              <Text className="ml-2 font-bold text-brand">
                {locating ? "Finding you…" : pin ? "Location pinned · tap to update" : "Use my current location"}
              </Text>
            </Pressable>
            <Text className="mb-3 text-xs text-brand-light">
              {pin
                ? "The pin is used to check delivery range and the delivery fee."
                : "Tip: save this while you're at this address so the pin is exact."}
            </Text>

            <Input label="Street / house" value={street} onChangeText={setStreet} placeholder="House 12, Street 5" maxLength={150} />
            <View className="flex-row gap-3">
              <Input label="Area" value={area} onChangeText={setArea} placeholder="Gulberg" maxLength={80} optional />
              <Input label="City" value={city} onChangeText={setCity} placeholder="Lahore" maxLength={60} />
            </View>
            <Input
              label="Phone for the rider"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ""))}
              placeholder="03001234567"
              keyboardType="phone-pad"
              maxLength={11}
            />
            <Input label="Directions" value={instructions} onChangeText={setInstructions} placeholder="Near the blue gate" maxLength={200} optional />

            {!!error && (
              <Text className="mb-3 text-sm font-semibold" style={{ color: colors.danger }}>
                {error}
              </Text>
            )}
          </ScrollView>

          <Pressable
            onPress={save}
            disabled={busy}
            className="mt-1 items-center rounded-2xl py-4"
            style={{ backgroundColor: busy ? colors.brandLight : colors.brandDark }}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text className="text-base font-bold text-white">Save address</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}