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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { requestOtp } from "../../services/authApi";
import { parseIdentifier } from "../../utils/identifier";

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
  const inputIcon = input.includes("@")
    ? "mail"
    : /^\+?\d/.test(input.trim())
      ? "call"
      : "person";

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.brand
      : colors.mistDark;

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
        className="absolute -right-20 top-40 h-64 w-64 rounded-full"
        style={{ backgroundColor: colors.brand, opacity: 0.12 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6">
          {/* Header */}
          <Animated.View
            entering={FadeInUp.duration(600)}
            className="mb-10 items-center">
            <View
              className="h-24 w-24 items-center justify-center rounded-full"
              style={{
                backgroundColor: colors.brand,
                ...shadow(0.35, 22, 10),
              }}>
              <Ionicons name="restaurant" size={44} color={colors.white} />
            </View>
            <Text className="mt-5 text-3xl font-extrabold text-brand-dark">
              Welcome
            </Text>
            <Text className="mt-2 text-center text-base text-brand-light">
              Log in or sign up with your phone number or email
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600).springify()}
            className="rounded-3xl p-6"
            style={{
              backgroundColor: colors.mistLight,
              ...shadow(0.3, 30, 14),
            }}>
            {/* Input */}
            <Text className="mb-2 text-base font-semibold text-brand-dark">
              Phone or Email
            </Text>
            <View
              className="flex-row items-center rounded-2xl border-2 px-4"
              style={{
                borderColor,
                backgroundColor: focused ? colors.white : colors.white,
                ...shadow(focused ? 0.2 : 0, 8, focused ? 4 : 0),
              }}>
              <Ionicons
                name={inputIcon}
                size={20}
                color={focused ? colors.brand : colors.brandLight}
              />
              <TextInput
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                  if (error) setError("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="03001234567 or you@example.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!loading}
                selectionColor={colors.brand}
                className="ml-3 flex-1 py-4 text-base text-[#2c3329]"
              />
            </View>

            {!!error && (
              <Animated.Text
                entering={FadeInDown.duration(250)}
                className="mt-2 text-sm"
                style={{ color: colors.danger }}>
                {error}
              </Animated.Text>
            )}

            {/* Button with press effect */}
            <Pressable
              className="mt-6 "
              onPress={handleContinue}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                marginTop: 24,
                borderRadius: 16,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                ...shadow(canSubmit ? 0.35 : 0, 12, canSubmit ? 6 : 0),
              })}>
              <LinearGradient
                colors={canSubmit ? BUTTON : BUTTON_DISABLED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 50,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: canSubmit ? "transparent" : "#4e5c4a",
                }}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text
                    className={`text-base font-bold tracking-wide ${
                      canSubmit ? "text-white" : "text-[#4e5c4a]"
                    }`}>
                    Continue
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            <View className="mt-5 flex-row items-center justify-center">
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={colors.brandLight}
              />
              <Text className="ml-1 text-xs text-brand-light">
                We'll send you a 6-digit code to verify it's you
              </Text>
            </View>
          </Animated.View>

          {/* Staff entry */}
          <Pressable
            onPress={() => router.push("/staff-login")}
            className="mt-6 items-center"
            hitSlop={8}>
            <Text className="text-sm" style={{ color: colors.brandDark }}>
              Restaurant staff?{" "}
              <Text className="font-bold text-[#0900fa]">Log in here</Text>
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
