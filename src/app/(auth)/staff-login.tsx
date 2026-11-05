import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { staffLogin } from "../../services/authApi";

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

export default function StaffLoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail))
      return setError("Enter a valid email");
    if (!password) return setError("Enter your password");

    setLoading(true);
    try {
      const res = await staffLogin(cleanEmail, password);
      await signIn(res.token, res.user);
      // No navigation needed: the root layout sends staff to their area
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const fieldStyle = (name: "email" | "password") => ({
    borderColor: error
      ? colors.danger
      : focused === name
        ? colors.brand
        : colors.mistDark,
    backgroundColor: focused === name ? colors.white : colors.mist,
  });
  const iconColor = (name: "email" | "password") =>
    focused === name ? colors.brand : colors.brandLight;

  return (
    <LinearGradient
      colors={BG}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-8 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{
                backgroundColor: colors.brand,
                ...shadow(0.35, 22, 10),
              }}>
              <Ionicons
                name="shield-checkmark"
                size={38}
                color={colors.white}
              />
            </View>
            <Text className="mt-4 text-3xl font-extrabold text-brand-dark">
              Staff Login
            </Text>
            <Text className="mt-1 text-center text-base text-brand-light">
              For admins and restaurant managers
            </Text>
          </View>

          {/* Card */}
          <View
            className="rounded-3xl p-6"
            style={{
              backgroundColor: colors.mistLight,
              ...shadow(0.3, 30, 14),
            }}>
            {/* Email */}
            <Text className="mb-2 text-sm font-semibold text-brand-dark">
              Email
            </Text>
            <View
              className="mb-4 flex-row items-center rounded-2xl border-2 px-4"
              style={fieldStyle("email")}>
              <Ionicons name="mail" size={18} color={iconColor("email")} />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="admin@example.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                selectionColor={colors.brand}
                className="ml-3 flex-1 py-4 text-base text-[#2c3329]"
              />
            </View>

            {/* Password */}
            <Text className="mb-2 text-sm font-semibold text-brand-dark">
              Password
            </Text>
            <View
              className="flex-row items-center rounded-2xl border-2 px-4"
              style={fieldStyle("password")}>
              <Ionicons name="key" size={18} color={iconColor("password")} />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="Your password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
                selectionColor={colors.brand}
                className="ml-3 flex-1 py-4 text-base text-[#2c3329]"
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={10}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.brandLight}
                />
              </Pressable>
            </View>

            {!!error && (
              <Text className="mt-3 text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            )}

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                marginTop: 24,
                borderRadius: 16,
                opacity: pressed ? 0.85 : 1,
                ...shadow(canSubmit ? 0.35 : 0, 12, canSubmit ? 6 : 0),
              })}>
              <LinearGradient
                colors={canSubmit ? BUTTON : BUTTON_DISABLED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                }}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="text-base font-bold tracking-wide text-white">
                    Log in
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Back to customer login */}
          <Pressable
            onPress={() => router.back()}
            className="mt-6 items-center"
            hitSlop={8}>
            <Text className="text-sm" style={{ color: colors.brandDark }}>
              Not staff?{" "}
              <Text className="font-bold text-white">Customer login</Text>
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
