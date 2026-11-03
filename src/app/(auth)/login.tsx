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
import { router } from "expo-router";
import { requestOtp } from "../../services/authApi";
import { getErrorMessage } from "../../lib/api";
import { parseIdentifier } from "../../utils/identifier";

export default function LoginScreen() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-orange-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        {/* Header */}
        <View className="mb-10 items-center">
          <Text className="text-5xl">🍽️</Text>
          <Text className="mt-3 text-3xl font-bold text-orange-600">Welcome</Text>
          <Text className="mt-2 text-center text-base text-gray-600">
            Log in or sign up with your phone number or email
          </Text>
        </View>

        {/* Input */}
        <Text className="mb-2 text-sm font-medium text-gray-700">Phone or Email</Text>
        <TextInput
          value={input}
          onChangeText={(text) => {
            setInput(text);
            if (error) setError("");
          }}
          placeholder="03001234567 or you@example.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          editable={!loading}
          className={`rounded-xl border bg-white px-4 py-4 text-base text-gray-900 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
        />

        {!!error && <Text className="mt-2 text-sm text-red-600">{error}</Text>}

        {/* Button */}
        <Pressable
          onPress={handleContinue}
          disabled={!canSubmit}
          className={`mt-6 items-center rounded-xl py-4 ${canSubmit ? "bg-orange-500" : "bg-orange-300"}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Continue</Text>
          )}
        </Pressable>

        <Text className="mt-6 text-center text-xs text-gray-500">
          We'll send you a 6-digit code to verify it's you.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}