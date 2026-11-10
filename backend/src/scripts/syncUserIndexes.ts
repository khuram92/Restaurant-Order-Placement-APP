import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { User } from "../models/User.js";

const run = async () => {
  await connectDB();

  try {
    await User.collection.dropIndex("restaurantId_1");
    console.log("🗑️  Dropped old index restaurantId_1");
  } catch {
    console.log("ℹ️  Old index restaurantId_1 not found (already removed)");
  }

  await User.syncIndexes(); // creates one_active_manager_per_restaurant
  const indexes = await User.collection.indexInformation();
  console.log("✅ User indexes:", Object.keys(indexes).join(", "));

  await mongoose.disconnect();
};

run();
