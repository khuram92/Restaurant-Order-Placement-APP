import { Types } from "mongoose";
import { MenuItem } from "../models/MenuItem.js";
import { ACTIVE_STATUSES, Order } from "../models/Order.js";
import { Restaurant, type RestaurantDoc } from "../models/Restaurant.js";
import type { ToolDef } from "./aiProvider.js";
import { distanceKm, formatKm } from "./geo.js";
import { clockTimePk, closureFields } from "./openingHours.js";


export type AssistantCard =
  | {
      kind: "dish";
      itemId: string;
      restaurantId: string;
      name: string;
      restaurantName: string;
      price: number;
      image?: string;
      isOpenNow: boolean;
    }
  | {
      kind: "restaurant";
      restaurantId: string;
      name: string;
      logo?: string;
      cuisines: string[];
      isOpenNow: boolean;
      backAt?: string;
      ratingAvg?: number;
      distance?: string;
    }
  | {
      kind: "order";
      orderId: string;
      orderNumber: string;
      restaurantName: string;
      status: string;
      readyAt?: string;
    };

type Ctx = {
  userId: Types.ObjectId;
  location?: { lat: number; lng: number } | undefined;
  cards: AssistantCard[];
};

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
const MAX_CARDS = 8;

const addCard = (ctx: Ctx, card: AssistantCard) => {
  const id = card.kind === "dish" ? card.itemId : card.kind === "restaurant" ? card.restaurantId : card.orderId;
  const exists = ctx.cards.some(
    (c) => c.kind === card.kind && (c.kind === "dish" ? c.itemId : c.kind === "restaurant" ? c.restaurantId : c.orderId) === id,
  );
  if (!exists && ctx.cards.length < MAX_CARDS) ctx.cards.push(card);
};

const distanceOf = (ctx: Ctx, r: RestaurantDoc) => {
  const c = r.location?.coordinates;
  return ctx.location && c ? distanceKm(ctx.location, { lat: c[1], lng: c[0] }) : undefined;
};

/** What the AI (and the card) needs to know about whether a restaurant is open */
const statusOf = (r: RestaurantDoc) => {
  const s = closureFields(r);
  const backAt = s.reopensAt ? clockTimePk(s.reopensAt) : undefined;
  const text = s.isOpenNow
    ? "open now"
    : backAt
      ? `closed for a short while, back at ${backAt}`
      : s.isTemporarilyClosed
        ? "closed for now"
        : "closed (outside opening hours)";
  return { isOpenNow: s.isOpenNow, backAt, text };
};

const restaurantCard = (ctx: Ctx, r: RestaurantDoc) => {
  const st = statusOf(r);
  const km = distanceOf(ctx, r);
  addCard(ctx, {
    kind: "restaurant",
    restaurantId: String(r._id),
    name: r.name,
    ...(r.logo && { logo: r.logo }),
    cuisines: r.cuisines,
    isOpenNow: st.isOpenNow,
    ...(st.backAt && { backAt: st.backAt }),
    ...(r.ratingCount > 0 && { ratingAvg: r.ratingAvg }),
    ...(km !== undefined && { distance: formatKm(km) }),
  });
};

// ---------- Tool definitions (what the AI is allowed to ask for) ----------

export const ASSISTANT_TOOLS: ToolDef[] = [
  {
    name: "search_dishes",
    description:
      "Find dishes on the menus of restaurants in the app. Use for questions like 'spicy biryani under 800' or 'something with chicken'.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "1–2 short keywords in English, e.g. 'biryani', 'zinger burger'. Leave out to browse." },
        max_price: { type: "number", description: "Highest price in PKR, if the customer gave a budget" },
        spicy: { type: "boolean", description: "true if the customer wants spicy food" },
      },
    },
  },
  {
    name: "search_restaurants",
    description: "Find restaurants by name or cuisine (e.g. 'pizza', 'Chinese', 'Café Aroma').",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Restaurant name or cuisine. Leave out to list nearby/popular ones." },
        open_now: { type: "boolean", description: "true to show only restaurants open right now" },
      },
    },
  },
  {
    name: "restaurant_details",
    description:
      "Details of one restaurant: open or closed, today's hours, services, minimum order, delivery fee, rating, address.",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "The restaurant's name (or part of it)" } },
      required: ["name"],
    },
  },
  {
    name: "my_orders",
    description: "The customer's own recent orders and their live status (for 'where is my order?').",
    parameters: {
      type: "object",
      properties: { active_only: { type: "boolean", description: "true for orders still in progress only" } },
    },
  },
];

