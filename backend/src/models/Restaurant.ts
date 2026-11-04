import { Schema, model, Types, type HydratedDocument } from "mongoose";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour

export interface IOpeningHour {
  day: Day;
  open: string;   // "11:00"
  close: string;  // "23:00" (if earlier than open, it means after midnight, e.g. 18:00 → 02:00)
  closed: boolean;
}

export interface IRestaurant {
  name: string;
  description?: string;
  cuisines: string[];
  phone?: string;
  email?: string;

  address: {
    street: string;
    area?: string;
    city: string;
  };
  // GeoJSON: [longitude, latitude] (MongoDB's order)
  location?: {
    type: "Point";
    coordinates: [number, number];
  };

  openingHours: IOpeningHour[];

  logo?: string;        // Cloudinary URLs
  coverImage?: string;

  services: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
  };
  deliveryFee: number;       // PKR
  minOrder: number;          // PKR
  deliveryRadiusKm: number;
  taxRate: number;           // percent, e.g. 16
  tableHoldMinutes: number;  // how long a dine-in order holds a table

  isActive: boolean;
  createdBy?: Types.ObjectId;
}

export type RestaurantDoc = HydratedDocument<IRestaurant>;

// Default: open every day 11:00 – 23:00
const defaultHours = (): IOpeningHour[] =>
  DAYS.map((day) => ({ day, open: "11:00", close: "23:00", closed: false }));

const openingHourSchema = new Schema<IOpeningHour>(
  {
    day: { type: String, enum: DAYS, required: true },
    open: { type: String, match: [TIME_REGEX, "Time must be HH:mm"], default: "11:00" },
    close: { type: String, match: [TIME_REGEX, "Time must be HH:mm"], default: "23:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: [true, "Restaurant name is required"], trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    cuisines: { type: [String], default: [] },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    address: {
      street: { type: String, required: [true, "Street address is required"], trim: true },
      area: { type: String, trim: true },
      city: { type: String, required: [true, "City is required"], trim: true },
    },
    location: {
      type: { type: String, enum: ["Point"] },
      // default: undefined → no empty array is saved when coordinates aren't set
      coordinates: { type: [Number], default: undefined },
    },

    openingHours: {
      type: [openingHourSchema],
      default: defaultHours,
      validate: {
        validator: (hours: IOpeningHour[]) =>
          hours.length === 7 && DAYS.every((d) => hours.some((h) => h.day === d)),
        message: "Opening hours must include all 7 days",
      },
    },

    logo: { type: String },
    coverImage: { type: String },

    services: {
      dineIn: { type: Boolean, default: true },
      takeaway: { type: Boolean, default: true },
      delivery: { type: Boolean, default: false },
    },
    deliveryFee: { type: Number, default: 0, min: [0, "Delivery fee can't be negative"] },
    minOrder: { type: Number, default: 0, min: [0, "Minimum order can't be negative"] },
    deliveryRadiusKm: { type: Number, default: 5, min: [0, "Radius can't be negative"], max: [50, "Radius is too large"] },
    taxRate: { type: Number, default: 0, min: [0, "Tax can't be negative"], max: [100, "Tax can't be over 100%"] },
    tableHoldMinutes: { type: Number, default: 30, min: [5, "At least 5 minutes"], max: [240, "At most 240 minutes"] },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// At least one service must be offered
restaurantSchema.pre("validate", function () {
  const { dineIn, takeaway, delivery } = this.services;
  if (!dineIn && !takeaway && !delivery) {
    this.invalidate("services", "Enable at least one service (Dine-in, Takeaway or Delivery)");
  }
  // Coordinates must be [lng, lat] when location is set
  const coords = this.location?.coordinates;
  if (coords !== undefined) {
    const [lng, lat] = coords;
    const valid = coords.length === 2 && lng! >= -180 && lng! <= 180 && lat! >= -90 && lat! <= 90;
    if (!valid) this.invalidate("location", "Invalid coordinates");
    else if (this.location) this.location.type = "Point";
  }
});

// Indexes
restaurantSchema.index({ location: "2dsphere" }, { sparse: true }); // "near me" searches
restaurantSchema.index({ isActive: 1, "address.city": 1 });          // customer listing
restaurantSchema.index({ name: 1 });                                  // admin search

restaurantSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { __v: _v, ...rest } = ret;
    return rest;
  },
});

export const Restaurant = model<IRestaurant>("Restaurant", restaurantSchema);