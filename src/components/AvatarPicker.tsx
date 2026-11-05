import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { uploadAvatar } from "../services/authApi";
import { getErrorMessage } from "../lib/api";

type Props = {
  /** Initials shown when there is no photo (e.g. "AK") */
  initials?: string;
  size?: number;
};

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true, // lets the user crop
  aspect: [1, 1], // square
  quality: 0.8,
};

export default function AvatarPicker({ initials, size = 104 }: Props) {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setError("");
    setUploading(true);
    try {
      const updated = await uploadAvatar({
        uri: asset.uri,
        ...(asset.mimeType && { mimeType: asset.mimeType }),
        ...(asset.fileName && { fileName: asset.fileName }),
      });
      updateUser(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to take a photo");
      return;
    }
    handleResult(await ImagePicker.launchCameraAsync(pickerOptions));
  };

  const chooseFromGallery = async () => {
    handleResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  };

  const openOptions = () => {
    Alert.alert("Profile photo", "Add a photo so restaurants can recognise you", [
      { text: "Take photo", onPress: takePhoto },
      { text: "Choose from gallery", onPress: chooseFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View className="items-center">
      <Pressable onPress={openOptions} disabled={uploading}>
        <View
          className="items-center justify-center overflow-hidden rounded-full border-4 border-white"
          style={{
            width: size,
            height: size,
            backgroundColor: colors.brandSoft,
            shadowColor: colors.brandDark,
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : initials ? (
            <Text className="text-3xl font-extrabold" style={{ color: colors.brand }}>
              {initials}
            </Text>
          ) : (
            <Ionicons name="person" size={size * 0.42} color={colors.brandLight} />
          )}

          {uploading && (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </View>

        {/* Small camera badge */}
        <View
          className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white"
          style={{ backgroundColor: colors.brand }}
        >
          <Ionicons name="camera" size={16} color={colors.white} />
        </View>
      </Pressable>

      <Text className="mt-3 text-sm font-semibold" style={{ color: colors.brandDark }}>
        {user?.avatar ? "Change photo" : "Add photo"}
        <Text className="font-normal" style={{ color: colors.textMuted }}>
          {" "}· optional
        </Text>
      </Text>
      {!!error && (
        <Text className="mt-1 text-center text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}