import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/api";
import { uploadAvatar } from "../services/authApi";

const PINK = "#EC4899";

type Props = {
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
    Alert.alert(
      "Profile photo",
      "Add a photo so restaurants can recognise you",
      [
        { text: "Take photo", onPress: takePhoto },
        { text: "Choose from gallery", onPress: chooseFromGallery },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  return (
    <View className="items-center">
      <Pressable onPress={openOptions} disabled={uploading}>
        <View
          className="items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-100"
          style={{
            width: size,
            height: size,
            shadowColor: PINK,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}>
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : initials ? (
            <Text className="text-3xl font-extrabold text-[#4e5c4a]">
              {initials}
            </Text>
          ) : (
            <Text className="text-4xl">📷</Text>
          )}

          {uploading && (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>

        {/* Small camera badge */}
        <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-pink-500">
          <Text className="text-sm">📷</Text>
        </View>
      </Pressable>

      <Text className="mt-3 text-sm font-semibold text-[#4e5c4a]">
        {user?.avatar ? "Change photo" : "Add photo"}
        <Text className="font-normal text-gray-400"> · optional</Text>
      </Text>
      {!!error && (
        <Text className="mt-1 text-center text-sm text-red-500">{error}</Text>
      )}
    </View>
  );
}
