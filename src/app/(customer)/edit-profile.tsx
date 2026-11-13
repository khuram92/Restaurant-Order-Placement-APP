import AvatarPicker from "@/components/AvatarPicker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { completeProfile } from "../../services/authApi";
import type { CompleteProfileInput } from "../../types/auth";
import { parseIdentifier } from "../../utils/identifier";

type IconName = ComponentProps<typeof Ionicons>["name"];

// 2000-05-15 (local date, no timezone shift)
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const today = new Date();
const hundredYearsAgo = new Date(
  today.getFullYear() - 100,
  today.getMonth(),
  today.getDate(),
);

// ---------- Input field ----------
function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  locked,
  optional,
  keyboardType,
  autoCapitalize = "words",
}: {
  label: string;
  icon: IconName;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  locked?: boolean;
  optional?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
}) {
  const [focused, setFocused] = useState(false);
  const active = focused && !locked;

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-brand-dark">{label}</Text>
        {locked && (
          <View className="flex-row items-center">
            <Ionicons name="lock-closed" size={11} color={colors.brand} />
            <Text className="ml-1 text-xs font-semibold text-brand">
              Can't be changed
            </Text>
          </View>
        )}
        {optional && <Text className="text-xs text-brand-light">Optional</Text>}
      </View>
      <View
        className="flex-row items-center rounded-2xl border-2 px-4"
        style={{
          borderColor: active ? colors.brand : colors.mistDark,
          backgroundColor: locked
            ? colors.brandSoft
            : active
              ? colors.white
              : colors.mistLight,
        }}>
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.brand : colors.brandLight}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          editable={!locked}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={colors.brand}
          className="ml-3 flex-1 py-4 text-base"
          style={{ color: locked ? colors.textMuted : colors.text }}
        />
      </View>
    </View>
  );
}

// ---------- Screen ----------
export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [dob, setDob] = useState<Date | null>(
    user?.dob ? new Date(user.dob) : null,
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // A contact that's already on the account can't be changed here
  const emailLocked = !!user?.email;
  const phoneLocked = !!user?.phone;

  const initials =
    `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();

  // Has anything changed? (Save is off until it has)
  const changed =
    firstName.trim() !== (user?.firstName ?? "") ||
    lastName.trim() !== (user?.lastName ?? "") ||
    (dob ? toYMD(dob) : "") !== (user?.dob ? toYMD(new Date(user.dob)) : "") ||
    (!emailLocked && !!email.trim()) ||
    (!phoneLocked && !!phone.trim());

  const valid =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && !!dob;

  const onDobChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false); // Android shows a dialog
    if (event.type === "set" && date) {
      setDob(date);
      if (error) setError("");
    }
  };

  const save = async () => {
    setError("");
    if (firstName.trim().length < 2)
      return setError("Enter your first name (at least 2 characters)");
    if (lastName.trim().length < 2)
      return setError("Enter your last name (at least 2 characters)");
    if (!dob) return setError("Select your date of birth");

    const input: CompleteProfileInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob: toYMD(dob),
    };

    if (!emailLocked && email.trim()) {
      const parsed = parseIdentifier(email);
      if (!parsed || parsed.channel !== "email")
        return setError("Enter a valid email");
      input.email = parsed.identifier;
    }
    if (!phoneLocked && phone.trim()) {
      const parsed = parseIdentifier(phone);
      if (!parsed || parsed.channel !== "phone")
        return setError("Enter a valid phone number (03XXXXXXXXX)");
      input.phone = parsed.identifier;
    }

    setSaving(true);
    try {
      updateUser(await completeProfile(input));
      router.back();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const canSave = valid && changed && !saving;

  return (
    <View className="flex-1 bg-mist">
      {/* Header */}
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <Text className="ml-3 text-xl font-extrabold text-white">
              Edit profile
            </Text>
          </View>
        </SafeAreaView>
      </View>

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
          {/* Photo (uploads straight away when picked) */}
          <View className="mb-5 items-center pt-2">
            <AvatarPicker initials={initials} />
          </View>

          {/* Personal */}
          <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
            <Text className="mb-4 text-base font-bold text-brand-dark">
              About you
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="First name"
                  icon="person"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ali"
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Last name"
                  icon="person"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Khan"
                />
              </View>
            </View>

            <Text className="mb-2 text-sm font-semibold text-brand-dark">
              Date of birth
            </Text>
            <Pressable
              onPress={() => setShowPicker(true)}
              className="flex-row items-center rounded-2xl border-2 px-4 py-4"
              style={{
                borderColor: showPicker ? colors.brand : colors.mistDark,
                backgroundColor: showPicker ? colors.white : colors.mistLight,
              }}>
              <Ionicons
                name="calendar"
                size={18}
                color={showPicker ? colors.brand : colors.brandLight}
              />
              <Text
                className="ml-3 flex-1 text-base"
                style={{ color: dob ? colors.text : colors.placeholder }}>
                {dob ? formatDate(dob) : "Select your date of birth"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.brandLight}
              />
            </Pressable>
            {showPicker && (
              <DateTimePicker
                value={dob ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={today}
                minimumDate={hundredYearsAgo}
                onChange={onDobChange}
              />
            )}
            {showPicker && Platform.OS === "ios" && (
              <Pressable
                onPress={() => setShowPicker(false)}
                className="mt-2 items-end">
                <Text className="font-bold text-brand">Done</Text>
              </Pressable>
            )}
          </View>

          {/* Contact */}
          <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
            <Text className="mb-1 text-base font-bold text-brand-dark">
              Contact
            </Text>
            <Text className="mb-4 text-xs text-brand-light">
              A contact already on your account is locked, because you sign in
              with it.
            </Text>
            <Field
              label="Phone"
              icon="call"
              value={phone}
              onChangeText={setPhone}
              placeholder="03001234567"
              locked={phoneLocked}
              optional={!phoneLocked}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <Field
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              locked={emailLocked}
              optional={!emailLocked}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!!error && (
            <View
              className="mb-2 flex-row items-center rounded-2xl p-3"
              style={{ backgroundColor: "#fde8e6" }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text
                className="ml-2 flex-1 text-sm"
                style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-3"
        style={{
          backgroundColor: colors.mist,
          paddingBottom: insets.bottom + 12,
        }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={[
            canSave ? cardShadow : null,
            { backgroundColor: canSave ? colors.brand : colors.mistDark },
          ]}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.white}
              />
              <Text className="ml-1.5 text-base font-bold text-white">
                {changed ? "Save changes" : "No changes yet"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
