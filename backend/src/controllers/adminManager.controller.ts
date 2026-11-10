import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Restaurant } from "../models/Restaurant.js";
import { User, type UserDoc } from "../models/User.js";
import { deleteAvatarImage } from "../utils/cloudinary.js";
import { generatePassword } from "../utils/password.js";
import { sendManagerCredentials } from "../utils/staffEmails.js";
import {
  createManagerSchema,
  managerListQuerySchema,
  managerStatusSchema,
  updateManagerSchema,
} from "../validators/manager.validators.js";

// ---------- Helpers ----------

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";
const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Restaurant fields shown next to a manager */
const RESTAURANT_FIELDS = "name logo address.city isActive";

/** Loads a manager by :id (with their restaurant), or sends 400/404 and returns null */
const findManagerOr404 = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid manager id" });
    return null;
  }
  const manager = await User.findOne({ _id: id, role: "manager" });
  if (!manager) {
    res.status(404).json({ message: "Manager not found" });
    return null;
  }
  return manager;
};

const restaurantHasOtherManager = (
  restaurantId: string,
  exceptManagerId?: string,
) =>
  User.exists({
    role: "manager",
    isActive: true,
    restaurantId,
    ...(exceptManagerId && { _id: { $ne: exceptManagerId } }),
  });

/** Emails the password; returns true if sent. If sending fails the admin gets the password once instead. */
const deliverPassword = async (
  manager: UserDoc,
  password: string,
  kind: "welcome" | "reset",
) => {
  const restaurant = await Restaurant.findById(manager.restaurantId).select(
    "name",
  );
  try {
    await sendManagerCredentials({
      to: manager.email!,
      firstName: manager.firstName ?? "there",
      password,
      restaurantName: restaurant?.name ?? "your restaurant",
      kind,
    });
    return true;
  } catch (error) {
    console.error("❌ Manager email failed:", (error as Error).message);
    return false;
  }
};

const withRestaurant = (manager: UserDoc) =>
  manager.populate("restaurantId", RESTAURANT_FIELDS);

// ---------- Controllers ----------

/** GET /api/admin/managers?search=&status=&page=&limit= */
export const listManagers = async (req: Request, res: Response) => {
  const parsed = managerListQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const { search, status, page, limit } = parsed.data;
  const filter: Record<string, unknown> = { role: "manager" };
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (search) {
    const term = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { firstName: term },
      { lastName: term },
      { email: term },
      { phone: term },
    ];
  }

  const [managers, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("restaurantId", RESTAURANT_FIELDS),
    User.countDocuments(filter),
  ]);

  res.json({
    managers,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
};

/**
 * GET /api/admin/managers/restaurant-options
 * Every restaurant + who manages it, so the app can show only free ones.
 */
export const restaurantOptions = async (_req: Request, res: Response) => {
  const [restaurants, managers] = await Promise.all([
    Restaurant.find().select(RESTAURANT_FIELDS).sort({ name: 1 }),
     User.find({ role: "manager", isActive: true, restaurantId: { $exists: true } }).select(
      "firstName lastName restaurantId",
    ),
  ]);

  const managerByRestaurant = new Map(
    managers.map((m) => [String(m.restaurantId), m]),
  );

  res.json({
    restaurants: restaurants.map((r) => {
      const m = managerByRestaurant.get(r.id);
      return {
        ...r.toJSON(),
        manager: m
          ? {
              _id: m.id,
              name: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim(),
            }
          : null,
      };
    }),
  });
};

/** GET /api/admin/managers/:id */
export const getManager = async (req: Request, res: Response) => {
  const manager = await findManagerOr404(req, res);
  if (!manager) return;
  res.json({ manager: await withRestaurant(manager) });
};

/** POST /api/admin/managers   { firstName, lastName, email, phone?, restaurantId } */
export const createManager = async (req: Request, res: Response) => {
  const parsed = createManagerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });
  const { firstName, lastName, email, phone, restaurantId } = parsed.data;

  const restaurant = await Restaurant.findById(restaurantId).select("_id");
  if (!restaurant)
    return res.status(404).json({ message: "Restaurant not found" });

  if (await restaurantHasOtherManager(restaurantId)) {
    return res
      .status(409)
      .json({ message: "This restaurant already has a manager" });
  }
  if (await User.exists({ email })) {
    return res
      .status(409)
      .json({ message: "This email is already registered" });
  }
  if (phone && (await User.exists({ phone }))) {
    return res
      .status(409)
      .json({ message: "This phone number is already registered" });
  }

  const password = generatePassword();
  const manager = new User({
    role: "manager",
    firstName,
    lastName,
    email,
    restaurantId,
    password, // hashed by the model
    mustChangePassword: true,
    profileCompleted: true, // staff don't use the customer profile screen
  });
  if (phone) manager.phone = phone;
  await manager.save();

  const emailSent = await deliverPassword(manager, password, "welcome");

  res.status(201).json({
    manager: await withRestaurant(manager),
    emailSent,
    // Only if the email failed, so the admin can pass it on once
    ...(!emailSent && { temporaryPassword: password }),
  });
};

