import type { Request, Response } from "express";
import { Restaurant, type RestaurantDoc } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { closureFields } from "../utils/openingHours.js";
import { seatsInUse } from "../utils/orderPricing.js";
import { customerListQuerySchema } from "../validators/customerRestaurant.validators.js";
import mongoose from "mongoose";
import { MenuCategory } from "../models/MenuCategory.js";
import { MenuItem } from "../models/MenuItem.js";
import { distanceKm } from "../utils/geo.js";

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Fields customers never need */
const HIDDEN_FIELDS = "-createdBy -email -isActive";
/** "Nearest" only shows restaurants within this distance (km) */
const NEAREST_MAX_KM = Number(process.env.NEAREST_MAX_KM) || 100;
/** Restaurant JSON + isOpenNow + isFavorite (for this customer) */
const toCustomerJSON = (restaurant: RestaurantDoc, favorites?: Set<string>) => ({
  ...restaurant.toJSON(),
    ...closureFields(restaurant),
  isFavorite: favorites?.has(String(restaurant._id)) ?? false,
});

/** The logged-in customer's ❤️ restaurant ids (empty for other roles) */
const favoriteIdsOf = async (req: Request) => {
  if (req.user?.role !== "customer") return new Set<string>();
  const me = await User.findById(req.user._id).select("+favoriteRestaurants").lean();
  return new Set((me?.favoriteRestaurants ?? []).map(String));
};


export const listRestaurants = async (req: Request, res: Response) => {
  const parsed = customerListQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const { search, city, service, lat, lng, sort, page, limit } = parsed.data;

  const managed = await User.distinct("restaurantId", { role: "manager", isActive: true });

  const filter: Record<string, unknown> = { isActive: true, _id: { $in: managed } };
  if (city) filter["address.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (service) filter[`services.${service}`] = true;
  const dishMatches = new Map<string, string[]>(); // restaurantId → up to 3 dish names
  if (search) {
    const term = new RegExp(escapeRegex(search), "i");
    const items = await MenuItem.find({ restaurantId: { $in: managed }, name: term, isAvailable: true })
      .select("restaurantId categoryId name")
      .limit(500)
      .lean();
    // Only dishes in categories customers can see
    const visible = new Set(
      (
        await MenuCategory.find({ _id: { $in: items.map((i) => i.categoryId) }, isActive: true })
          .select("_id")
          .lean()
      ).map((c) => String(c._id)),
    );
    for (const item of items) {
      if (!visible.has(String(item.categoryId))) continue;
      const key = String(item.restaurantId);
      const names = dishMatches.get(key) ?? [];
      if (names.length < 3 && !names.includes(item.name)) names.push(item.name);
      dishMatches.set(key, names);
    }

    filter.$or = [
      { name: term },
      { cuisines: term },
      { "address.area": term },
      { "address.city": term },
      { _id: { $in: [...dishMatches.keys()] } },
    ];
  }

 
  const here = lat !== undefined && lng !== undefined ? { lat, lng } : null;
  const distanceOf = (r: RestaurantDoc) => {
    const c = r.location?.coordinates; // [lng, lat]
    return here && c ? distanceKm(here, { lat: c[1], lng: c[0] }) : null;
  };
    const toCard = (r: RestaurantDoc, favorites: Set<string>) => {
    const d = distanceOf(r);
    const dishes = dishMatches.get(String(r._id));
    return {
      ...toCustomerJSON(r, favorites),
      ...(dishes && { matchedDishes: dishes }), // "Serves: Chicken Biryani, …"
      ...(d !== null && {
        distanceKm: Math.round(d * 10) / 10,
        deliversToYou: r.services.delivery && d <= r.deliveryRadiusKm,
      }),
    };
  };

  
  // Sorted in code so restaurants without a map location still show (at the end).
  if (sort === "nearest" && here) {
    const [all, favorites] = await Promise.all([
      Restaurant.find(filter).select(HIDDEN_FIELDS),
      favoriteIdsOf(req),
    ]);
    const nearby = all
      .map((r) => ({ r, d: distanceOf(r) }))
      .filter((x): x is { r: RestaurantDoc; d: number } => x.d !== null && x.d <= NEAREST_MAX_KM)
      .sort((a, b) => a.d - b.d || a.r.name.localeCompare(b.r.name));
    const pageItems = nearby.slice((page - 1) * limit, page * limit);

    return res.json({
      restaurants: pageItems.map(({ r }) => toCard(r, favorites)),
      total: nearby.length,
      page,
      pages: Math.max(1, Math.ceil(nearby.length / limit)),
    });
  }

  // ---------- A–Z ----------
  const [restaurants, total, favorites] = await Promise.all([
    Restaurant.find(filter)
      .select(HIDDEN_FIELDS)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Restaurant.countDocuments(filter),
    favoriteIdsOf(req),
  ]);
  res.json({
    restaurants: restaurants.map((r) => toCard(r, favorites)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
};



export const getRestaurant = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }

    const [restaurant, hasManager, favorites] = await Promise.all([
    Restaurant.findOne({ _id: id, isActive: true }).select(HIDDEN_FIELDS),
    User.exists({ role: "manager", isActive: true, restaurantId: id }),
    favoriteIdsOf(req),
  ]);

  if (!restaurant || !hasManager) {
    return res.status(404).json({ message: "This restaurant isn't available right now" });
  }

  res.json({ restaurant: toCustomerJSON(restaurant, favorites) });
};

export const getRestaurantMenu = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }

  const [available, hasManager] = await Promise.all([
    Restaurant.exists({ _id: id, isActive: true }),
    User.exists({ role: "manager", isActive: true, restaurantId: id }),
  ]);
  if (!available || !hasManager) {
    return res.status(404).json({ message: "This restaurant isn't available right now" });
  }

  const [categories, items] = await Promise.all([
    MenuCategory.find({ restaurantId: id, isActive: true }).sort({ sortOrder: 1, createdAt: 1 }),
    MenuItem.find({ restaurantId: id }).sort({ sortOrder: 1, createdAt: 1 }),
  ]);

  res.json({
    categories: categories
      .map((c) => ({ ...c.toJSON(), items: items.filter((i) => String(i.categoryId) === c.id) }))
      .filter((c) => c.items.length > 0),
  });
};


