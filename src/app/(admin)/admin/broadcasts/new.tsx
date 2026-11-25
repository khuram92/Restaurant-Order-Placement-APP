import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import {
  previewBroadcast,
  sendBroadcast,
} from "../../../../services/adminBroadcastApi";
import { getOrderFilterRestaurants } from "../../../../services/adminOrderApi";
import type {
  BroadcastAudience,
  BroadcastPreview,
  RestaurantTarget,
} from "../../../../types/broadcast";
import type { AdminOrderRestaurant } from "../../../../types/order";

type IconName = ComponentProps<typeof Ionicons>["name"];

const AUDIENCES: { key: BroadcastAudience; label: string; icon: IconName }[] = [
  { key: "everyone", label: "Everyone", icon: "globe" },
  { key: "customers", label: "Customers", icon: "people" },
  { key: "managers", label: "Managers", icon: "briefcase" },
  { key: "restaurants", label: "By restaurant", icon: "restaurant" },
];

const TARGETS: { key: RestaurantTarget; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "managers", label: "Managers" },
  { key: "both", label: "Both" },
];

const TITLE_MAX = 60;
const BODY_MAX = 200;

function Label({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-brand">
      {children}
    </Text>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <View
      className="h-6 w-6 items-center justify-center rounded-full border-2"
      style={{
        borderColor: on ? colors.brand : colors.mistDark,
        backgroundColor: on ? colors.brand : colors.white,
      }}>
      {on && <Ionicons name="checkmark" size={14} color={colors.white} />}
    </View>
  );
}

