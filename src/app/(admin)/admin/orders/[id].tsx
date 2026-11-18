import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { cardShadow, colors } from "../../../../constants/theme";
import { getErrorMessage } from "../../../../lib/api";
import { getAnyOrder } from "../../../../services/adminOrderApi";
import type { AdminOrderDetail } from "../../../../types/order";
import { money } from "../../../../utils/menuFormat";
import {
  formatOrderDate,
  ORDER_STATUS_INFO,
  ORDER_TYPE_INFO,
  stoppedLabel,
  timeAgo,
} from "../../../../utils/orderFormat";

type IconName = ComponentProps<typeof Ionicons>["name"];

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-3 flex-row items-center">
        <View
          className="h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={icon} size={16} color={colors.brand} />
        </View>
        <Text className="ml-2 flex-1 text-base font-bold text-brand-dark">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function CallChip({ phone }: { phone: string }) {
  return (
    <Pressable
      onPress={() =>
        Linking.openURL(`tel:${phone}`).catch(() =>
          Alert.alert("Can't make a call", phone),
        )
      }
      className="mt-3 flex-row items-center self-start rounded-full px-3.5 py-2"
      style={{ backgroundColor: colors.brand }}>
      <Ionicons name="call" size={14} color={colors.white} />
      <Text className="ml-1.5 text-sm font-bold text-white">Call {phone}</Text>
    </Pressable>
  );
}

function BillRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-1">
      <Text
        className={
          bold
            ? "text-lg font-extrabold text-brand-dark"
            : "text-sm text-brand-light"
        }>
        {label}
      </Text>
      <Text
        className={
          bold
            ? "text-lg font-extrabold text-brand"
            : "text-sm font-semibold text-brand-dark"
        }>
        {value}
      </Text>
    </View>
  );
}

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setDetail(await getAnyOrder(String(id)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || error || !detail) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.mist }}>
        <Stack.Screen options={{ title: "Order" }} />
        {loading ? (
          <ActivityIndicator size="large" color={colors.brand} />
        ) : (
          <>
            <Ionicons name="alert-circle" size={44} color={colors.brandLight} />
            <Text className="mt-3 text-center text-brand-dark">
              {error || "Order not found"}
            </Text>
            <Pressable
              onPress={load}
              className="mt-4 rounded-2xl px-6 py-3"
              style={{ backgroundColor: colors.brand }}>
              <Text className="font-bold text-white">Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const { order: o, restaurant } = detail;
  const statusInfo = ORDER_STATUS_INFO[o.status];
  const typeInfo = ORDER_TYPE_INFO[o.type];
  const stopped = o.status === "rejected" || o.status === "cancelled";
  const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
  const customerPhone = o.delivery?.phone ?? o.customerPhone;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: `#${o.orderNumber}` }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }>
        <View
          className="mb-4 flex-row items-center rounded-3xl p-5"
          style={[
            cardShadow,
            { backgroundColor: stopped ? colors.text : colors.brand },
          ]}>
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.white }}>
            <Ionicons
              name={statusInfo.icon}
              size={28}
              color={stopped ? colors.text : colors.brand}
            />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-xl font-extrabold text-white">
              {statusInfo.label}
            </Text>
            <Text
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}>
              {typeInfo.label} · placed {timeAgo(o.createdAt)}
            </Text>
          </View>
          <Text className="text-lg font-extrabold text-white">
            {money(o.total)}
          </Text>
        </View>

        {stopped && !!(o.rejectReason || o.cancelReason) && (
          <View
            className="mb-4 flex-row items-start rounded-2xl p-4"
            style={{ backgroundColor: "#fde8e6" }}>
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.danger}
            />
            <Text
              className="ml-2 flex-1 text-sm"
              style={{ color: colors.danger }}>
              {stoppedLabel(o, "admin")}
              {o.rejectReason || o.cancelReason}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/admin/restaurants/[id]",
              params: { id: o.restaurantId },
            })
          }
          className="mb-4 flex-row items-center rounded-3xl bg-white p-4"
          style={cardShadow}>
          <View
            className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl"
            style={{ backgroundColor: colors.brandSoft }}>
            {restaurant?.logo ? (
              <Image
                source={{ uri: restaurant.logo }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-xl font-extrabold text-brand">
                {o.restaurantName[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text
              className="text-base font-bold text-brand-dark"
              numberOfLines={1}>
              {o.restaurantName}
            </Text>
            <Text className="text-xs text-brand-light" numberOfLines={1}>
              {[restaurant?.address?.area, restaurant?.address?.city]
                .filter(Boolean)
                .join(", ") || "Restaurant"}
              {restaurant?.phone ? ` · ${restaurant.phone}` : ""}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.brandLight}
          />
        </Pressable>

        <Card title="Customer" icon="person">
          <Text className="text-base font-bold text-brand-dark">
            {o.customerName}
          </Text>
          {!!customerPhone && <CallChip phone={customerPhone} />}
        </Card>

        {o.delivery && (
          <Card title="Delivery address" icon="location">
            <Text className="text-sm leading-5 text-brand-dark">
              {[o.delivery.street, o.delivery.area, o.delivery.city]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {!!o.delivery.instructions && (
              <Text className="mt-1 text-sm italic text-brand-light">
                {o.delivery.instructions}
              </Text>
            )}
          </Card>
        )}
        {o.dineIn && (
          <Card title={`Table for ${o.dineIn.partySize} person`} icon="people">
            <Text className="text-sm text-brand-light">
              {o.dineIn.seatsReserved
                ? "Seats are held for this order"
                : "Seats not held"}
            </Text>
          </Card>
        )}

        {/* Items */}
        <Card title={`Items · ${itemCount}`} icon="receipt">
          {o.items.map((item, i) => (
            <View
              key={item._id}
              className={`flex-row py-2.5 ${i < o.items.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: colors.mist }}>
              <Text className="w-8 text-sm font-extrabold text-brand">
                {item.quantity}×
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-bold text-brand-dark">
                  {item.name}
                </Text>
                {(!!item.sizeName || item.addOns.length > 0) && (
                  <Text className="text-xs text-brand-light">
                    {[item.sizeName, ...item.addOns.map((a) => a.name)]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}
                {!!item.note && (
                  <Text className="text-xs italic text-brand-light">
                    “{item.note}”
                  </Text>
                )}
              </View>
              <Text className="text-sm font-bold text-brand-dark">
                {money(item.lineTotal)}
              </Text>
            </View>
          ))}
          {!!o.note && (
            <View
              className="mt-2 rounded-2xl p-3"
              style={{ backgroundColor: colors.mistLight }}>
              <Text className="text-xs font-bold text-brand">Order note</Text>
              <Text className="text-sm text-brand-dark">{o.note}</Text>
            </View>
          )}
        </Card>

        {/* Bill */}
        <Card title="Bill" icon="wallet">
          <BillRow label="Subtotal" value={money(o.subtotal)} />
          {o.tax > 0 && (
            <BillRow label={`Tax (${o.taxRate}%)`} value={money(o.tax)} />
          )}
          {o.type === "delivery" && (
            <BillRow
              label="Delivery fee"
              value={o.deliveryFee > 0 ? money(o.deliveryFee) : "Free"}
            />
          )}
          <View
            className="my-2 border-t border-dashed"
            style={{ borderColor: colors.mistDark }}
          />
          <BillRow label="Total" value={money(o.total)} bold />
          <Text
            className="mt-2 text-sm font-semibold"
            style={{
              color:
                o.paymentStatus === "paid" ? colors.brand : colors.brandLight,
            }}>
            {o.paymentStatus === "paid"
              ? "✓ Paid in cash"
              : "Cash · not paid yet"}
          </Text>
        </Card>

        {/* Timeline */}
        <Card title="Timeline" icon="time">
          {o.statusHistory.map((h, i) => {
            const last = i === o.statusHistory.length - 1;
            const isStop = h.status === "rejected" || h.status === "cancelled";
            return (
              <View key={`${h.status}-${i}`} className="flex-row">
                <View className="mr-3 items-center" style={{ width: 20 }}>
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isStop ? colors.danger : colors.brand,
                    }}>
                    <Ionicons
                      name={isStop ? "close" : "checkmark"}
                      size={11}
                      color={colors.white}
                    />
                  </View>
                  {!last && (
                    <View
                      className="w-0.5 flex-1"
                      style={{
                        minHeight: 18,
                        backgroundColor: colors.brandSoft,
                      }}
                    />
                  )}
                </View>
                <View className="flex-1 flex-row justify-between pb-4">
                  <Text
                    className={`text-sm ${last ? "font-extrabold" : "font-semibold"}`}
                    style={{ color: isStop ? colors.danger : colors.text }}>
                    {h.status === "pending"
                      ? "Order placed"
                      : ORDER_STATUS_INFO[h.status].label}
                  </Text>
                  <Text className="text-xs text-brand-light">
                    {formatOrderDate(h.at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}
