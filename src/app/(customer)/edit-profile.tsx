import AvatarPicker from "@/components/AvatarPicker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import ContactChangeSheet from "../../components/customer/ContactChangeSheet";
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { completeProfile, uploadAvatar } from "../../services/authApi";
import type { CompleteProfileInput, User } from "../../types/auth";
type IconName = ComponentProps<typeof Ionicons>["name"];

// 2000-05-15 (local date, no timezone shift)
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true, // crop
  aspect: [1, 1], // square
  quality: 0.8,
};

type NewPhoto = { uri: string; mimeType?: string; fileName?: string };
const today = new Date();
const hundredYearsAgo = new Date(
  today.getFullYear() - 100,
  today.getMonth(),
  today.getDate(),
);

// ---------- Input field ----------
function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "words",
}: {
  label: string;
  icon: IconName;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-brand-dark">
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-2xl border-2 px-4"
        style={{
          borderColor: focused ? colors.brand : colors.mistDark,
          backgroundColor: focused ? colors.white : colors.mistLight,
        }}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? colors.brand : colors.brandLight}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={colors.brand}
          className="ml-3 flex-1 py-4 text-base"
          style={{ color: colors.text }}
        />
      </View>
    </View>
  );
}

/** Phone / email row: shows the value + a Change (or Add) button */
function ContactRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
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
          style={{ color: value ? colors.text : colors.placeholder }}
          numberOfLines={1}>
          {value || "Not added"}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        className="flex-row items-center rounded-full px-3.5 py-2"
        style={{ backgroundColor: value ? colors.mistLight : colors.brand }}>
        <Ionicons
          name={value ? "create" : "add"}
          size={14}
          color={value ? colors.brand : colors.white}
        />
        <Text
          className="ml-1 text-sm font-bold"
          style={{ color: value ? colors.brand : colors.white }}>
          {value ? "Change" : "Add"}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------- Screen ----------
