import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function VerifyOtpScreen() {
  const { identifier, channel, isNewUser, devOtp } = useLocalSearchParams<{
    identifier: string;
    channel: string;
    isNewUser: string;
    devOtp?: string;
  }>();

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-orange-50 px-6">
      <Text className="text-2xl font-bold text-orange-600">Verify OTP</Text>
      <Text className="text-gray-700">Sent to: {identifier} ({channel})</Text>
      <Text className="text-gray-700">New user: {isNewUser}</Text>
      {!!devOtp && <Text className="text-gray-500">Dev code: {devOtp}</Text>}

      <Pressable onPress={() => router.back()} className="mt-4 rounded-xl bg-gray-800 px-6 py-3">
        <Text className="font-semibold text-white">Back</Text>
      </Pressable>
    </View>
  );
}