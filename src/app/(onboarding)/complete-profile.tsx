import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import AvatarPicker from "../../components/AvatarPicker";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { completeProfile } from "../../services/authApi";
import type { CompleteProfileInput } from "../../types/auth";
import { parseIdentifier } from "../../utils/identifier";

// Same palette as the auth screens
const COLORS = {
  bg: ["#e0e1df", "#e0e1df", "#F9A8D4"] as const,
  button: ["#4e5c4a", "#F9A8D4"] as const,
  buttonDisabled: ["#4e5c4a", "#F9A8D4"] as const,
  focus: "#4e5c4a",
};
const pShadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: COLORS.focus,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: radius / 2 },
  elevation,
});

// 2000-05-15 (local date, no timezone shift)
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 15 May 2000
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

// ---------- Reusable input field ----------
type FieldProps = {
  label: string;
  icon: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  locked?: boolean;
  optional?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
};

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
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-700">{label}</Text>
        {locked && <Text className="text-xs text-pink-500">🔒 Verified</Text>}
        {optional && <Text className="text-xs text-gray-400">Optional</Text>}
      </View>
      <View
        className={`flex-row items-center rounded-2xl border-2 px-4 ${
          locked ? "bg-pink-50" : focused ? "bg-pink-50" : "bg-gray-50"
        }`}
        style={{
          borderColor: locked ? "#FBCFE8" : focused ? COLORS.focus : "#F3D1DE",
        }}>
        <Text className="mr-2 text-lg">{icon}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#C9A3B5"
          editable={!locked}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={COLORS.focus}
          className={`flex-1 py-4 text-base ${locked ? "text-gray-500" : "text-gray-900"}`}
        />
      </View>
    </View>
  );
}

// ---------- Screen ----------
export default function CompleteProfileScreen() {
  const { user, updateUser, signOut } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [dob, setDob] = useState<Date | null>(
    user?.dob ? new Date(user.dob) : null,
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The contact used to log in is locked
  const emailLocked = !!user?.email;
  const phoneLocked = !!user?.phone;
  // Initials from what the user is typing (e.g. "AK")
  const initials =
    `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
  const onDobChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false); // Android shows a dialog
    if (event.type === "set" && date) {
      setDob(date);
      if (error) setError("");
    }
  };

  const handleSave = async () => {
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

    // Optional second contact (only the one that isn't locked)
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

    setLoading(true);
    try {
      const updated = await completeProfile(input);
      updateUser(updated); // profileCompleted: true → guards switch to (customer)
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    !!dob &&
    !loading;

  return (
    <LinearGradient
      colors={COLORS.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}>
      <View className="absolute -left-16 -top-24 h-56 w-56 rounded-full bg-rose-300 opacity-40" />
      <View className="absolute -right-20 -bottom-24 h-60 w-60 rounded-full bg-pink-400 opacity-30" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1">
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="mb-6 items-center">
              <AvatarPicker initials={initials} />
              <Text className="mt-4 text-3xl font-extrabold text-[#4e5c4a]">
                Almost there!
              </Text>
              <Text className="mt-1 text-center text-base text-[#4e5c4a]/80">
                Tell us a bit about yourself to finish setting up your account
              </Text>
            </View>

            {/* White card */}
            <View
              className="rounded-3xl bg-white p-6"
              style={pShadow(0.25, 24, 12)}>
              {/* Names side by side */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label="First name"
                    icon="👤"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Ali"
                  />
                </View>
                <View className="flex-1">
                  <Field
                    label="Last name"
                    icon="👤"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Khan"
                  />
                </View>
              </View>

              {/* Date of birth */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold text-gray-700">
                  Date of birth
                </Text>
                <Pressable
                  onPress={() => setShowPicker(true)}
                  className={`flex-row items-center rounded-2xl border-2 px-4 py-4 ${
                    showPicker ? "bg-pink-50" : "bg-gray-50"
                  }`}
                  style={{ borderColor: showPicker ? COLORS.focus : "#F3D1DE" }}>
                  <Text className="mr-2 text-lg">🎂</Text>
                  <Text
                    className={`flex-1 text-base ${dob ? "text-gray-900" : "text-[#C9A3B5]"}`}>
                    {dob ? formatDate(dob) : "Select your date of birth"}
                  </Text>
                  <Text className="text-pink-400">▾</Text>
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

                {/* iOS spinner stays inline, so it needs a Done button */}
                {showPicker && Platform.OS === "ios" && (
                  <Pressable
                    onPress={() => setShowPicker(false)}
                    className="items-end">
                    <Text className="font-semibold text-pink-600">Done</Text>
                  </Pressable>
                )}
              </View>

              {/* Contacts: the login one is locked, the other is optional */}
              <Field
                label="Email"
                icon="✉️"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                locked={emailLocked}
                optional={!emailLocked}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Phone"
                icon="📱"
                value={phone}
                onChangeText={setPhone}
                placeholder="03001234567"
                locked={phoneLocked}
                optional={!phoneLocked}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              {!!error && (
                <Text className="mb-2 text-sm text-red-500">{error}</Text>
              )}

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={!canSubmit}
                style={({ pressed }) => ({
                  marginTop: 8,
                  borderRadius: 16,
                  opacity: pressed ? 0.85 : 1,
                  ...pShadow(canSubmit ? 0.4 : 0, 12, canSubmit ? 6 : 0),
                })}>
                <LinearGradient
                  colors={canSubmit ? COLORS.button : COLORS.buttonDisabled}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-bold tracking-wide text-white">
                      Save & continue
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Escape hatch */}
            <Pressable
              onPress={signOut}
              className="mt-6 items-center"
              hitSlop={8}>
              <Text className="text-sm text-pink-900/70">
                Not you?{" "}
                <Text className="font-bold text-pink-600">Log out</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
