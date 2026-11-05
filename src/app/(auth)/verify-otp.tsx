import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { requestOtp, verifyOtp } from "../../services/authApi";

const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

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

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{
    identifier: string;
    channel: "email" | "phone";
    devOtp?: string;
  }>();

  const identifier = params.identifier ?? "";
  const channelIcon = params.channel === "phone" ? "call" : "mail";
  const { signIn } = useAuth();

  const codeInputRef = useRef<TextInputInstance>(null);

  const [code, setCode] = useState("");
  const [codeFocused, setCodeFocused] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [devOtp, setDevOtp] = useState(params.devOtp);

  // Countdown for the resend button
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleVerify = async (codeToVerify = code) => {
    if (loading) return;
    setError("");
    setInfo("");

    if (!/^\d{6}$/.test(codeToVerify)) {
      setError("Enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(identifier, codeToVerify);
      await signIn(res.token, res.user);
      // No navigation needed: guards decide where to go (Home or Complete Profile)
    } catch (err) {
      setError(getErrorMessage(err));
      setCode(""); // clear so the user can retype
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError("");

    // Submit automatically when all 6 digits are entered
    if (digits.length === CODE_LENGTH) handleVerify(digits);
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const res = await requestOtp(identifier);
      setDevOtp(res.devOtp);
      setCode("");
      setSecondsLeft(RESEND_SECONDS);
      setInfo(`A new code was sent to your ${res.channel}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const canSubmit = code.length === CODE_LENGTH && !loading;

  // Which box is "next" (highlighted)
  const activeIndex = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <LinearGradient
      colors={BG}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}>
      {/* Soft olive circles */}
      <View
        className="absolute -right-16 -top-12 h-56 w-56 rounded-full"
        style={{ backgroundColor: colors.brandLight, opacity: 0.18 }}
      />
      <View
        className="absolute -bottom-12 -left-16 h-56 w-56 rounded-full"
        style={{ backgroundColor: colors.brand, opacity: 0.12 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-6 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{
                backgroundColor: colors.brand,
                ...shadow(0.35, 22, 10),
              }}>
              <Ionicons name="lock-closed" size={36} color={colors.white} />
            </View>
            <Text className="mt-4 text-3xl font-extrabold text-brand-dark">
              Verify it's you
            </Text>
            <Text className="mt-1 text-center text-base text-brand-light">
              Enter the 6-digit code we sent to
            </Text>

            {/* Identifier pill */}
            <View
              className="mt-3 flex-row items-center rounded-full px-4 py-2"
              style={{ backgroundColor: colors.mistLight }}>
              <Ionicons name={channelIcon} size={15} color={colors.brand} />
              <Text
                className="ml-2 font-semibold text-brand-dark"
                numberOfLines={1}>
                {identifier}
              </Text>
              <View
                className="mx-3 h-4 w-px"
                style={{ backgroundColor: colors.mistDark }}
              />
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Text className="font-bold text-brand">Change</Text>
              </Pressable>
            </View>
          </View>

          {/* Card */}
          <View
            className="rounded-3xl p-6"
            style={{
              backgroundColor: colors.mistLight,
              ...shadow(0.3, 30, 14),
            }}>
            <Text className="mb-3 text-base font-semibold text-brand-dark">
              Verification code
            </Text>
            <Pressable onPress={() => codeInputRef.current?.focus()}>
              <View className="flex-row justify-between">
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const digit = code[i];
                  const isActive = codeFocused && i === activeIndex && !loading;

                  const borderColor = error
                    ? colors.danger
                    : isActive
                      ? colors.brand
                      : digit
                        ? colors.brandLight
                        : colors.mistDark;

                  return (
                    <View
                      key={i}
                      className="h-14 w-12 items-center justify-center rounded-2xl border-2"
                      style={{
                        borderColor,
                        backgroundColor: digit
                          ? colors.brandSoft
                          : colors.white,
                      }}>
                      <Text className="text-2xl font-bold text-brand-dark">
                        {digit ?? ""}
                      </Text>
                      {/* Small bar in the next empty box */}
                      {isActive && !digit && (
                        <View
                          className="h-0.5 w-4 rounded-full"
                          style={{ backgroundColor: colors.brand }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Hidden real input: receives typing + SMS autofill */}
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={handleCodeChange}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                textContentType="oneTimeCode" // iOS: autofill from SMS
                autoComplete="sms-otp" // Android: autofill from SMS
                editable={!loading}
                caretHidden
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                }}
              />
            </Pressable>

            {!!error && (
              <Text className="mt-3 text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            )}
            {!!info && (
              <View className="mt-3 flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={colors.brand}
                />
                <Text className="ml-1 text-sm text-brand">{info}</Text>
              </View>
            )}

            {/* Verify button */}
            <Pressable
              className="mt-6"
              onPress={() => handleVerify()}
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
                    Verify
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Resend */}
            <View className="mt-5 items-center">
              {secondsLeft > 0 ? (
                <View
                  className="flex-row items-center rounded-full px-4 py-2"
                  style={{ backgroundColor: colors.brandSoft }}>
                  <Ionicons name="time" size={14} color={colors.brand} />
                  <Text className="ml-1 text-sm text-brand-dark">
                    Resend code in{" "}
                    <Text className="font-bold">{secondsLeft}s</Text>
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleResend}
                  disabled={resending}
                  hitSlop={8}
                  className="flex-row items-center">
                  <Ionicons name="refresh" size={15} color={colors.brand} />
                  <Text className="ml-1 text-sm font-bold text-brand">
                    {resending ? "Sending..." : "Didn't get it? Resend code"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