// ---------- Tool implementations (always scoped to this customer) ----------

const searchDishes = async (ctx: Ctx, args: Record<string, unknown>) => {
  const query = typeof args.query === "string" ? args.query.trim().slice(0, 40) : "";
  const maxPrice = typeof args.max_price === "number" ? args.max_price : undefined;
  const spicy = args.spicy === true;

  const regex = query ? new RegExp(escapeRegex(query), "i") : null;
  const items = await MenuItem.find({
    isAvailable: true,
    ...(regex && { $or: [{ name: regex }, { description: regex }] }),
    ...(spicy && { isSpicy: true }),
  })
    .limit(80)
    .lean();

  const restaurants = await Restaurant.find({
    _id: { $in: [...new Set(items.map((i) => String(i.restaurantId)))] },
    isActive: true,
  });
  const byId = new Map(restaurants.map((r) => [String(r._id), r]));

  const rows = items
    .map((i) => {
      const r = byId.get(String(i.restaurantId));
      if (!r) return null;
      const price = i.sizes.length > 0 ? Math.min(...i.sizes.map((s) => s.price)) : (i.price ?? 0);
      return { i, r, price, st: statusOf(r), km: distanceOf(ctx, r) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x && (maxPrice === undefined || x.price <= maxPrice))
    // open first, then nearest, then cheapest
    .sort(
      (a, b) =>
        Number(b.st.isOpenNow) - Number(a.st.isOpenNow) ||
        (a.km ?? 0) - (b.km ?? 0) ||
        a.price - b.price,
    )
    .slice(0, 6);

  rows.forEach(({ i, r, price, st }) =>
    addCard(ctx, {
      kind: "dish",
      itemId: String(i._id),
      restaurantId: String(r._id),
      name: i.name,
      restaurantName: r.name,
      price,
      ...(i.image && { image: i.image }),
      isOpenNow: st.isOpenNow,
    }),
  );

  return rows.length === 0
    ? { found: 0, note: "No matching dishes" }
    : {
        found: rows.length,
        dishes: rows.map(({ i, r, price, st, km }) => ({
          dish: i.name,
          price: i.sizes.length > 0 ? `from ${money(price)}` : money(price),
          spicy: i.isSpicy,
          serves: i.serves ?? i.sizes[0]?.serves,
          restaurant: r.name,
          restaurantStatus: st.text,
          ...(km !== undefined && { distance: formatKm(km) }),
        })),
      };
};

const searchRestaurants = async (ctx: Ctx, args: Record<string, unknown>) => {
  const query = typeof args.query === "string" ? args.query.trim().slice(0, 40) : "";
  const openOnly = args.open_now === true;
  const regex = query ? new RegExp(escapeRegex(query), "i") : null;

  const found = await Restaurant.find({
    isActive: true,
    ...(regex && { $or: [{ name: regex }, { cuisines: regex }] }),
  }).limit(40);

  const rows = found
    .map((r) => ({ r, st: statusOf(r), km: distanceOf(ctx, r) }))
    .filter((x) => !openOnly || x.st.isOpenNow)
    .sort(
      (a, b) =>
        Number(b.st.isOpenNow) - Number(a.st.isOpenNow) ||
        (a.km ?? 0) - (b.km ?? 0) ||
        (b.r.ratingAvg ?? 0) - (a.r.ratingAvg ?? 0),
    )
    .slice(0, 5);

  rows.forEach(({ r }) => restaurantCard(ctx, r));
  return rows.length === 0
    ? { found: 0, note: "No matching restaurants" }
    : {
        found: rows.length,
        restaurants: rows.map(({ r, st, km }) => ({
          name: r.name,
          cuisines: r.cuisines.join(", "),
          status: st.text,
          ...(r.ratingCount > 0 && { rating: `${r.ratingAvg.toFixed(1)} (${r.ratingCount})` }),
          ...(km !== undefined && { distance: formatKm(km) }),
        })),
      };
};

/** "mon" / "tue"… in Pakistan time */
const todayPk = () =>
  new Date().toLocaleDateString("en-US", { timeZone: "Asia/Karachi", weekday: "short" }).toLowerCase().slice(0, 3);

const restaurantDetails = async (ctx: Ctx, args: Record<string, unknown>) => {
  const name = typeof args.name === "string" ? args.name.trim().slice(0, 60) : "";
  if (!name) return { error: "Which restaurant?" };
  const r = await Restaurant.findOne({ isActive: true, name: new RegExp(escapeRegex(name), "i") });
  if (!r) return { found: false, note: `No restaurant called "${name}"` };

  restaurantCard(ctx, r);
  const st = statusOf(r);
  const today = r.openingHours.find((h) => h.day === todayPk());
  const km = distanceOf(ctx, r);
  const services = (["dineIn", "takeaway", "delivery"] as const).filter((s) => r.services[s]);

  return {
    name: r.name,
    status: st.text,
    todayHours: !today || today.closed ? "closed today" : `${today.open}–${today.close}`,
    services: services.join(", "),
    minimumOrder: r.minOrder > 0 ? money(r.minOrder) : "none",
    ...(r.services.delivery && {
      delivery: `${money(r.deliveryFee)} base + ${money(r.deliveryFeePerKm ?? 0)} per km, within ${r.deliveryRadiusKm} km`,
    }),
    ...(r.ratingCount > 0 && { rating: `${r.ratingAvg.toFixed(1)} from ${r.ratingCount} reviews` }),
    address: [r.address.street, r.address.area, r.address.city].filter(Boolean).join(", "),
    ...(km !== undefined && { distanceFromCustomer: formatKm(km) }),
  };
};

const myOrders = async (ctx: Ctx, args: Record<string, unknown>) => {
  const activeOnly = args.active_only === true;
  const orders = await Order.find({
    customerId: ctx.userId,
    ...(activeOnly && { status: { $in: ACTIVE_STATUSES } }),
  })
    .sort({ createdAt: -1 })
    .limit(5);

  orders.forEach((o) =>
    addCard(ctx, {
      kind: "order",
      orderId: String(o._id),
      orderNumber: o.orderNumber,
      restaurantName: o.restaurantName,
      status: o.status,
      ...(o.readyBy && { readyAt: clockTimePk(o.readyBy) }),
    }),
  );

  return orders.length === 0
    ? { found: 0, note: activeOnly ? "No orders in progress" : "No orders yet" }
    : {
        orders: orders.map((o) => ({
          orderNumber: o.orderNumber,
          restaurant: o.restaurantName,
          type: o.type,
          status: o.status,
          total: money(o.total),
          ...(o.readyBy && ACTIVE_STATUSES.includes(o.status) && { readyAround: clockTimePk(o.readyBy) }),
        })),
      };
};

/** Runs one tool the AI asked for */
export const runAssistantTool = (ctx: Ctx, name: string, args: Record<string, unknown>) => {
  switch (name) {
    case "search_dishes":
      return searchDishes(ctx, args);
    case "search_restaurants":
      return searchRestaurants(ctx, args);
    case "restaurant_details":
      return restaurantDetails(ctx, args);
    case "my_orders":
      return myOrders(ctx, args);
    default:
      return Promise.resolve({ error: `Unknown tool ${name}` });
  }
};