import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";

type IconName = ComponentProps<typeof Ionicons>["name"];

function InfoRow({ icon, label, value, last }: { icon: IconName; label: string; value?: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center py-3.5 ${last ? "" : "border-b"}`} style={{ borderColor: colors.mist }}>
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons name={icon} size={17} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs text-brand-light">{label}</Text>
        <Text className="text-base font-semibold text-brand-dark">{value || "Not added"}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile";
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "";

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need your phone number to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);

  return (
    <View className="flex-1 bg-mist">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header with avatar */}
        <View className="rounded-b-[32px] bg-brand pb-8">
          <SafeAreaView edges={["top"]}>
            <View className="items-center px-4 pt-4">
              <View
                className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white"
                style={{ backgroundColor: colors.brandDark }}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={40} color={colors.white} />
                )}
              </View>
              <Text className="mt-3 text-2xl font-extrabold text-white" numberOfLines={1}>
                {fullName}
              </Text>
              {!!joined && <Text className="text-sm text-brand-soft">Member since {joined}</Text>}
            </View>
          </SafeAreaView>
        </View>

        <View className="-mt-4 px-4">
          {/* Details */}
          <View className="mb-4 rounded-3xl bg-white px-5 py-2" style={cardShadow}>
            <InfoRow icon="call" label="Phone" value={user?.phone} />
            <InfoRow icon="mail" label="Email" value={user?.email} />
            <InfoRow
              icon="calendar"
              label="Date of birth"
              value={user?.dob ? new Date(user.dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined}
              last
            />
          </View>

          {/* Sign out */}
          <Pressable
            onPress={confirmSignOut}
            className="flex-row items-center justify-center rounded-2xl border-2 bg-white py-4"
            style={{ borderColor: colors.danger }}>
            <Ionicons name="log-out" size={18} color={colors.danger} />
            <Text className="ml-2 font-bold" style={{ color: colors.danger }}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}