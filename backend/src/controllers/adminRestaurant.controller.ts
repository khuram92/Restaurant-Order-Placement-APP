// import type { Request, Response } from "express";
// import mongoose from "mongoose";
// import { Restaurant } from "../models/Restaurant.js";
// import {
//   createRestaurantSchema,
//   listQuerySchema,
//   statusSchema,
//   updateRestaurantSchema,
// } from "../validators/restaurant.validators.js";

// // ---------- Helpers ----------

// /** { lat, lng } from the app → GeoJSON { type: "Point", coordinates: [lng, lat] } */
// const toGeoPoint = (loc: { lat: number; lng: number }) => ({
//   type: "Point" as const,
//   coordinates: [loc.lng, loc.lat] as [number, number],
// });

// /** Escape user text before using it in a RegExp */
// const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Invalid input";

// /** Loads a restaurant by :id, or sends 400/404 and returns null */
// const findRestaurantOr404 = async (req: Request, res: Response) => {
//   const id = String(req.params.id);
//   if (!mongoose.isValidObjectId(id)) {
//     res.status(400).json({ message: "Invalid restaurant id" });
//     return null;
//   }
//   const restaurant = await Restaurant.findById(id);
//   if (!restaurant) {
//     res.status(404).json({ message: "Restaurant not found" });
//     return null;
//   }
//   return restaurant;
// };

// // ---------- Controllers ----------

// /** POST /api/admin/restaurants */
// export const createRestaurant = async (req: Request, res: Response) => {
//   const parsed = createRestaurantSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

//   const { location, ...data } = parsed.data;

//   const restaurant = new Restaurant({ createdBy: req.user!._id });
//   restaurant.set(data);
//   if (location) restaurant.set("location", toGeoPoint(location));
//   await restaurant.save(); // runs model validation (e.g. at least one service)

//   res.status(201).json({ restaurant });
// };

// /** GET /api/admin/restaurants?search=&city=&status=active|inactive|all&page=1&limit=20 */
// export const listRestaurants = async (req: Request, res: Response) => {
//   const parsed = listQuerySchema.safeParse(req.query);
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

//   const { search, city, status, page, limit } = parsed.data;
//   const filter: Record<string, unknown> = {};

//   if (status === "active") filter.isActive = true;
//   if (status === "inactive") filter.isActive = false;
//   if (city) filter["address.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
//   if (search) {
//     const term = new RegExp(escapeRegex(search), "i");
//     filter.$or = [{ name: term }, { "address.area": term }, { "address.city": term }, { cuisines: term }];
//   }

//   const [restaurants, total] = await Promise.all([
//     Restaurant.find(filter)
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit),
//     Restaurant.countDocuments(filter),
//   ]);

//   res.json({ restaurants, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
// };

// /** GET /api/admin/restaurants/:id */
// export const getRestaurant = async (req: Request, res: Response) => {
//   const restaurant = await findRestaurantOr404(req, res);
//   if (!restaurant) return;
//   res.json({ restaurant });
// };

// /** PATCH /api/admin/restaurants/:id   (send only the fields to change) */
// export const updateRestaurant = async (req: Request, res: Response) => {
//   const parsed = updateRestaurantSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

//   const restaurant = await findRestaurantOr404(req, res);
//   if (!restaurant) return;

//   const { address, services, location, ...rest } = parsed.data;

//   // Simple fields
//   restaurant.set(rest);

//   // Nested objects: only change the keys that were sent
//   if (address) {
//     for (const [key, value] of Object.entries(address)) restaurant.set(`address.${key}`, value);
//   }
//   if (services) {
//     for (const [key, value] of Object.entries(services)) restaurant.set(`services.${key}`, value);
//   }

//   // Location: object = set, null = remove
//   if (location === null) restaurant.set("location", undefined);
//   else if (location) restaurant.set("location", toGeoPoint(location));

//   await restaurant.save(); // runs model validation (e.g. at least one service)
//   res.json({ restaurant });
// };

// /** PATCH /api/admin/restaurants/:id/status   { isActive: true | false } */
// export const setRestaurantStatus = async (req: Request, res: Response) => {
//   const parsed = statusSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

//   const restaurant = await findRestaurantOr404(req, res);
//   if (!restaurant) return;

//   restaurant.isActive = parsed.data.isActive;
//   await restaurant.save();

//   res.json({
//     message: restaurant.isActive ? "Restaurant activated" : "Restaurant deactivated",
//     restaurant,
//   });
// };