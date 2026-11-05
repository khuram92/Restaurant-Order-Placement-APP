import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { changePassword } from "../../services/authApi";

type IconName = ComponentProps<typeof Ionicons>["name"];
type FieldName = "current" | "new" | "confirm";

const BG = [colors.mist, colors.mist, colors.brand] as const;
const BUTTON = [colors.brand, colors.brandDark] as const;
const BUTTON_DISABLED = [colors.mistDark, colors.mistDark] as const;

const shadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: colors.brandDark,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: radius / 2 },
  elevation,
});

// Same rules as the backend (backend/src/utils/password.ts)
const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A special character (e.g. @ # $ !)", test: (p: string) => /[^A-Za-z\d]/.test(p) },
];

// ---------- Password input ----------
type PasswordFieldProps = {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  editable: boolean;
};

function PasswordField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  editable,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-brand-dark">{label}</Text>
      <View
        className="flex-row items-center rounded-2xl border-2 px-4"
        style={{
          borderColor: focused ? colors.brand : colors.mistDark,
          backgroundColor: focused ? colors.white : colors.mist,
        }}>
        <Ionicons name={icon} size={18} color={focused ? colors.brand : colors.brandLight} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          selectionColor={colors.brand}
          className="ml-3 flex-1 py-4 text-base"
          style={{ color: colors.text }}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10}>
          <Ionicons name={visible ? "eye-off" : "eye"} size={20} color={colors.brandLight} />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Screen ----------
export default function ChangePasswordScreen() {
  const { user, updateUser, signOut } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rulesPassed = RULES.every((r) => r.test(newPassword));
  const matches = confirmPassword.length > 0 && confirmPassword === newPassword;

  const clearError = () => {
    if (error) setError("");
  };

  const handleSave = async () => {
    setError("");

    if (!currentPassword) return setError("Enter the temporary password from your email");
    if (!rulesPassed) return setError("New password doesn't meet all the rules");
    if (newPassword !== confirmPassword) return setError("Passwords don't match");
    if (newPassword === currentPassword)
      return setError("Choose a password different from the temporary one");

    setLoading(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      updateUser(updated); // mustChangePassword: false → guards switch to (manager)
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const canSubmit = !!currentPassword && rulesPassed && matches && !loading;

  return (
    <LinearGradient colors={BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {/* Soft olive circles */}
      <View
        className="absolute -left-16 -top-10 h-56 w-56 rounded-full"
        style={{ backgroundColor: colors.brandLight, opacity: 0.18 }}
      />
      <View
        className="absolute -right-20 bottom-32 h-64 w-64 rounded-full"
        style={{ backgroundColor: colors.brand, opacity: 0.12 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="mb-8 items-center">
              <View
                className="h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.brand, ...shadow(0.35, 22, 10) }}>
                <Ionicons name="lock-closed" size={36} color={colors.white} />
              </View>
              <Text className="mt-4 text-3xl font-extrabold text-brand-dark">Set your password</Text>
              <Text className="mt-1 text-center text-base text-brand-light">
                {user?.firstName ? `Hi ${user.firstName}! ` : ""}For security, replace the temporary password
                we emailed you
              </Text>
            </View>

            {/* Card */}
            <View className="rounded-3xl p-6" style={{ backgroundColor: colors.mistLight, ...shadow(0.3, 30, 14) }}>
              <PasswordField
                label="Temporary password"
                icon="key"
                value={currentPassword}
                onChangeText={(t) => {
                  setCurrentPassword(t);
                  clearError();
                }}
                placeholder="From your email"
                focused={focused === "current"}
                onFocus={() => setFocused("current")}
                onBlur={() => setFocused(null)}
                editable={!loading}
              />
              <PasswordField
                label="New password"
                icon="lock-closed"
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  clearError();
                }}
                placeholder="Create a strong password"
                focused={focused === "new"}
                onFocus={() => setFocused("new")}
                onBlur={() => setFocused(null)}
                editable={!loading}
              />

              {/* Live rule checklist */}
              <View className="-mt-1 mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.brandSoft }}>
                {RULES.map((rule) => {
                  const ok = rule.test(newPassword);
                  return (
                    <View key={rule.label} className="flex-row items-center py-0.5">
                      <Ionicons
                        name={ok ? "checkmark-circle" : "ellipse"}
                        size={14}
                        color={ok ? colors.brand : colors.mistDark}
                      />
                      <Text
                        className="ml-2 text-xs"
                        style={{ color: ok ? colors.brandDark : colors.textMuted, fontWeight: ok ? "600" : "400" }}>
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <PasswordField
                label="Confirm new password"
                icon="lock-closed"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  clearError();
                }}
                placeholder="Type it again"
                focused={focused === "confirm"}
                onFocus={() => setFocused("confirm")}
                onBlur={() => setFocused(null)}
                editable={!loading}
              />

              {/* Match hint */}
              {confirmPassword.length > 0 && (
                <View className="-mt-2 mb-2 flex-row items-center">
                  <Ionicons
                    name={matches ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={matches ? colors.brand : colors.danger}
                  />
                  <Text className="ml-1 text-xs" style={{ color: matches ? colors.brandDark : colors.danger }}>
                    {matches ? "Passwords match" : "Passwords don't match"}
                  </Text>
                </View>
              )}

              {!!error && (
                <Text className="mb-2 mt-1 text-sm" style={{ color: colors.danger }}>
                  {error}
                </Text>
              )}

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={!canSubmit}
                style={({ pressed }) => ({
                  marginTop: 8,
                  borderRadius: 16,
                  opacity: pressed ? 0.85 : 1,
                  ...shadow(canSubmit ? 0.35 : 0, 12, canSubmit ? 6 : 0),
                })}>
                <LinearGradient
                  colors={canSubmit ? BUTTON : BUTTON_DISABLED}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="text-base font-bold tracking-wide text-white">Save password</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Escape hatch */}
            <Pressable onPress={signOut} className="mt-6 flex-row items-center justify-center" hitSlop={8}>
              <Text className="text-sm" style={{ color: colors.brandDark }}>
                Not you?{" "}
              </Text>
              <Ionicons name="log-out" size={15} color={colors.white} />
              <Text className="ml-1 text-sm font-bold text-white">Log out</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}