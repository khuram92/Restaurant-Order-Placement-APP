import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { cardShadow, colors } from "../../../constants/theme";
import {
  OutcomeRow,
  RANGE_LABEL,
  RangeTabs,
  RankedList,
  SeriesChart,
  StatTile,
  TypeSplit,
  shortMoney,
} from "../../../components/stats/StatsParts";
import { getErrorMessage } from "../../../lib/api";
import { getManagerStats } from "../../../services/statsApi";
import type { OrderStats, StatsRange } from "../../../types/stats";
import { money } from "../../../utils/menuFormat";

export default function ManagerDashboard() {
  const [range, setRange] = useState<StatsRange>("today");
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const load = useCallback(async (which: StatsRange) => {
    setError("");
    try {
      const data = await getManagerStats(which);
      if (rangeRef.current === which) setStats(data);
    } catch (err) {
      if (rangeRef.current === which) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // On open, when coming back, and every 60 s while open
  useFocusEffect(
    useCallback(() => {
      load(rangeRef.current);
      const timer = setInterval(() => load(rangeRef.current), 60000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const changeRange = (r: StatsRange) => {
    setRange(r);
    rangeRef.current = r;
    setLoading(true);
    load(r);
  };

  const s = stats?.summary;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.mist }}>
      <Stack.Screen options={{ title: "Dashboard" }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(range);
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }>
        
        <View className=" px-4 pb-8 pt-2" style={{ backgroundColor: colors.brand }}>
          <RangeTabs value={range} onChange={changeRange} />
        </View>

        <View className="-mt-5 px-4">
          {loading && !stats ? (
            <View className="items-center py-20">
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : error && !stats ? (
            <View className="items-center rounded-3xl bg-white p-6" style={cardShadow}>
              <Ionicons name="alert-circle" size={40} color={colors.brandLight} />
              <Text className="mt-2 text-center text-brand-dark">{error}</Text>
              <Pressable onPress={() => load(range)} className="mt-4 rounded-2xl px-6 py-3" style={{ backgroundColor: colors.brand }}>
                <Text className="font-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : stats && s ? (
            <View style={{ opacity: loading ? 0.5 : 1 }}>
             
              <Pressable
                onPress={() => router.push("/manager/orders")}
                className="mb-4 flex-row items-center rounded-3xl bg-white p-4"
                style={cardShadow}>
                <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.danger }}>
                  <Ionicons name="flame" size={20} color={colors.white} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-bold uppercase tracking-wide text-brand-light">Live now</Text>
                  <Text className="text-base font-bold text-brand-dark">
                    {stats.live.pending} new · {stats.live.inProgress} in progress
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.brandLight} />
              </Pressable>

              
              <View className="mb-3 flex-row gap-3">
                <StatTile icon="cash" label={`Revenue · ${RANGE_LABEL[range]}`} value={shortMoney(s.revenue)} hint="Completed orders" highlight />
                <StatTile icon="receipt" label="Orders" value={String(s.orders)} hint={`${s.completed} completed`} />
              </View>
              <View className="mb-4 flex-row gap-3">
                <StatTile icon="pricetag" label="Avg order" value={s.avgOrderValue ? shortMoney(s.avgOrderValue) : "–"} />
                <StatTile
                  icon="trending-up"
                  label="Success rate"
                  value={s.orders ? `${Math.round((s.completed / s.orders) * 100)}%` : "–"}
                  hint="Completed of all orders"
                />
              </View>

              <OutcomeRow summary={s} />
              <SeriesChart series={stats.series} range={range} />
              <TypeSplit byType={stats.byType} />
              <RankedList
                title="Best sellers"
                icon="trophy"
                empty="No items sold in this period yet"
                rows={stats.topItems.map((i) => ({
                  key: i.itemId,
                  name: i.name,
                  ...(i.image && { image: i.image }),
                  main: `${i.quantity}×`,
                  sub: money(i.revenue),
                }))}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}