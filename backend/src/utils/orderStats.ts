import { z } from "zod";
import { ACTIVE_STATUSES, Order } from "../models/Order.js";

const TZ = "Asia/Karachi"; // all "today / this day" numbers use Pakistan time
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no daylight saving
const DAY_MS = 24 * 60 * 60 * 1000;

export const statsQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d"]).default("today"),
});
export type StatsRange = z.infer<typeof statsQuerySchema>["range"];

/** Midnight (Pakistan time) of today / 6 days ago / 29 days ago, as a real Date */
export const rangeStart = (range: StatsRange, now = new Date()) => {
  const todayStart = Math.floor((now.getTime() + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
  const daysBack = range === "today" ? 0 : range === "7d" ? 6 : 29;
  return new Date(todayStart - daysBack * DAY_MS);
};

/** "2026-11-16" in Pakistan time */
const dayKey = (date: Date) => new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

const STOPPED = ["rejected", "cancelled"];

interface Bucket {
  _id: string;
  orders: number;
  revenue: number;
}

/**
 * Order numbers for a set of orders (one restaurant, or the whole platform).
 * Revenue = total of COMPLETED orders (cash collected).
 */
export const buildOrderStats = async (match: Record<string, unknown>, range: StatsRange) => {
  const from = rangeStart(range);
  const inRange = { ...match, createdAt: { $gte: from } };
  const completedRevenue = { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] };

  // Today → per hour; 7 / 30 days → per day
  const bucketFormat = range === "today" ? "%H" : "%Y-%m-%d";

  const [result] = await Order.aggregate([
    { $match: inRange },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              revenue: { $sum: completedRevenue },
            },
          },
        ],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byType: [{ $group: { _id: "$type", orders: { $sum: 1 }, revenue: { $sum: completedRevenue } } }],
        series: [
          {
            $group: {
              _id: { $dateToString: { format: bucketFormat, date: "$createdAt", timezone: TZ } },
              orders: { $sum: 1 },
              revenue: { $sum: completedRevenue },
            },
          },
        ],
        topItems: [
          { $match: { status: { $nin: STOPPED } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.itemId",
              name: { $last: "$items.name" },
              image: { $last: "$items.image" },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.lineTotal" },
            },
          },
          { $sort: { quantity: -1, revenue: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  const summary = result?.summary?.[0] ?? { orders: 0, completed: 0, revenue: 0 };
  const statusCount = Object.fromEntries(
    (result?.byStatus ?? []).map((s: { _id: string; count: number }) => [s._id, s.count]),
  ) as Record<string, number>;

  // Fill empty hours / days with 0 so the chart has no gaps
  const found = new Map<string, Bucket>((result?.series ?? []).map((b: Bucket) => [b._id, b]));
  const series: { label: string; orders: number; revenue: number }[] = [];
  if (range === "today") {
    const currentHour = new Date(Date.now() + TZ_OFFSET_MS).getUTCHours();
    for (let h = 0; h <= currentHour; h++) {
      const key = String(h).padStart(2, "0");
      series.push({ label: key, orders: found.get(key)?.orders ?? 0, revenue: found.get(key)?.revenue ?? 0 });
    }
  } else {
    for (let t = from.getTime(); t <= Date.now(); t += DAY_MS) {
      const key = dayKey(new Date(t));
      series.push({ label: key, orders: found.get(key)?.orders ?? 0, revenue: found.get(key)?.revenue ?? 0 });
    }
  }

  return {
    range,
    from,
    summary: {
      orders: summary.orders,
      completed: summary.completed,
      revenue: summary.revenue,
      avgOrderValue: summary.completed ? Math.round(summary.revenue / summary.completed) : 0,
      rejected: statusCount.rejected ?? 0,
      cancelled: statusCount.cancelled ?? 0,
    },
    byStatus: statusCount,
    byType: (result?.byType ?? []).map((t: Bucket) => ({ type: t._id, orders: t.orders, revenue: t.revenue })),
    series,
    topItems: (result?.topItems ?? []).map(
      (i: { _id: unknown; name: string; image?: string; quantity: number; revenue: number }) => ({
        itemId: String(i._id),
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        revenue: i.revenue,
      }),
    ),
  };
};

/** Right now (not tied to the range): new + in-progress orders */
export const liveOrderCounts = async (match: Record<string, unknown>) => {
  const [pending, inProgress] = await Promise.all([
    Order.countDocuments({ ...match, status: "pending" }),
    Order.countDocuments({ ...match, status: { $in: ACTIVE_STATUSES.filter((s) => s !== "pending") } }),
  ]);
  return { pending, inProgress };
};