import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { MenuItem } from "../models/MenuItem.js";

/** One-time: menu items' "isNew" field → "isNewDish" (isNew is reserved by Mongoose) */
const run = async () => {
  await connectDB();
  const result = await MenuItem.collection.updateMany(
    { isNew: { $exists: true } },
    { $rename: { isNew: "isNewDish" } },
  );
  console.log(`✅ Renamed isNew → isNewDish on ${result.modifiedCount} menu item(s)`);
  await mongoose.disconnect();
};

run();