/** PATCH /api/admin/managers/:id   (send only what changes; phone "" removes it) */
export const updateManager = async (req: Request, res: Response) => {
  const parsed = updateManagerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const manager = await findManagerOr404(req, res);
  if (!manager) return;
  const { firstName, lastName, email, phone, restaurantId } = parsed.data;

  if (email !== undefined && email !== manager.email) {
    if (await User.exists({ email, _id: { $ne: manager._id } })) {
      return res
        .status(409)
        .json({ message: "This email is already registered" });
    }
    manager.email = email;
  }

  if (phone !== undefined) {
    if (phone === "") {
      manager.set("phone", undefined);
    } else if (phone !== manager.phone) {
      if (await User.exists({ phone, _id: { $ne: manager._id } })) {
        return res
          .status(409)
          .json({ message: "This phone number is already registered" });
      }
      manager.phone = phone;
    }
  }

  if (
    restaurantId !== undefined &&
    restaurantId !== String(manager.restaurantId)
  ) {
    if (!(await Restaurant.exists({ _id: restaurantId }))) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (await restaurantHasOtherManager(restaurantId, manager.id)) {
      return res
        .status(409)
        .json({ message: "That restaurant already has a manager" });
    }
    manager.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  }

  if (firstName !== undefined) manager.firstName = firstName;
  if (lastName !== undefined) manager.lastName = lastName;

  await manager.save();
  res.json({ manager: await withRestaurant(manager) });
};

export const setManagerStatus = async (req: Request, res: Response) => {
  const parsed = managerStatusSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  const manager = await findManagerOr404(req, res);
  if (!manager) return;

  const activating = parsed.data.isActive && !manager.isActive;
  if (activating) {
    const holder = await User.findOne({
      role: "manager",
      isActive: true,
      restaurantId: manager.restaurantId,
      _id: { $ne: manager._id },
    }).select("firstName lastName");

    if (holder) {
      const name = `${holder.firstName ?? ""} ${holder.lastName ?? ""}`.trim() || "Another manager";
      return res.status(409).json({
        message: `${name} now manages this restaurant. Edit this manager and choose a free restaurant, then activate them.`,
      });
    }
  }

  manager.isActive = parsed.data.isActive;
  await manager.save();

  res.json({
    message: manager.isActive
      ? "Manager activated"
      : "Manager deactivated. Their restaurant is now free for another manager",
    manager: await withRestaurant(manager),
  });
};

/** POST /api/admin/managers/:id/reset-password — new generated password, emailed */
export const resetManagerPassword = async (req: Request, res: Response) => {
  const manager = await findManagerOr404(req, res);
  if (!manager) return;

  const password = generatePassword();
  manager.password = password; // hashed by the model
  manager.mustChangePassword = true;
  await manager.save();

  const emailSent = await deliverPassword(manager, password, "reset");

  res.json({
    message: emailSent
      ? "New password emailed to the manager"
      : "Password reset, but the email couldn't be sent",
    emailSent,
    ...(!emailSent && { temporaryPassword: password }),
  });
};

/** DELETE /api/admin/managers/:id — permanent; frees their restaurant */
export const deleteManager = async (req: Request, res: Response) => {
  const manager = await findManagerOr404(req, res);
  if (!manager) return;

  const name =
    `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || "Manager";
  const hadAvatar = !!manager.avatar;
  await manager.deleteOne();

  if (hadAvatar) {
    try {
      await deleteAvatarImage(manager.id);
    } catch (error) {
      console.error(
        "⚠️ Couldn't delete manager avatar:",
        (error as Error).message,
      );
    }
  }

  res.json({ message: `${name} was deleted` });
};
