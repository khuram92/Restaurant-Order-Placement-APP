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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { requestOtp } from "../../services/authApi";
import { getErrorMessage } from "../../lib/api";
import { parseIdentifier } from "../../utils/identifier";

// Pink palette
const COLORS = {
  bg: ["#e0e1df", "#e0e1df", "#F9A8D4"] as const,      // baby pink → pink
  button: ["#4e5c4a", "#EC4899"] as const,             // pink → hot pink
  buttonDisabled: ["#F9C6DC", "#F5B5D0"] as const,
  focus: "#4e5c4a",
};

export default function LoginScreen() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleContinue = async () => {
    setError("");

    const parsed = parseIdentifier(input);
    if (!parsed) {
      setError("Enter a valid email or phone number (03XXXXXXXXX)");
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtp(parsed.identifier);

      router.push({
        pathname: "/verify-otp",
        params: {
          identifier: parsed.identifier,
          channel: res.channel,
          isNewUser: String(res.isNewUser), // params must be strings
          ...(__DEV__ && res.devOtp ? { devOtp: res.devOtp } : {}),
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = input.trim().length > 0 && !loading;

  // Icon changes based on what the user is typing
  const inputIcon = input.includes("@") ? "✉️" : /^\+?\d/.test(input.trim()) ? "📱" : "👤";

  const borderColor = error ? "#EF4444" : focused ? COLORS.focus : "#F3D1DE";

  return (
    <LinearGradient colors={COLORS.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {/* Soft decorative blobs */}
      <View className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-pink-300 opacity-40" />
      <View className="absolute -right-20 top-40 h-64 w-64 rounded-full bg-rose-200 opacity-50" />
      <View className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-pink-200 opacity-60" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6"
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} className="mb-8 items-center">
            <View
              className="h-24 w-24 items-center justify-center rounded-full bg-white"
              style={{
                shadowColor: COLORS.focus,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <Text className="text-5xl">🍽️</Text>
            </View>
            <Text className="mt-5 text-3xl font-extrabold text-pink-600">Welcome</Text>
            <Text className="mt-2 text-center text-base text-pink-900/70">
              Log in or sign up with your phone number or email
            </Text>
          </Animated.View>

          {/* White card */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600).springify()}
            className="rounded-3xl bg-white p-6"
            style={{
              shadowColor: COLORS.focus,
              shadowOpacity: 0.25,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}
          >
            {/* Input */}
            <Text className="mb-2 text-sm font-semibold text-gray-700">Phone or Email</Text>
            <View
              className={`flex-row items-center rounded-2xl mb-4 border-2 px-4 ${
                focused ? "bg-pink-50" : "bg-gray-50"
              }`}
              style={{
                borderColor,
                // Pink glow while focused
                shadowColor: COLORS.focus,
                shadowOpacity: focused ? 0.25 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: focused ? 4 : 0,
              }}
            >
              <Text className="mr-2 text-lg">{inputIcon}</Text>
              <TextInput
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  if (error) setError("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="03001234567 or you@example.com"
                placeholderTextColor="#C9A3B5"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!loading}
                selectionColor={COLORS.focus}
                className="flex-1 py-4 text-base text-gray-900"
              />
            </View>

            {!!error && (
              <Animated.Text entering={FadeInDown.duration(250)} className="mt-2 text-sm text-red-500">
                {error}
              </Animated.Text>
            )}

            {/* Gradient button with press effect */}
            <Pressable
              onPress={handleContinue}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                marginTop: 24,
                borderRadius: 16,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                shadowColor: COLORS.focus,
                shadowOpacity: canSubmit ? 0.4 : 0,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: canSubmit ? 6 : 0,
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
                  <Text className="text-base font-bold tracking-wide text-white">Continue</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Text className="mt-5 text-center text-xs text-gray-400">
              We'll send you a 6-digit code to verify it's you 💗
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}