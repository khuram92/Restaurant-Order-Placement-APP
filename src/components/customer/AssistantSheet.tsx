import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/api";
import { useMyLocation } from "../../lib/myLocation";
import { askAssistant } from "../../services/assistantApi";
import type { AssistantCard, ChatTurn } from "../../types/assistant";
import type { OrderStatus } from "../../types/order";
import { ORDER_STATUS_INFO } from "../../utils/orderFormat";

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  cards?: AssistantCard[];
};

const SUGGESTIONS = [
  "Spicy food under Rs 800",
  "Where's my order?",
  "What's open right now?",
  "Kuch acha pizza batao",
];

const HISTORY_SIZE = 10;
const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

type Go = (to: () => void) => void;

function DishCard({
  card,
  go,
}: {
  card: Extract<AssistantCard, { kind: "dish" }>;
  go: Go;
}) {
  return (
    <Pressable
      onPress={() =>
        go(() =>
          router.push({
            pathname: "/restaurant/[id]",
            params: { id: card.restaurantId },
          }),
        )
      }
      className="w-full overflow-hidden rounded-2xl bg-white active:opacity-80"
      style={cardShadow}>
      <View
        className="h-24 items-center justify-center"
        style={{ backgroundColor: colors.brandSoft }}>
        {card.image ? (
          <Image
            source={{ uri: card.image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="fast-food" size={30} color={colors.brandLight} />
        )}
        {!card.isOpenNow && (
          <View
            className="absolute left-2 top-2 rounded-full px-2 py-0.5"
            style={{ backgroundColor: colors.text }}>
            <Text className="text-[10px] font-bold text-white">Closed</Text>
          </View>
        )}
      </View>
      <View className="p-2.5">
        <Text className="text-sm font-bold text-brand-dark" numberOfLines={1}>
          {card.name}
        </Text>
        <Text className="text-xs text-brand-light" numberOfLines={1}>
          {card.restaurantName}
        </Text>
        <Text className="mt-1 text-sm font-extrabold text-brand">
          {money(card.price)}
        </Text>
      </View>
    </Pressable>
  );
}

function RestaurantMiniCard({
  card,
  go,
}: {
  card: Extract<AssistantCard, { kind: "restaurant" }>;
  go: Go;
}) {
  const status = card.isOpenNow
    ? "Open now"
    : card.backAt
      ? `Back at ${card.backAt}`
      : "Closed";
  return (
    <Pressable
      onPress={() =>
        go(() =>
          router.push({
            pathname: "/restaurant/[id]",
            params: { id: card.restaurantId },
          }),
        )
      }
      className="w-full flex-1 flex-row items-center rounded-2xl bg-white p-2 active:opacity-80"
      style={cardShadow}>
      <View
        className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        {card.logo ? (
          <Image
            source={{ uri: card.logo }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="restaurant" size={22} color={colors.brand} />
        )}
      </View>
      <View className="ml-2 flex-1 ">
        <Text className="text-sm font-bold text-brand-dark" numberOfLines={1}>
          {card.name}
        </Text>
        <Text className="text-xs text-brand-light" numberOfLines={1}>
          {[
            card.ratingAvg ? `★ ${card.ratingAvg.toFixed(1)}` : null,
            card.distance,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text className="text-xs text-brand-light" numberOfLines={1}>
          {[card.cuisines?.map((cuisine) => ` ${cuisine}`).join(", ")]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text
          className="mt-0.5 text-xs font-bold"
          style={{ color: card.isOpenNow ? colors.brand : colors.danger }}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

function OrderMiniCard({
  card,
  go,
}: {
  card: Extract<AssistantCard, { kind: "order" }>;
  go: Go;
}) {
  const info = ORDER_STATUS_INFO[card.status as OrderStatus];
  return (
    <Pressable
      onPress={() =>
        go(() =>
          router.push({
            pathname: "/order/[id]",
            params: { id: card.orderId },
          }),
        )
      }
      className="w-full flex-1 flex-row items-center rounded-2xl bg-white p-2 active:opacity-80"
      style={cardShadow}>
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.brandSoft }}>
        <Ionicons
          name={info?.icon ?? "receipt"}
          size={22}
          color={colors.brand}
        />
      </View>
      <View className="ml-2 flex-1">
        <Text className="text-sm font-bold text-brand-dark" numberOfLines={1}>
          {card.restaurantName}
        </Text>
        <Text className="text-xs text-brand-light">#{card.orderNumber}</Text>
        <Text className="mt-0.5 text-xs font-bold text-brand" numberOfLines={1}>
          {info?.label ?? card.status}
          {card.readyAt ? ` · ~${card.readyAt}` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

function Cards({ cards, go }: { cards: AssistantCard[]; go: Go }) {
  return (
    <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
      {cards.map((c) => (
        <View
          key={
            c.kind === "dish"
              ? `d${c.itemId}`
              : c.kind === "restaurant"
                ? `r${c.restaurantId}`
                : `o${c.orderId}`
          }
          style={{ width: "48.5%" }}>
          {c.kind === "dish" ? (
            <DishCard card={c} go={go} />
          ) : c.kind === "restaurant" ? (
            <RestaurantMiniCard card={c} go={go} />
          ) : (
            <OrderMiniCard card={c} go={go} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function AssistantSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const myLocation = useMyLocation();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "hello",
      role: "assistant",
      text: `Hi ${user?.firstName ?? "there"}! 👋 I can find dishes and restaurants, tell you what's open, and check your orders.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput("");

    const mine: Message = { id: `u${Date.now()}`, role: "user", text };
    const next = [...messages, mine];
    setMessages(next);
    setThinking(true);

    const history: ChatTurn[] = next
      .filter((m) => m.id !== "hello" && m.role !== "error")
      .slice(-HISTORY_SIZE)
      .map((m) => ({ role: m.role as ChatTurn["role"], text: m.text }));

    try {
      const res = await askAssistant(
        history,
        myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : undefined,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          text: res.reply,
          cards: res.cards,
        },
      ]);
      setRemaining(res.remaining);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `e${Date.now()}`, role: "error", text: getErrorMessage(err) },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const showSuggestions = messages.length === 1 && !thinking;

  const go: Go = (to) => {
    onClose();
    setTimeout(to, 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1">
        <Pressable
          className="flex-1"
          style={{
            minHeight: insets.top + 30,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
          onPress={onClose}
        />

        <View className="overflow-hidden  bg-mist" style={{ height: "75%" }}>
          <View className="bg-brand px-4 pb-4 pt-3">
            <View
              className="mb-3 h-1.5 w-12 self-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
            />
            <View className="flex-row items-center">
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                <Ionicons name="chatbubbles" size={20} color={colors.white} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xl font-extrabold text-white">
                  Your food assistant
                </Text>
                <Text className="text-xs text-brand-soft">
                  AI · answers can be wrong, check before ordering
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                <Ionicons name="close" size={22} color={colors.white} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }>
            {messages.map((m) =>
              m.role === "user" ? (
                <View
                  key={m.id}
                  className="mb-3 max-w-[85%] self-end rounded-3xl rounded-br-md bg-brand px-4 py-2.5">
                  <Text className="text-base text-white">{m.text}</Text>
                </View>
              ) : (
                <View key={m.id} className="mb-3">
                  <View
                    className="max-w-[90%] self-start rounded-3xl rounded-bl-md px-4 py-2.5"
                    style={[
                      {
                        backgroundColor:
                          m.role === "error" ? "#fdecea" : colors.white,
                      },
                      m.role === "error" ? undefined : cardShadow,
                    ]}>
                    <Text
                      className="text-base leading-6"
                      style={{
                        color: m.role === "error" ? colors.danger : colors.text,
                      }}>
                      {m.text}
                    </Text>
                  </View>
                  {!!m.cards?.length && <Cards cards={m.cards} go={go} />}
                </View>
              ),
            )}

            {thinking && (
              <View
                className="mb-3 flex-row items-center self-start rounded-3xl rounded-bl-md bg-mist px-4 py-3"
                style={cardShadow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text className="ml-2 text-sm text-brand-light">Thinking…</Text>
              </View>
            )}

            {showSuggestions && (
              <View className="mt-1 flex-row flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    className="rounded-full border px-3.5 py-2 active:opacity-70"
                    style={{
                      borderColor: colors.brandLight,
                      backgroundColor: colors.mistLight,
                    }}>
                    <Text className="text-sm font-semibold text-brand-dark">
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {remaining !== null && remaining <= 5 && (
            <Text className="pb-1 text-center text-xs text-brand-light">
              {remaining === 0
                ? "No messages left today"
                : `${remaining} messages left today`}
            </Text>
          )}

          <View
            className="flex-row items-end px-3 pt-2"
            style={{
              backgroundColor: colors.brandLight,
              paddingBottom: insets.bottom + 8,
            }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about food, restaurants or your order…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              className="max-h-28 flex-1 rounded-3xl bg-white px-4 py-3 text-base"
              style={{ color: colors.text }}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              className="ml-2 h-12 w-12 items-center justify-center rounded-full "
              style={{
                backgroundColor: colors.white,
                opacity: !input.trim() || thinking ? 0.4 : 1,
              }}>
              <Ionicons name="send" size={20} color={colors.brandDark} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