/** GET /api/restaurants/:id/seats — dine-in seats free right now (for checkout) */
export const getSeatAvailability = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }

  const restaurant = await Restaurant.findOne({ _id: id, isActive: true }).select("seatingCapacity services");
  if (!restaurant) return res.status(404).json({ message: "This restaurant isn't available right now" });
  if (!restaurant.services.dineIn) return res.json({ capacity: 0, inUse: 0, free: 0 });

  const inUse = await seatsInUse(restaurant._id);
  res.json({
    capacity: restaurant.seatingCapacity,
    inUse,
    free: Math.max(0, restaurant.seatingCapacity - inUse),
  });
};

export const listFavorites = async (req: Request, res: Response) => {
  const me = await User.findById(req.user!._id).select("+favoriteRestaurants").lean();
  const ids = (me?.favoriteRestaurants ?? []).map(String);
  if (ids.length === 0) return res.json({ restaurants: [] });

  const managed = (await User.distinct("restaurantId", { role: "manager", isActive: true })).map(String);
  const restaurants = await Restaurant.find({
    _id: { $in: ids.filter((id) => managed.includes(id)) },
    isActive: true,
  }).select(HIDDEN_FIELDS);

  // Same order as saved: last added first
  const position = new Map(ids.map((id, i) => [id, i]));
  restaurants.sort((a, b) => (position.get(String(b._id)) ?? 0) - (position.get(String(a._id)) ?? 0));

  const favorites = new Set(ids);
  res.json({ restaurants: restaurants.map((r) => toCustomerJSON(r, favorites)) });
};

/** POST /api/restaurants/:id/favorite — add ❤️ */
export const addFavorite = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid restaurant id" });
  if (!(await Restaurant.exists({ _id: id, isActive: true }))) {
    return res.status(404).json({ message: "This restaurant isn't available right now" });
  }

  await User.updateOne({ _id: req.user!._id }, { $addToSet: { favoriteRestaurants: id } });
  res.json({ message: "Added to favourites", isFavorite: true });
};

/** DELETE /api/restaurants/:id/favorite — remove ❤️ */
export const removeFavorite = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid restaurant id" });

  await User.updateOne({ _id: req.user!._id }, { $pull: { favoriteRestaurants: id } });
  res.json({ message: "Removed from favourites", isFavorite: false });
};