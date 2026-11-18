import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddressSheet from "../../components/customer/AddressSheet";
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { deleteAddress, getAddresses } from "../../services/addressApi";
import type { SavedAddress } from "../../types/address";
import {
  ADDRESS_LABEL_INFO,
  addressLine,
  addressTitle,
} from "../../utils/addressFormat";

const MAX = 5;

export default function AddressesScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<SavedAddress[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAddresses()
        .then((a) => {
          setList(a);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err)));
    }, []),
  );

  const confirmDelete = (a: SavedAddress) =>
    Alert.alert(`Delete "${addressTitle(a)}"?`, addressLine(a), [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setList(await deleteAddress(a._id));
          } catch (err) {
            Alert.alert("Couldn't delete", getErrorMessage(err));
          }
        },
      },
    ]);

  const full = (list?.length ?? 0) >= MAX;

  return (
    <View className="flex-1 bg-mist">
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center px-4 pb-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">
                Saved addresses
              </Text>
              <Text className="text-sm text-brand-soft">
                Pick them at checkout in one tap
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {!list && !error ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {!!error && (
            <Text
              className="mb-3 text-center text-sm"
              style={{ color: colors.danger }}>
              {error}
            </Text>
          )}

          {list?.length === 0 && (
            <View className="items-center py-10">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
                <Ionicons name="location" size={34} color={colors.brand} />
              </View>
              <Text className="mt-4 text-base font-bold text-brand-dark">
                No saved addresses
              </Text>
              <Text className="mt-1 px-8 text-center text-sm text-brand-light">
                Save Home and Work so checkout fills itself in.
              </Text>
            </View>
          )}

          {list?.map((a) => (
            <View
              key={a._id}
              className="mb-3 flex-row items-start rounded-3xl bg-white p-4"
              style={cardShadow}>
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.brand }}>
                <Ionicons
                  name={ADDRESS_LABEL_INFO[a.label].icon}
                  size={20}
                  color={colors.white}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-brand-dark">
                  {addressTitle(a)}
                </Text>
                <Text className="text-sm text-brand-dark">
                  {addressLine(a)}
                </Text>
                <Text className="mt-0.5 text-xs text-brand-light">
                  {a.phone}
                  {a.instructions ? ` · ${a.instructions}` : ""}
                </Text>
                <View className="mt-1.5 flex-row items-center">
                  <Ionicons
                    name={a.location ? "checkmark-circle" : "alert-circle"}
                    size={13}
                    color={a.location ? colors.brand : colors.brandLight}
                  />
                  <Text className="ml-1 text-xs text-brand-light">
                    {a.location
                      ? "GPS pin saved"
                      : "No GPS pin · edit it at this address to add one"}
                  </Text>
                </View>
              </View>
              <View className="ml-2 gap-2">
                <Pressable
                  onPress={() => setEditing(a)}
                  hitSlop={6}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.brandSoft }}>
                  <Ionicons name="create" size={17} color={colors.brand} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(a)}
                  hitSlop={6}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#fdecea" }}>
                  <Ionicons name="trash" size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}

          {list && (
            <Pressable
              onPress={() => setEditing("new")}
              disabled={full}
              className="mt-1 flex-row items-center justify-center rounded-2xl py-4"
              style={{
                backgroundColor: full ? colors.brandLight : colors.brandDark,
              }}>
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text className="ml-2 text-base font-bold text-white">
                {full ? `Up to ${MAX} addresses` : "Add address"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <AddressSheet
        editing={editing}
        {...(user?.phone && { defaultPhone: user.phone })}
        onClose={() => setEditing(null)}
        onSaved={setList}
      />
    </View>
  );
}
