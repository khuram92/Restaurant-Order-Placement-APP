import type { Request, Response } from "express";
import { Restaurant, type RestaurantDoc } from "../models/Restaurant.js";
import { uploadRestaurantImage } from "../utils/cloudinary.js";
import { isOpenNow } from "../utils/openingHours.js";
import { temporaryCloseSchema } from "../validators/managerRestaurant.validators.js";
import { updateRestaurantSchema } from "../validators/restaurant.validators.js";



const firstIssue = (error: { issues: { message: string }[] }) => error.issues[0]?.message ?? "Invalid input";


const toGeoPoint = (loc: { lat: number; lng: number }) => ({
  type: "Point" as const,
  coordinates: [loc.lng, loc.lat] as [number, number],
});

/** Copies validated fields onto the doc ("" removes the field) */
const applyFields = (doc: { set: (path: string, value: unknown) => unknown }, fields: object, prefix = "") => {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    doc.set(`${prefix}${key}`, value === "" ? undefined : value);
  }
};


const toManagerJSON = (restaurant: RestaurantDoc) => ({
  ...restaurant.toJSON(),
  isOpenNow: !restaurant.isTemporarilyClosed && isOpenNow(restaurant.openingHours),
});


const findMyRestaurant = async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findById(req.user?.restaurantId).select("-createdBy");
  if (!restaurant) res.status(404).json({ message: "Your restaurant wasn't found. Contact the admin." });
  return restaurant;
};

export const getMyRestaurant = async (req: Request, res: Response) => {
  const restaurant = await findMyRestaurant(req, res);
  if (!restaurant) return;
  res.json({ restaurant: toManagerJSON(restaurant) });
};


export const updateMyRestaurant = async (req: Request, res: Response) => {
  const parsed = updateRestaurantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

  const restaurant = await findMyRestaurant(req, res);
  if (!restaurant) return;

  const { address, services, location, ...rest } = parsed.data;
  applyFields(restaurant, rest);
  if (address) applyFields(restaurant, address, "address.");
  if (services) applyFields(restaurant, services, "services.");
  if (location === null) restaurant.set("location", undefined);
  else if (location) restaurant.set("location", toGeoPoint(location));

  await restaurant.save(); // model validation (at least one service, seats for dine-in, ...)
  res.json({ restaurant: toManagerJSON(restaurant) });
};

export const uploadMyRestaurantImages = async (req: Request, res: Response) => {
  const files = req.files as { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] } | undefined;
  const logo = files?.logo?.[0];
  const cover = files?.cover?.[0];
  if (!logo && !cover) return res.status(400).json({ message: "Choose a logo or cover image" });

  const restaurant = await findMyRestaurant(req, res);
  if (!restaurant) return;

  try {
    const [logoResult, coverResult] = await Promise.all([
      logo ? uploadRestaurantImage(logo.buffer, restaurant.id, "logo") : null,
      cover ? uploadRestaurantImage(cover.buffer, restaurant.id, "cover") : null,
    ]);
    if (logoResult) restaurant.logo = `${logoResult.secure_url}?v=${logoResult.version}`;
    if (coverResult) restaurant.coverImage = `${coverResult.secure_url}?v=${coverResult.version}`;
    await restaurant.save();
    res.json({ restaurant: toManagerJSON(restaurant) });
  } catch (error) {
    console.error("❌ Restaurant image upload failed:", (error as Error).message);
    res.status(502).json({ message: "Couldn't upload the image. Please try again." });
  }
};

export const setTemporarilyClosed = async (req: Request, res: Response) => {
  const parsed = temporaryCloseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });

  const restaurant = await findMyRestaurant(req, res);
  if (!restaurant) return;

  restaurant.isTemporarilyClosed = parsed.data.isTemporarilyClosed;
  await restaurant.save();

  res.json({
    message: restaurant.isTemporarilyClosed
      ? "Closed for now. Customers can't order until you open again."
      : "Open again (following your opening hours)",
    restaurant: toManagerJSON(restaurant),
  });
};