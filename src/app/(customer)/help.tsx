import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  Alert,
  LayoutAnimation,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { openInApp, PRIVACY_URL, SUPPORT } from "../../lib/links";

type IconName = ComponentProps<typeof Ionicons>["name"];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I know my order was accepted?",
    a: "You get a notification as soon as the restaurant confirms it, with the time it should be ready. You can also follow every step in My bookings.",
  },
  {
    q: "Can I cancel my order?",
    a: "Yes, while the restaurant hasn't accepted it yet. Open the order in My bookings and tap Cancel. After it's accepted, call the restaurant from the order screen.",
  },
  {
    q: "The restaurant didn't respond. What happens?",
    a: "If the restaurant doesn't confirm your order within 20 minutes, it's cancelled automatically and you're told right away. You aren't charged.",
  },
  {
    q: "How is the delivery fee worked out?",
    a: "Each restaurant sets a base fee plus a charge per kilometre. The exact fee for your address shows at checkout before you place the order.",
  },
  {
    q: "Why can't I order from a restaurant?",
    a: "It may be outside its opening hours, closed for a short while (it shows when it's back), or your address may be outside its delivery area. You can still look at the menu.",
  },
  {
    q: "How do I pay?",
    a: "Pay cash when your order arrives, when you pick it up, or at the restaurant for dine-in.",
  },
  {
    q: "How do I rate an order?",
    a: "Once an order is completed, open it in My bookings and rate it. The restaurant can reply to your review.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile and tap Delete account. We send a code to your phone and email to confirm it's you.",
  },
];

function ContactButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-2xl py-3.5 active:opacity-80"
      style={{ backgroundColor: colors.brand }}>
      <Ionicons name={icon} size={22} color={colors.white} />
      <Text className="mt-1 text-xs font-bold text-white">{label}</Text>
    </Pressable>
  );
}

function FaqItem({ q, a, last }: { q: string; a: string; last?: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };
  return (
    <Pressable
      onPress={toggle}
      className={`py-3.5 ${last ? "" : "border-b"}`}
      style={{ borderColor: colors.mist }}>
      <View className="flex-row items-center">
        <Text className="flex-1 pr-3 text-base font-semibold text-brand-dark">
          {q}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.brandLight}
        />
      </View>
      {open && (
        <Text className="mt-2 text-sm leading-5" style={{ color: colors.textMuted }}>
          {a}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const { user } = useAuth();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open", "This isn't available on your phone.");
    }
  };

  const who = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const contact = user?.phone ?? user?.email ?? "";
  const intro = `Hi, I need help with the app.${who ? `\nName: ${who}` : ""}${contact ? `\nAccount: ${contact}` : ""}`;

  const call = () => open(`tel:${SUPPORT.phone}`);
  const whatsapp = () =>
    open(`https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(intro)}`);
  const email = () =>
    open(
      `mailto:${SUPPORT.email}?subject=${encodeURIComponent("App support")}&body=${encodeURIComponent(intro)}`,
    );

  return (
    <View className="flex-1 bg-mist">
      <View className="bg-brand">
        <SafeAreaView edges={["top"]}>
          <View className="flex-row items-center gap-2 px-4 pb-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-2xl font-extrabold text-white">
                Help & support
              </Text>
              <Text className="text-sm text-brand-soft">
                We're here to help
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        {/* Problem with an order */}
        <Pressable
          onPress={() => router.navigate("/bookings")}
          className="mb-4 flex-row items-center rounded-3xl bg-white p-4 active:opacity-80"
          style={cardShadow}>
          <View
            className="h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.brandSoft }}>
            <Ionicons name="receipt" size={22} color={colors.brand} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-brand-dark">
              Problem with an order?
            </Text>
            <Text className="text-xs text-brand-light">
              Open it in My bookings to see its status or call the restaurant.
              They can change or cancel it fastest.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
        </Pressable>

        {/* Contact us */}
        {(!!SUPPORT.phone || !!SUPPORT.whatsapp || !!SUPPORT.email) && (
          <View className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
            <Text className="text-base font-bold text-brand-dark">
              Contact us
            </Text>
            <Text className="mb-3 text-xs text-brand-light">
              For app or account problems
            </Text>
            <View className="flex-row gap-2">
              {!!SUPPORT.phone && (
                <ContactButton icon="call" label="Call" onPress={call} />
              )}
              {!!SUPPORT.whatsapp && (
                <ContactButton
                  icon="logo-whatsapp"
                  label="WhatsApp"
                  onPress={whatsapp}
                />
              )}
              {!!SUPPORT.email && (
                <ContactButton icon="mail" label="Email" onPress={email} />
              )}
            </View>
          </View>
        )}

        {/* FAQs */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-wide text-brand-light">
          Common questions
        </Text>
        <View className="mb-4 rounded-3xl bg-white px-4 py-1" style={cardShadow}>
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} last={i === FAQS.length - 1} />
          ))}
        </View>

        {/* Privacy */}
        <Pressable
          onPress={() => openInApp(PRIVACY_URL)}
          className="mb-3 flex-row items-center justify-center py-2">
          <Ionicons name="shield-checkmark" size={14} color={colors.brand} />
          <Text className="ml-1 text-sm font-bold text-brand">
            Privacy policy
          </Text>
        </Pressable>
        <Text className="text-center text-xs text-brand-light">
          Version {version}
        </Text>
      </ScrollView>
    </View>
  );
}