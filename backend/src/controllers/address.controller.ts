import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MAX_SAVED_ADDRESSES, User, type ISavedAddress } from "../models/User.js";
import { addressSchema, type AddressInput } from "../validators/address.validators.js";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid address";


const ORDER = { home: 0, work: 1, other: 2 } as const;
const sorted = (list: ISavedAddress[]) => [...list].sort((a, b) => ORDER[a.label] - ORDER[b.label]);


const clean = (a: AddressInput): ISavedAddress => ({
  label: a.label,
  street: a.street,
  city: a.city,
  phone: a.phone,
  ...(a.label === "other" && a.name && { name: a.name }),
  ...(a.area && { area: a.area }),
  ...(a.instructions && { instructions: a.instructions }),
  ...(a.location && { location: a.location }),
});

const loadMe = (req: Request) => User.findById(req.user!._id).select("+addresses");

/** GET /api/auth/addresses */
export const listAddresses = async (req: Request, res: Response) => {
  const me = await loadMe(req);
  res.json({ addresses: sorted(me?.addresses ?? []) });
};

/**
 * POST /api/auth/addresses
 */
export const saveAddress = async (req: Request, res: Response) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
  const data = clean(parsed.data);

  const me = await loadMe(req);
  if (!me) return res.status(404).json({ message: "Account not found" });

  const existing = data.label !== "other" ? me.addresses.find((a) => a.label === data.label) : undefined;
  if (existing) {
    // Replace the old Home / Work (keeps its id)
    me.addresses = me.addresses.map((a) => (a === existing ? { ...data, ...(existing._id && { _id: existing._id }) } : a));
  } else {
    if (me.addresses.length >= MAX_SAVED_ADDRESSES) {
      return res.status(409).json({ message: `You can save up to ${MAX_SAVED_ADDRESSES} addresses. Delete one first.` });
    }
    me.addresses = [...me.addresses, data];
  }
  await me.save();

  res.status(existing ? 200 : 201).json({
    message: existing ? "Address updated" : "Address saved",
    addresses: sorted(me.addresses),
  });
};

// /** PATCH /api/auth/addresses/:addressId — edit one address */
// export const updateAddress = async (req: Request, res: Response) => {
//   const id = String(req.params.addressId);
//   if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid address" });
//   const parsed = addressSchema.safeParse(req.body);
//   if (!parsed.success) return res.status(400).json({ message: firstIssue(parsed.error) });
//   const data = clean(parsed.data);

//   const me = await loadMe(req);
//   const address = me?.addresses.find((a) => String(a._id) === id);
//   if (!me || !address) return res.status(404).json({ message: "Address not found" });

//   me.addresses = me.addresses
//     // Changing this one to Home / Work: the old Home / Work goes away
//     .filter((a) => String(a._id) === id || data.label === "other" || a.label !== data.label)
//     .map((a) => (String(a._id) === id ? { ...data, ...(address._id && { _id: address._id }) } : a));
//   await me.save();

//   res.json({ message: "Address updated", addresses: sorted(me.addresses) });
// };

// /** DELETE /api/auth/addresses/:addressId */
// export const deleteAddress = async (req: Request, res: Response) => {
//   const id = String(req.params.addressId);
//   if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid address" });

//   const updated = await User.findByIdAndUpdate(
//     req.user!._id,
//     { $pull: { addresses: { _id: id } } },
//     { new: true },
//   ).select("+addresses");

//   res.json({ message: "Address deleted", addresses: sorted(updated?.addresses ?? []) });
// };