export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [newPhoto, setNewPhoto] = useState<NewPhoto | null>(null);
  const [dob, setDob] = useState<Date | null>(
    user?.dob ? new Date(user.dob) : null,
  );
  const [editingContact, setEditingContact] = useState<
    "phone" | "email" | null
  >(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initials =
    `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();

  const detailsChanged =
    firstName.trim() !== (user?.firstName ?? "") ||
    lastName.trim() !== (user?.lastName ?? "") ||
    (dob ? toYMD(dob) : "") !== (user?.dob ? toYMD(new Date(user.dob)) : "");
  const changed = detailsChanged || !!newPhoto;

  // ---------- Photo: pick now, upload on Save ----------
  const applyPicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setNewPhoto({
      uri: asset.uri,
      ...(asset.mimeType && { mimeType: asset.mimeType }),
      ...(asset.fileName && { fileName: asset.fileName }),
    });
    if (error) setError("");
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      return setError("Camera permission is needed to take a photo");
    applyPicked(await ImagePicker.launchCameraAsync(pickerOptions));
  };

  const chooseFromGallery = async () =>
    applyPicked(await ImagePicker.launchImageLibraryAsync(pickerOptions));

  const openPhotoOptions = () =>
    Alert.alert("Profile photo", undefined, [
      { text: "Take photo", onPress: takePhoto },
      { text: "Choose from gallery", onPress: chooseFromGallery },
      ...(newPhoto
        ? [{ text: "Keep old photo", onPress: () => setNewPhoto(null) }]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);

  const shownPhoto = newPhoto?.uri ?? user?.avatar;

  const valid =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && !!dob;

  const onDobChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false); // Android shows a dialog
    if (event.type === "set" && date) {
      setDob(date);
      if (error) setError("");
    }
  };

  const save = async () => {
    setError("");
    if (firstName.trim().length < 2)
      return setError("Enter your first name (at least 2 characters)");
    if (lastName.trim().length < 2)
      return setError("Enter your last name (at least 2 characters)");
    if (!dob) return setError("Select your date of birth");

    // Phone / email are changed separately (with a code), so only these go here
    const input: CompleteProfileInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob: toYMD(dob),
    };

    setSaving(true);
    try {
      // Name / date of birth (phone & email are changed separately, with a code)
      if (detailsChanged) {
        const input: CompleteProfileInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dob: toYMD(dob),
        };
        updateUser(await completeProfile(input));
      }
      // Photo
      if (newPhoto) {
        updateUser(await uploadAvatar(newPhoto));
        setNewPhoto(null);
      }
      router.back();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const canSave = valid && changed && !saving;

  const onContactSaved = (updated: User) => {
    const which = editingContact === "phone" ? "Phone number" : "Email";
    setEditingContact(null);
    updateUser(updated);
    Alert.alert(`${which} updated`, "You can use it to sign in from now on.");
  };

  return (
    <View className="flex-1 bg-mist">
      {/* Header */}
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <Text className="ml-3 text-xl font-extrabold text-white">
              Edit profile
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 110,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Photo (uploads straight away when picked) */}
          <View className="mb-5 items-center pt-2">
            <Pressable onPress={openPhotoOptions} disabled={saving}>
              <View
                className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4"
                style={[cardShadow, { borderColor: newPhoto ? colors.brand : colors.white, backgroundColor: colors.brandSoft }]}>
                {shownPhoto ? (
                  <Image source={{ uri: shownPhoto }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : initials ? (
                  <Text className="text-3xl font-extrabold text-brand">{initials}</Text>
                ) : (
                  <Ionicons name="person" size={44} color={colors.brandLight} />
                )}
              </View>
              <View
                className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white"
                style={{ backgroundColor: colors.brand }}>
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </Pressable>
            <Pressable onPress={openPhotoOptions} disabled={saving} hitSlop={6}>
              <Text className="mt-3 text-sm font-bold text-brand">
                {newPhoto ? "New photo · tap Save to keep it" : shownPhoto ? "Change photo" : "Add photo"}
              </Text>
            </Pressable>
          </View>

          {/* Personal */}
          <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
            <Text className="mb-4 text-base font-bold text-brand-dark">
              About you
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="First name"
                  icon="person"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ali"
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Last name"
                  icon="person"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Khan"
                />
              </View>
            </View>

            <Text className="mb-2 text-sm font-semibold text-brand-dark">
              Date of birth
            </Text>
            <Pressable
              onPress={() => setShowPicker(true)}
              className="flex-row items-center rounded-2xl border-2 px-4 py-4"
              style={{
                borderColor: showPicker ? colors.brand : colors.mistDark,
                backgroundColor: showPicker ? colors.white : colors.mistLight,
              }}>
              <Ionicons
                name="calendar"
                size={18}
                color={showPicker ? colors.brand : colors.brandLight}
              />
              <Text
                className="ml-3 flex-1 text-base"
                style={{ color: dob ? colors.text : colors.placeholder }}>
                {dob ? formatDate(dob) : "Select your date of birth"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.brandLight}
              />
            </Pressable>
            {showPicker && (
              <DateTimePicker
                value={dob ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={today}
                minimumDate={hundredYearsAgo}
                onChange={onDobChange}
              />
            )}
            {showPicker && Platform.OS === "ios" && (
              <Pressable
                onPress={() => setShowPicker(false)}
                className="mt-2 items-end">
                <Text className="font-bold text-brand">Done</Text>
              </Pressable>
            )}
          </View>

          {/* Contact (each change is confirmed with a code) */}
          <View
            className="mb-4 rounded-3xl bg-white px-5 pb-2 pt-5"
            style={cardShadow}>
            <Text className="mb-1 text-base font-bold text-brand-dark">
              Contact
            </Text>
            <Text className="text-xs text-brand-light">
              You sign in with these. To change one, we send a code to the new
              one first.
            </Text>
            <ContactRow
              icon="call"
              label="Phone"
              value={user?.phone}
              onPress={() => setEditingContact("phone")}
            />
            <ContactRow
              icon="mail"
              label="Email"
              value={user?.email}
              onPress={() => setEditingContact("email")}
              last
            />
          </View>

          {!!error && (
            <View
              className="mb-2 flex-row items-center rounded-2xl p-3"
              style={{ backgroundColor: "#fde8e6" }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text
                className="ml-2 flex-1 text-sm"
                style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ContactChangeSheet
        channel={editingContact}
        current={editingContact ? user?.[editingContact] : undefined}
        onClose={() => setEditingContact(null)}
        onDone={onContactSaved}
      />

      {/* Save bar */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-3"
        style={{
          backgroundColor: colors.mist,
          paddingBottom: insets.bottom + 12,
        }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={[
            canSave ? cardShadow : null,
            { backgroundColor: canSave ? colors.brand : colors.mistDark },
          ]}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.white}
              />
              <Text className="ml-1.5 text-base font-bold text-white">
                {changed ? "Save changes" : "No changes yet"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
