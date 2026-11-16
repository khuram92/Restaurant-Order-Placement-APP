import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cardShadow, colors } from "../../constants/theme";
import type { OrderStats, StatsRange } from "../../types/stats";
import { money } from "../../utils/menuFormat";
import { ORDER_TYPE_INFO } from "../../utils/orderFormat";

type IconName = ComponentProps<typeof Ionicons>["name"];


export const shortMoney = (n: number) =>
  n >= 1_000_000 ? `Rs ${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `Rs ${(n / 1000).toFixed(1)}k` : money(n);

export const RANGE_LABEL: Record<StatsRange, string> = { today: "Today", "7d": "7 days", "30d": "30 days" };


export function RangeTabs({ value, onChange }: { value: StatsRange; onChange: (r: StatsRange) => void }) {
  return (
    <View className="flex-row rounded-2xl p-1" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
      {(["today", "7d", "30d"] as const).map((r) => {
        const selected = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            className="flex-1 items-center rounded-xl py-2"
            style={{ backgroundColor: selected ? colors.white : "transparent" }}>
            <Text className="text-sm font-bold" style={{ color: selected ? colors.brand : colors.white }}>
              {RANGE_LABEL[r]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}


export function StatsCard({ title, icon, right, children }: { title: string; icon: IconName; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl bg-white p-5" style={cardShadow}>
      <View className="mb-4 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
          <Ionicons name={icon} size={18} color={colors.brand} />
        </View>
        <Text className="ml-2 flex-1 text-xl font-bold text-brand-dark">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}


export function StatTile({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <View
      className="flex-1 rounded-3xl p-4"
      style={[cardShadow, { backgroundColor: highlight ? colors.brand : colors.white }]}>
      <View
        className="h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: highlight ? "rgba(255,255,255,0.2)" : colors.brandSoft }}>
        <Ionicons name={icon} size={18} color={highlight ? colors.white : colors.brand} />
      </View>
      <Text className="mt-3 text-2xl font-extrabold" style={{ color: highlight ? colors.white : colors.text }} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-sm font-semibold" style={{ color: highlight ? colors.brandSoft : colors.brandLight }}>
        {label}
      </Text>
      {!!hint && (
        <Text className="mt-1 text-[11px]" style={{ color: highlight ? colors.brandSoft : colors.brandLight }} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </View>
  );
}


const barLabel = (label: string, range: StatsRange) => {
  if (range === "today") return `${Number(label) % 12 || 12}${Number(label) < 12 ? "a" : "p"}`; // 9a, 2p
  const d = new Date(`${label}T00:00:00`);
  return range === "7d" ? d.toLocaleDateString("en-GB", { weekday: "short" }) : String(d.getDate());
};

export function SeriesChart({ series, range }: { series: OrderStats["series"]; range: StatsRange }) {
  const [metric, setMetric] = useState<"orders" | "revenue">("orders");
  const [picked, setPicked] = useState<number | null>(null);
  const values = series.map((s) => s[metric]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  // Show every label for 7 days; every few for longer charts
  const labelEvery = series.length <= 8 ? 1 : series.length <= 16 ? 2 : 5;
  const shown = picked !== null ? series[picked] : null;

  return (
    <StatsCard
      title={metric === "orders" ? "Orders over time" : "Revenue over time"}
      icon="bar-chart"
      right={
        <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.mistLight }}>
          {(["orders", "revenue"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMetric(m);
                setPicked(null);
              }}
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: metric === m ? colors.brand : "transparent" }}>
              <Text className="text-xs font-bold" style={{ color: metric === m ? colors.white : colors.brandDark }}>
                {m === "orders" ? "Orders" : "Rs"}
              </Text>
            </Pressable>
          ))}
        </View>
      }>
     
      <Text className="mb-3 text-sm text-brand-light">
        {shown ? (
          <>
            <Text className="font-extrabold text-brand-dark">
              {metric === "orders" ? `${shown.orders} orders` : money(shown.revenue)}
            </Text>
            {"  ·  "}
            {range === "today" ? `${barLabel(shown.label, range)}m` : new Date(`${shown.label}T00:00:00`).toDateString()}
          </>
        ) : (
          <>
            Total{" "}
            <Text className="font-extrabold text-brand-dark">{metric === "orders" ? total : money(total)}</Text>
            {"  ·  tap a bar"}
          </>
        )}
      </Text>

      <View className="h-36 flex-row items-end" style={{ gap: series.length > 16 ? 2 : 4 }}>
        {series.map((s, i) => {
          const value = s[metric];
          const selected = picked === i;
          return (
            <Pressable key={s.label} onPress={() => setPicked(selected ? null : i)} className="h-full flex-1 justify-end">
              <View
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(value > 0 ? 6 : 2, (value / max) * 100)}%`,
                  backgroundColor: selected ? colors.brandDark : value > 0 ? colors.brand : colors.mistLight,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View className="mt-1.5 flex-row" style={{ gap: series.length > 16 ? 2 : 4 }}>
        {series.map((s, i) => (
          <Text key={s.label} className="flex-1 text-center text-[9px] text-brand-light" numberOfLines={1}>
            {i % labelEvery === 0 ? barLabel(s.label, range) : ""}
          </Text>
        ))}
      </View>
    </StatsCard>
  );
}

