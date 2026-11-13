import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { listMyOrders } from "../../../services/orderApi";

type IconName = ComponentProps<typeof Ionicons>["name"];

const formatDob = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : undefined;

// ---------- Small pieces ----------
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wide text-brand-light">
        {title}
      </Text>
      <View className="rounded-3xl bg-white px-4 py-1" style={cardShadow}>
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3.5 ${last ? "" : "border-b"}`}
      style={{ borderColor: colors.mist }}>
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs text-brand-light">{label}</Text>
        <Text
          className="text-base font-semibold"
          style={{ color: value ? colors.text : colors.placeholder }}>
          {value || "Not added"}
        </Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center py-3.5 active:opacity-70 ${last ? "" : "border-b"}`}
      style={{ borderColor: colors.mist }}>
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.brand }}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-brand-dark">{label}</Text>
        {!!hint && <Text className="text-xs text-brand-light">{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center py-1">
      <Text className="text-2xl font-extrabold text-brand">{value}</Text>
      <Text className="text-xs font-semibold text-brand-light">{label}</Text>
    </View>
  );
}

// ---------- Screen ----------
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<{ total: number; active: number } | null>(
    null,
  );

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Your profile";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  const joinedYear = user?.createdAt
    ? String(new Date(user.createdAt).getFullYear())
    : "–";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  // Order counts — refreshed every time the tab opens
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([listMyOrders("all", 1), listMyOrders("active", 1)])
        .then(
          ([all, active]) =>
            alive && setStats({ total: all.total, active: active.total }),
        )
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const goEdit = () => router.push("/edit-profile");

  const showHelp = () =>
    Alert.alert(
      "Help & support",
      "For anything about an order, open it from My bookings and call the restaurant from there. They can change or cancel it for you.",
      [
        {
          text: "Open My bookings",
          onPress: () => router.navigate("/bookings"),
        },
        { text: "OK", style: "cancel" },
      ],
    );

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need a new code to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);

  return (
    <View className="flex-1 bg-mist">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        {/* ---------- Header ---------- */}
        <View className=" bg-brand pb-14">
          <SafeAreaView edges={["top"]}>
            <View className="flex-row items-center justify-between px-5 pt-2">
              <Text className="text-2xl font-extrabold text-white">
                Profile
              </Text>
              <Pressable
                onPress={goEdit}
                hitSlop={8}
                className="flex-row items-center rounded-full px-3 py-1.5"
                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                <Ionicons name="create" size={14} color={colors.white} />
                <Text className="ml-1 text-sm font-bold text-white">Edit</Text>
              </Pressable>
            </View>

            <View className="mt-5 items-center px-4">
              <Pressable onPress={goEdit}>
                <View
                  className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white"
                  style={{ backgroundColor: colors.brandSoft }}>
                  {user?.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : initials ? (
                    <Text className="text-3xl font-extrabold text-brand">
                      {initials}
                    </Text>
                  ) : (
                    <Ionicons
                      name="person"
                      size={44}
                      color={colors.brandLight}
                    />
                  )}
                </View>
                <View
                  className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-white"
                  style={{ backgroundColor: colors.brandDark }}>
                  <Ionicons name="camera" size={14} color={colors.white} />
                </View>
              </Pressable>
              <Text
                className="mt-3 text-2xl font-extrabold text-white"
                numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-sm text-brand-soft">
                {user?.phone ?? user?.email}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View className="-mt-9 px-4">
          <View
            className="mb-5 flex-row items-center justify-center rounded-3xl bg-white p-4"
            style={cardShadow}>
            <Text className=" text-gray-600 text-base">
              Member since{" "}
              <Text className="font-bold text-lg text-brand-dark">{joinedYear}</Text>
            </Text>
          </View>

          {/* ---------- Personal info ---------- */}
          <Section title="Personal info">
            <InfoRow icon="call" label="Phone" value={user?.phone} />
            <InfoRow icon="mail" label="Email" value={user?.email} />
            <InfoRow
              icon="calendar"
              label="Date of birth"
              value={formatDob(user?.dob)}
              last
            />
          </Section>

          {/* ---------- Quick links ---------- */}
          <Section title="Quick links">
            <LinkRow
              icon="create"
              label="Edit profile"
              hint="Photo, name and date of birth"
              onPress={goEdit}
            />
            <LinkRow
              icon="help-circle"
              label="Help & support"
              hint="Questions about an order"
              onPress={showHelp}
              last
            />
          </Section>

          {/* ---------- Sign out ---------- */}
          <Pressable
            onPress={confirmSignOut}
            className="flex-row items-center justify-center rounded-2xl border-2 bg-white py-4"
            style={{ borderColor: colors.danger }}>
            <Ionicons name="log-out" size={18} color={colors.danger} />
            <Text className="ml-2 font-bold" style={{ color: colors.danger }}>
              Sign out
            </Text>
          </Pressable>

          <Text className="mt-4 text-center text-xs text-brand-light">
            Version {version}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
