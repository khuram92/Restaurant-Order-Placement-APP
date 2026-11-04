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
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { requestOtp, verifyOtp } from "../../services/authApi";
import { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const RESEND_SECONDS = 60; 
const CODE_LENGTH = 6;

// Same palette as the login screen
const COLORS = {
  bg: ["#e0e1df", "#e0e1df", "#F9A8D4"] as const,
  button: ["#4e5c4a", "#EC4899"] as const,
  buttonDisabled: ["#F9C6DC", "#F5B5D0"] as const,
  focus: "#4e5c4a",
};

const pShadow = (opacity: number, radius: number, elevation: number) => ({
  shadowColor: COLORS.focus,
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
  const channelIcon = params.channel === "phone" ? "📱" : "✉️";
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
    <LinearGradient colors={COLORS.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      
      <View className="absolute -right-16 -top-12 h-56 w-56 rounded-full bg-pink-300 opacity-40" />
      <View className="absolute -left-16 -bottom-12 h-56 w-56 rounded-full bg-rose-400 opacity-50" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center px-6"
        >
          {/* Header */}
          <View className="mb-6 items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full bg-white"
              style={pShadow(0.35, 16, 10)}
            >
              <Text className="text-4xl">🔐</Text>
            </View>
            <Text className="mt-4 text-3xl font-extrabold text-pink-600">Verify it's you</Text>
            <Text className="mt-1 text-center text-base text-pink-900/70">
              Enter the 6-digit code we sent to
            </Text>

            {/* Identifier pill */}
            <View className="mt-3 flex-row items-center rounded-full bg-white/80 px-4 py-2">
              <Text className="mr-2">{channelIcon}</Text>
              <Text className="font-semibold text-gray-900" numberOfLines={1}>
                {identifier}
              </Text>
              <View className="mx-3 h-4 w-px bg-pink-200" />
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Text className="font-semibold text-pink-600">Change</Text>
              </Pressable>
            </View>
          </View>

          {/* White card */}
          <View className="rounded-3xl bg-white p-6" style={pShadow(0.25, 24, 12)}>
            {/* Code boxes */}
            <Text className="mb-3 text-sm font-semibold text-gray-700">Verification code</Text>
            <Pressable onPress={() => codeInputRef.current?.focus()}>
              <View className="flex-row justify-between">
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const digit = code[i];
                  const isActive = codeFocused && i === activeIndex && !loading;

                  const borderColor = error
                    ? "#EF4444"
                    : isActive
                      ? COLORS.focus
                      : digit
                        ? "#F9A8D4"
                        : "#F3D1DE";

                  return (
                    <View
                      key={i}
                      className={`h-14 w-12 items-center justify-center rounded-2xl border-2 ${
                        digit ? "bg-pink-50" : "bg-gray-50"
                      }`}
                      style={{ borderColor }}
                    >
                      <Text className="text-2xl font-bold text-pink-600">{digit ?? ""}</Text>
                      {/* Small bar in the next empty box */}
                      {isActive && !digit && <View className="h-0.5 w-4 rounded-full bg-pink-500" />}
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
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              />
            </Pressable>

            {/* Messages */}
            {!!error && <Text className="mt-3 text-sm text-red-500">{error}</Text>}
            {!!info && <Text className="mt-3 text-sm text-green-600">{info}</Text>}
            {__DEV__ && !!devOtp && (
              <Text className="mt-3 text-xs text-gray-400">Dev code: {devOtp}</Text>
            )}

            {/* Verify button */}
            <Pressable
              onPress={() => handleVerify()}
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
                  <Text className="text-base font-bold tracking-wide text-white">Verify</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Resend */}
            <View className="mt-5 items-center">
              {secondsLeft > 0 ? (
                <View className="rounded-full bg-pink-50 px-4 py-2">
                  <Text className="text-sm text-pink-700">
                    Resend code in <Text className="font-bold">{secondsLeft}s</Text>
                  </Text>
                </View>
              ) : (
                <Pressable onPress={handleResend} disabled={resending} hitSlop={8}>
                  <Text className="text-sm font-bold text-pink-600">
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