// ---------- Dine-in / Takeaway / Delivery split ----------
export function TypeSplit({ byType }: { byType: OrderStats["byType"] }) {
  const total = byType.reduce((s, t) => s + t.orders, 0);
  const rows = (["dineIn", "takeaway", "delivery"] as const).map((type) => ({
    type,
    ...(byType.find((t) => t.type === type) ?? { orders: 0, revenue: 0 }),
  }));

  return (
    <StatsCard title="Order types" icon="pie-chart">
      {rows.map((r) => {
        const pct = total ? Math.round((r.orders / total) * 100) : 0;
        return (
          <View key={r.type} className="mb-3">
            <View className="mb-1.5 flex-row items-center">
              <Ionicons name={ORDER_TYPE_INFO[r.type].icon} size={15} color={colors.brand} />
              <Text className="ml-2 flex-1 text-sm font-semibold text-brand-dark">{ORDER_TYPE_INFO[r.type].label}</Text>
              <Text className="text-sm text-brand-light">
                <Text className="font-extrabold text-brand-dark">{r.orders}</Text> · {pct}%
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.mistLight }}>
              <View className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.brand }} />
            </View>
          </View>
        );
      })}
    </StatsCard>
  );
}

// ---------- Ranked list (top items / top restaurants) ----------
export function RankedList({
  title,
  icon,
  rows,
  empty,
}: {
  title: string;
  icon: IconName;
  rows: { key: string; name: string; image?: string; main: string; sub: string }[];
  empty: string;
}) {
  return (
    <StatsCard title={title} icon={icon}>
      {rows.length === 0 ? (
        <Text className="py-2 text-center text-sm text-brand-light">{empty}</Text>
      ) : (
        rows.map((r, i) => (
          <View
            key={r.key}
            className={`flex-row items-center py-2.5 ${i < rows.length - 1 ? "border-b" : ""}`}
            style={{ borderColor: colors.mist }}>
            <Text className="w-6 text-base font-extrabold" style={{ color: i === 0 ? colors.brand : colors.brandLight }}>
              {i + 1}
            </Text>
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: colors.brandSoft }}>
              {r.image ? (
                <Image source={{ uri: r.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <Text className="text-base font-extrabold text-brand">{r.name[0]?.toUpperCase()}</Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-brand-dark" numberOfLines={1}>
                {r.name}
              </Text>
              <Text className="text-xs text-brand-light">{r.sub}</Text>
            </View>
            <Text className="text-sm font-extrabold text-brand-dark">{r.main}</Text>
          </View>
        ))
      )}
    </StatsCard>
  );
}

// ---------- Small chips row: completed / rejected / cancelled ----------
export function OutcomeRow({ summary }: { summary: OrderStats["summary"] }) {
  const chips = [
    { icon: "checkmark-circle" as const, label: "Completed", value: summary.completed, color: colors.brand },
    { icon: "close-circle" as const, label: "Rejected", value: summary.rejected, color: colors.danger },
    { icon: "ban" as const, label: "Cancelled", value: summary.cancelled, color: colors.brandLight },
  ];
  return (
    <View className="mb-4 flex-row gap-3">
      {chips.map((c) => (
        <View key={c.label} className="flex-1 flex-row items-center rounded-2xl bg-white px-3 py-2.5" style={cardShadow}>
          <Ionicons name={c.icon} size={16} color={c.color} />
          <View className="ml-2">
            <Text className="text-base font-extrabold text-brand-dark">{c.value}</Text>
            <Text className="text-[11px] text-brand-light">{c.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}