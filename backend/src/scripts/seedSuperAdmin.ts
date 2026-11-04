import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { User } from "../models/User.js";

const seedSuperAdmin = async () => {
  const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error("❌ Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env");
    process.exit(1);
  }

  await connectDB();

  const email = SUPERADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`ℹ️  Super Admin already exists: ${email}`);
  } else {
        const [firstName = "Super", ...rest] = (SUPERADMIN_NAME || "Super Admin").trim().split(" ");

    await User.create({
      firstName,
      lastName: rest.join(" ") || "Admin",
      email,
      password: SUPERADMIN_PASSWORD, // hashed automatically by the model
      role: "superadmin",
      profileCompleted: true,       // staff don't use the customer profile screen
    });
  }

  await mongoose.disconnect();
};

seedSuperAdmin();