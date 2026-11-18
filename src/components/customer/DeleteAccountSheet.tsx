import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { confirmAccountDeletion, requestAccountDeletion } from "../../services/authApi";

const RESEND_SECONDS = 60;

const DELETED = [
  "Your profile: name, phone, email, date of birth, photo",
  "Saved addresses and favourite restaurants",
  "Notifications",
];
const KEPT = [
  "Past orders, for the restaurants' records, without your name, phone or address",
  "Your reviews, shown as “Customer”",
];


export default function DeleteAccountSheet({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"info" | "code">("info");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  // Fresh start every time it opens
  useEffect(() => {
    if (!open) return;
    setStep("info");
    setCode("");
    setDevCode("");
    setError("");
  }, [open]);

  // Resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!open) return null;

  const sendCode = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await requestAccountDeletion();
      setSentTo(res.sentTo);
      setDevCode(res.devOtp ?? "");
      setStep("code");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== 6) return setError("Enter the 6-digit code");
    setBusy(true);
    setError("");
    try {
      await confirmAccountDeletion(code);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={busy ? undefined : onClose} />
        <View className=" bg-mist px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />

          <View className="mb-3 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.white }}>
              <Ionicons name="trash" size={20} color={colors.danger} />
            </View>
            <Text className="ml-3 flex-1 text-xl font-extrabold text-brand-dark">Delete account</Text>
          </View>

          {step === "info" ? (
            <>
              <Text className="mb-3 text-brand-dark">
                This can't be undone. If you sign in again later, you'll start with a new, empty account.
              </Text>

              <View className="mb-2 rounded-2xl p-3" style={{ backgroundColor: "#fdf3f2" }}>
                <Text className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: colors.danger }}>
                  Deleted
                </Text>
                {DELETED.map((t) => (
                  <View key={t} className="mt-1 flex-row items-start">
                    <Ionicons name="close-circle" size={14} color={colors.danger} style={{ marginTop: 2 }} />
                    <Text className="ml-2 flex-1 text-sm text-brand-dark">{t}</Text>
                  </View>
                ))}
              </View>
              <View className="mb-4 rounded-2xl p-3" style={{ backgroundColor: colors.mistLight }}>
                <Text className="mb-1 text-sm font-bold uppercase tracking-wide text-brand">Kept</Text>
                {KEPT.map((t) => (
                  <View key={t} className="mt-1 flex-row items-start">
                    <Ionicons name="information-circle" size={14} color={colors.brand} style={{ marginTop: 2 }} />
                    <Text className="ml-2 flex-1 text-sm text-brand-dark">{t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text className="mb-3 text-sm text-brand-dark">
                Enter the code we sent to <Text className="font-bold text-black">{sentTo}</Text> to confirm.
              </Text>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                placeholderTextColor={colors.placeholder}
                className="mb-2 rounded-2xl border-2 px-4 py-3 text-center text-2xl font-extrabold bg-white"
                style={{ borderColor: colors.danger, color: colors.text, letterSpacing: 10 }}
              />
              
              <Pressable onPress={sendCode} disabled={wait > 0 || busy} className="mb-3 self-center py-1">
                <Text className="text-sm font-semibold" style={{ color: wait > 0 ? colors.brandLight : colors.brand }}>
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </Text>
              </Pressable>
            </>
          )}

          {!!error && (
            <Text className="mb-3 text-sm font-semibold" style={{ color: colors.danger }}>
              {error}
            </Text>
          )}

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="flex-1 items-center rounded-2xl border-2 bg-white py-4"
              >
              <Text className="font-bold  text-brand-dark">Keep account</Text>
            </Pressable>
            <Pressable
              onPress={step === "info" ? sendCode : confirm}
              disabled={busy || (step === "code" && code.length !== 6)}
              className="flex-1 items-center rounded-2xl py-4"
              style={{
                backgroundColor: colors.danger,
                opacity: busy || (step === "code" && code.length !== 6) ? 0.5 : 1,
              }}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="font-bold text-white">{step === "info" ? "Send code" : "Delete my account"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}