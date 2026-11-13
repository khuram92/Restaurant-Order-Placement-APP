import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/theme";
import { getErrorMessage } from "../../lib/api";
import { requestContactChange, verifyContactChange } from "../../services/authApi";
import type { User } from "../../types/auth";
import { parseIdentifier } from "../../utils/identifier";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

type Channel = "phone" | "email";

const TEXT = {
  phone: { title: "phone number", icon: "call" as const, placeholder: "03001234567", keyboard: "phone-pad" as const },
  email: { title: "email", icon: "mail" as const, placeholder: "you@example.com", keyboard: "email-address" as const },
};

/** Bottom sheet: type the new phone/email → get a code on it → enter the code → saved */
export default function ContactChangeSheet({
  channel,
  current,
  onClose,
  onDone,
}: {
  channel: Channel | null; // null = closed
  current?: string;
  onClose: () => void;
  onDone: (user: User) => void;
}) {
  const insets = useSafeAreaInsets();
  const codeRef = useRef<TextInputInstance>(null);

  const [step, setStep] = useState<"enter" | "code">("enter");
  const [value, setValue] = useState("");
  const [sentTo, setSentTo] = useState(""); // cleaned-up value from the server
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0); // resend countdown

  // Fresh start every time the sheet opens
  useEffect(() => {
    if (!channel) return;
    setStep("enter");
    setValue("");
    setSentTo("");
    setCode("");
    setDevCode("");
    setError("");
    setWait(0);
  }, [channel]);

  // Resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (!channel) return null;
  const t = TEXT[channel];

  const sendCode = async (target: string) => {
    setError("");
    setBusy(true);
    try {
      const res = await requestContactChange(target);
      setSentTo(res.identifier);
      setDevCode(res.devOtp ?? "");
      setCode("");
      setStep("code");
      setWait(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitValue = () => {
    const parsed = parseIdentifier(value);
    if (!parsed || parsed.channel !== channel) {
      return setError(channel === "phone" ? "Enter a valid phone number (03XXXXXXXXX)" : "Enter a valid email");
    }
    if (parsed.identifier === current) return setError(`This is already your ${t.title}`);
    sendCode(parsed.identifier);
  };

  const verify = async (entered = code) => {
    if (entered.length !== CODE_LENGTH) return setError("Enter the 6-digit code");
    setError("");
    setBusy(true);
    try {
      const user = await verifyContactChange(sentTo, entered);
      onDone(user);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  const onCodeChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError("");
    if (digits.length === CODE_LENGTH) verify(digits); // auto-submit
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={busy ? undefined : onClose} />
        <View className="rounded-t-[28px] bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 h-1.5 w-12 self-center rounded-full" style={{ backgroundColor: colors.mistDark }} />

          {/* Title */}
          <View className="mb-1 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
              <Ionicons name={step === "code" ? "shield-checkmark" : t.icon} size={20} color={colors.brand} />
            </View>
            <Text className="ml-3 flex-1 text-xl font-extrabold text-brand-dark">
              {step === "code" ? "Enter the code" : `${current ? "Change" : "Add"} ${t.title}`}
            </Text>
          </View>
          <Text className="mb-4 text-sm text-brand-light">
            {step === "code"
              ? `We sent a 6-digit code to ${sentTo}`
              : `We'll send a code to the new ${t.title} to make sure it's yours.`}
          </Text>

          {step === "enter" ? (
            <>
              {!!current && (
                <View className="mb-3 flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: colors.mistLight }}>
                  <Text className="text-xs text-brand-light">Current: </Text>
                  <Text className="flex-1 text-sm font-semibold text-brand-dark">{current}</Text>
                </View>
              )}
              <View className="flex-row items-center rounded-2xl border-2 px-4" style={{ borderColor: colors.brand }}>
                <Ionicons name={t.icon} size={18} color={colors.brand} />
                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    setValue(text);
                    if (error) setError("");
                  }}
                  placeholder={`New ${t.title}`}
                  placeholderTextColor={colors.placeholder}
                  keyboardType={t.keyboard}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={submitValue}
                  selectionColor={colors.brand}
                  className="ml-3 flex-1 py-4 text-base"
                  style={{ color: colors.text }}
                />
              </View>
            </>
          ) : (
            <>
              {/* 6 boxes, one hidden input behind them */}
              <Pressable onPress={() => codeRef.current?.focus()} className="flex-row justify-between">
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const digit = code[i];
                  const active = i === Math.min(code.length, CODE_LENGTH - 1) && !busy;
                  return (
                    <View
                      key={i}
                      className="h-14 w-12 items-center justify-center rounded-2xl border-2"
                      style={{
                        borderColor: active ? colors.brand : digit ? colors.brandLight : colors.mistDark,
                        backgroundColor: digit ? colors.brandSoft : colors.mistLight,
                      }}>
                      <Text className="text-2xl font-extrabold text-brand-dark">{digit ?? ""}</Text>
                    </View>
                  );
                })}
              </Pressable>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCodeChange}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                className="absolute h-0 w-0 opacity-0"
              />

              {!!devCode && (
                <Text className="mt-3 text-center text-xs text-brand-light">
                  Dev code: <Text className="font-bold text-brand">{devCode}</Text>
                </Text>
              )}

              <View className="mt-3 flex-row items-center justify-between">
                <Pressable onPress={() => setStep("enter")} disabled={busy} hitSlop={8}>
                  <Text className="text-sm font-semibold text-brand">Change {t.title}</Text>
                </Pressable>
                <Pressable onPress={() => sendCode(sentTo)} disabled={busy || wait > 0} hitSlop={8}>
                  <Text className="text-sm font-semibold" style={{ color: wait > 0 ? colors.placeholder : colors.brand }}>
                    {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {!!error && (
            <View className="mt-3 flex-row items-center rounded-2xl p-3" style={{ backgroundColor: "#fde8e6" }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text className="ml-2 flex-1 text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          )}

          {/* Main button */}
          <Pressable
            onPress={step === "enter" ? submitValue : () => verify()}
            disabled={busy || (step === "enter" ? !value.trim() : code.length !== CODE_LENGTH)}
            className="mt-4 flex-row items-center justify-center rounded-2xl py-4"
            style={{
              backgroundColor: colors.brand,
              opacity: busy || (step === "enter" ? !value.trim() : code.length !== CODE_LENGTH) ? 0.5 : 1,
            }}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name={step === "enter" ? "send" : "checkmark-circle"} size={17} color={colors.white} />
                <Text className="ml-1.5 text-base font-bold text-white">{step === "enter" ? "Send code" : "Verify & save"}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}