function RestaurantPicker({
  visible,
  title,
  restaurants,
  selected,
  multiple,
  onDone,
  onClose,
}: {
  visible: boolean;
  title: string;
  restaurants: AdminOrderRestaurant[];
  selected: string[];
  multiple: boolean;
  onDone: (ids: string[]) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<string[]>(selected);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (visible) {
      setPicked(selected);
      setQ("");
    }
  }, [visible]);

  const shown = restaurants.filter((r) =>
    r.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const toggle = (id: string) => {
    if (!multiple) return onDone([id]);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      />
      <View
        className="rounded-t-[28px] bg-white px-5 pt-3"
        style={{ maxHeight: "80%", paddingBottom: insets.bottom + 12 }}>
        <View
          className="mb-3 h-1.5 w-12 self-center rounded-full"
          style={{ backgroundColor: colors.mistDark }}
        />
        <Text className="mb-3 text-xl font-extrabold text-brand-dark">
          {title}
        </Text>
        <View
          className="mb-3 flex-row items-center rounded-2xl px-3"
          style={{ backgroundColor: colors.mistLight }}>
          <Ionicons name="search" size={16} color={colors.brandLight} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search restaurants"
            placeholderTextColor={colors.textMuted}
            className="ml-2 flex-1 py-3 text-base"
            style={{ color: colors.text }}
          />
        </View>
        <FlatList
          data={shown}
          keyExtractor={(r) => r._id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggle(item._id)}
              className="flex-row items-center border-b py-3"
              style={{ borderColor: colors.mist }}>
              <View
                className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
                style={{ backgroundColor: colors.brandSoft }}>
                {item.logo ? (
                  <Image
                    source={{ uri: item.logo }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="restaurant" size={18} color={colors.brand} />
                )}
              </View>
              <Text
                className="ml-3 flex-1 text-base font-semibold text-brand-dark"
                numberOfLines={1}>
                {item.name}
                {item.isActive === false ? "  (inactive)" : ""}
              </Text>
              <Tick on={picked.includes(item._id)} />
            </Pressable>
          )}
        />
        {multiple && (
          <Pressable
            onPress={() => onDone(picked)}
            className="mt-3 items-center rounded-2xl py-4"
            style={{ backgroundColor: colors.brand }}>
            <Text className="text-base font-bold text-white">
              {picked.length ? `Select ${picked.length}` : "Done"}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

export default function NewBroadcastScreen() {
  const [restaurants, setRestaurants] = useState<AdminOrderRestaurant[]>([]);
  const [audience, setAudience] = useState<BroadcastAudience>("customers");
  const [restaurantIds, setRestaurantIds] = useState<string[]>([]);
  const [target, setTarget] = useState<RestaurantTarget>("customers");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkId, setLinkId] = useState<string | null>(null);

  const [picker, setPicker] = useState<"audience" | "link" | null>(null);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [counting, setCounting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getOrderFilterRestaurants()
      .then(setRestaurants)
      .catch(() => {});
  }, []);

  const byId = useMemo(
    () => new Map(restaurants.map((r) => [r._id, r])),
    [restaurants],
  );
  const activeRestaurants = useMemo(
    () => restaurants.filter((r) => r.isActive !== false),
    [restaurants],
  );
  const audienceReady = audience !== "restaurants" || restaurantIds.length > 0;

  useEffect(() => {
    if (!audienceReady) {
      setPreview(null);
      return;
    }
    setCounting(true);
    const timer = setTimeout(() => {
      previewBroadcast({
        audience,
        ...(audience === "restaurants" && {
          restaurantIds,
          restaurantTarget: target,
        }),
      })
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setCounting(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [audience, restaurantIds, target, audienceReady]);

  const canSend =
    audienceReady &&
    title.trim().length >= 3 &&
    body.trim().length >= 5 &&
    !!preview &&
    preview.total > 0 &&
    preview.remainingToday > 0 &&
    !sending;

  const doSend = async () => {
    setSending(true);
    try {
      const res = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
        ...(audience === "restaurants" && {
          restaurantIds,
          restaurantTarget: target,
        }),
        ...(linkId && { linkRestaurantId: linkId }),
      });
      Alert.alert("Broadcast sent", res.message, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Couldn't send", getErrorMessage(err));
      setSending(false);
    }
  };

  const confirmSend = () =>
    Alert.alert(
      `Send to ${preview?.total ?? 0} people?`,
      "Everyone in this audience gets a notification right away. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send now", onPress: doSend },
      ],
    );

  const pickedNames = restaurantIds
    .map((id) => byId.get(id)?.name)
    .filter(Boolean) as string[];
  const linked = linkId ? byId.get(linkId) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-mist">
      <Stack.Screen options={{ title: "New broadcast" }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {/* ----- Audience ----- */}
        <Label>Send to</Label>
        <View className="flex-row flex-wrap justify-between gap-y-2">
          {AUDIENCES.map((a) => {
            const on = audience === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => setAudience(a.key)}
                className="flex-row items-center rounded-2xl border-2 px-3 py-3"
                style={{
                  width: "48.5%",
                  borderColor: on ? colors.brand : colors.mistDark,
                  backgroundColor: on ? colors.brand : colors.white,
                }}>
                <Ionicons
                  name={a.icon}
                  size={18}
                  color={on ? colors.white : colors.brand}
                />
                <Text
                  className="ml-2 text-sm font-bold"
                  style={{ color: on ? colors.white : colors.brandDark }}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {audience === "restaurants" && (
          <View className="mt-3 rounded-3xl bg-white p-4" style={cardShadow}>
            <Pressable
              onPress={() => setPicker("audience")}
              className="flex-row items-center p-2 rounded-full bg-mist">
              <Ionicons name="restaurant" size={18} color={colors.brand} />
              <Text
                className="ml-2 flex-1 text-sm font-semibold text-brand-dark"
                numberOfLines={2}>
                {pickedNames.length
                  ? pickedNames.join(", ")
                  : "Choose restaurants"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.brandLight}
              />
            </Pressable>

            <View
              className="mt-3 flex-row rounded-2xl p-1"
              style={{ backgroundColor: colors.mistLight }}>
              {TARGETS.map((t) => {
                const on = target === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTarget(t.key)}
                    className="flex-1 items-center rounded-xl py-2"
                    style={{
                      backgroundColor: on ? colors.brand : "transparent",
                    }}>
                    <Text
                      className="text-sm font-bold"
                      style={{ color: on ? colors.white : colors.brandDark }}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {target !== "managers" && (
              <Text className="mt-2 text-xs text-brand-light">
                Customers = people who ordered from these restaurants or saved
                them as a favourite.
              </Text>
            )}
          </View>
        )}

        <View
          className="mt-3 flex-row items-center rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name="people" size={18} color={colors.brand} />
          <View className="ml-2 flex-1">
            {!audienceReady ? (
              <Text className="text-sm text-brand-dark">
                Choose at least one restaurant
              </Text>
            ) : counting && !preview ? (
              <ActivityIndicator
                size="small"
                color={colors.brand}
                style={{ alignSelf: "flex-end" }}
              />
            ) : preview ? (
              <>
                <Text className="text-sm font-bold text-brand-dark">
                  Will reach {preview.total}{" "}
                  {preview.total === 1 ? "person" : "people"}
                </Text>
                <Text className="text-xs text-brand-light">
                  {preview.customers} customers · {preview.managers} managers
                  {preview.optedOut > 0
                    ? ` · ${preview.optedOut} turned offers off`
                    : ""}
                </Text>
              </>
            ) : (
              <Text className="text-sm text-brand-dark">
                Couldn't count recipients
              </Text>
            )}
          </View>
        </View>

        <Label>Message</Label>
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <TextInput
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
            placeholder="Title, e.g. Weekend deal 🍕"
            placeholderTextColor={colors.textMuted}
            className="rounded-2xl px-4 py-3 text-base font-bold"
            style={{ backgroundColor: colors.mistLight, color: colors.text }}
          />
          <Text className="mb-3 mt-1 text-right text-xs text-brand-light">
            {title.length}/{TITLE_MAX}
          </Text>
          <TextInput
            value={body}
            onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
            placeholder="What do you want to tell them?"
            placeholderTextColor={colors.textMuted}
            multiline
            className="min-h-24 rounded-2xl px-4 py-3 text-base"
            style={{
              backgroundColor: colors.mistLight,
              color: colors.text,
              textAlignVertical: "top",
            }}
          />
          <Text className="mt-1 text-right text-xs text-brand-light">
            {body.length}/{BODY_MAX}
          </Text>
        </View>

        <Label>When tapped (optional)</Label>
        <Pressable
          onPress={() => setPicker("link")}
          className="flex-row items-center rounded-3xl bg-white p-4"
          style={cardShadow}>
          <Ionicons name="link" size={18} color={colors.brand} />
          <Text
            className="ml-2 flex-1 text-sm font-semibold text-brand-dark"
            numberOfLines={1}>
            {linked ? `Open ${linked.name}` : "Just open the notification"}
          </Text>
          {linked ? (
            <Pressable onPress={() => setLinkId(null)} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.brandLight}
              />
            </Pressable>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.brandLight}
            />
          )}
        </Pressable>

        <Label>Preview</Label>
        <View
          className="rounded-3xl p-3"
          style={{ backgroundColor: colors.brandDark }}>
          <View className="rounded-2xl bg-white p-3">
            <View className="flex-row items-center">
              <View
                className="h-5 w-5 items-center justify-center rounded-md"
                style={{ backgroundColor: colors.brand }}>
                <Ionicons name="megaphone" size={11} color={colors.white} />
              </View>
              <Text className="ml-2 text-xs text-brand-light">
                Restaurant Orders · now
              </Text>
            </View>
            <Text
              className="mt-1.5 text-sm font-bold text-brand-dark"
              numberOfLines={1}>
              {title.trim() || "Your title"}
            </Text>
            <Text className="text-sm text-brand-dark" numberOfLines={3}>
              {body.trim() || "Your message"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={confirmSend}
          disabled={!canSend}
          className="mt-6 flex-row items-center justify-center rounded-2xl py-4"
          style={{
            backgroundColor: colors.brand,
            opacity: canSend ? 1 : 0.45,
          }}>
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={colors.white} />
              <Text className="ml-2 text-base font-bold text-white">Send</Text>
            </>
          )}
        </Pressable>
        {preview && preview.remainingToday === 0 && (
          <Text
            className="mt-2 text-center text-xs"
            style={{ color: colors.danger }}>
            Today's limit is used. You can send more tomorrow.
          </Text>
        )}
      </ScrollView>

      <RestaurantPicker
        visible={picker === "audience"}
        title="Choose restaurants"
        restaurants={restaurants}
        selected={restaurantIds}
        multiple
        onClose={() => setPicker(null)}
        onDone={(ids) => {
          setRestaurantIds(ids);
          setPicker(null);
        }}
      />
      <RestaurantPicker
        visible={picker === "link"}
        title="Open which restaurant?"
        restaurants={activeRestaurants}
        selected={linkId ? [linkId] : []}
        multiple={false}
        onClose={() => setPicker(null)}
        onDone={(ids) => {
          setLinkId(ids[0] ?? null);
          setPicker(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
