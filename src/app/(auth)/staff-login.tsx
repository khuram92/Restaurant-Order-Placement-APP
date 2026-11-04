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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { staffLogin } from "../../services/authApi";
import { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

// Same palette as the other auth screens
const COLORS = {
  bg: ["#e0e1df", "#e0e1df", "#F9A8D4"] as const,
  button: ["#4e5c4a", "#EC4899"] as const,
  buttonDisabled: ["#F9C6DC", "#F5B5D0"] as const,
  focus: "#4e5c4a",
}

const pShadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: COLORS.focus,
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
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("Enter a valid email");
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

  const fieldBorder = (name: "email" | "password") =>
    error ? "#EF4444" : focused === name ? COLORS.focus : "#F3D1DE";

  return (
    <LinearGradient colors={COLORS.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-pink-300 opacity-40" />
      <View className="absolute -right-20 bottom-32 h-64 w-64 rounded-full bg-rose-300 opacity-50" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6"
        >
          {/* Header */}
          <View className="mb-8 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full bg-gray-100"
              style={pShadow(0.35, 22, 18)}
            >
              <Text className="text-4xl">🛡️</Text>
            </View>
            <Text className="mt-4 text-3xl font-extrabold text-[#4e5c4a]">Staff Login</Text>
            <Text className="mt-1 text-center text-base text-[#4e5c4a]/70">
              For admins and restaurant managers
            </Text>
          </View>

          {/* White card */}
          <View className="rounded-3xl bg-gray-100 p-6" style={pShadow(0.35, 34, 18)}>
            {/* Email */}
            <Text className="mb-2 text-sm font-semibold text-gray-800">Email</Text>
            <View
              className={`mb-4 flex-row items-center rounded-2xl border-2 px-4 ${
                focused === "email" ? "bg-[#e0e1df]" : "bg-gray-50"
              }`}
              style={{ borderColor: fieldBorder("email") }}
            >
              <Text className="mr-2 text-lg">✉️</Text>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="admin@example.com"
                placeholderTextColor="#C9A3B5"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                selectionColor={COLORS.focus}
                className="flex-1 py-4 text-base text-gray-900"
              />
            </View>

            {/* Password */}
            <Text className="mb-2 text-sm font-semibold text-gray-700">Password</Text>
            <View
              className={`flex-row items-center rounded-2xl border-2 px-4 ${
                focused === "password" ? "bg-[#e0e1df]" : "bg-gray-50"
              }`}
              style={{ borderColor: fieldBorder("password") }}
            >
              <Text className="mr-2 text-lg">🔑</Text>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="Your password"
                placeholderTextColor="#C9A3B5"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
                selectionColor={COLORS.focus}
                className="flex-1 py-4 text-base text-gray-900"
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                <Text className="text-sm font-semibold text-[#4e5c4a]">
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>

            {!!error && <Text className="mt-3 text-sm text-red-500">{error}</Text>}

            {/* Login button */}
            <Pressable
            className="mt-6"
              onPress={handleLogin}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                marginTop: 24,
                borderRadius: 16,
                opacity: pressed ? 0.85 : 1,
                ...pShadow(canSubmit ? 0.4 : 0, 12, canSubmit ? 6 : 0),
              })}
            >
              <LinearGradient
                colors={canSubmit ? COLORS.button : COLORS.buttonDisabled}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold tracking-wide text-white">Log in</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Back to customer login */}
          <Pressable onPress={() => router.back()} className="mt-6 items-center" hitSlop={8}>
            <Text className="text-sm text-[#4e5c4a]">
              Not staff? <Text className="font-bold text-pink-600">Customer login</Text>
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}