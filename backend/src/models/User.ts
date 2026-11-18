import bcrypt from "bcryptjs";
import {
  model,
  Schema,
  Types,
  type HydratedDocument,
  type Model,
} from "mongoose";

export const ROLES = ["superadmin", "manager", "customer"] as const;
export type Role = (typeof ROLES)[number];

export interface ISavedAddress {
  _id?: Types.ObjectId;
  label: "home" | "work" | "other";
  name?: string;
  street: string;
  area?: string;
  city: string;
  phone: string;
  instructions?: string;
  location?: { lat: number; lng: number };
}

export const MAX_SAVED_ADDRESSES = 5;

export interface IUser {
  firstName?: string;
  lastName?: string;
  dob?: Date;
  avatar?: string;
  email?: string;
  phone?: string;
  password?: string;
  role: Role;
  restaurantId?: Types.ObjectId;
  pushTokens: string[];
  favoriteRestaurants: Types.ObjectId[];
  addresses: ISavedAddress[];
  isActive: boolean;
  mustChangePassword: boolean;
  profileCompleted: boolean;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDoc = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<
  IUser,
  Model<IUser, {}, IUserMethods>,
  IUserMethods
>(
  {
    firstName: { type: String, trim: true, maxlength: 40 },
    lastName: { type: String, trim: true, maxlength: 40 },
    dob: { type: Date },
    avatar: { type: String },
    email: { type: String, trim: true, lowercase: true },
    phone: {
      type: String,
      trim: true,
      match: [/^03\d{9}$/, "Phone must be 03XXXXXXXXX"],
    },
    pushTokens: { type: [String], default: [], select: false },
    favoriteRestaurants: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
      select: false,
    },
    password: { type: String, select: false, minlength: 8 },
    addresses: {
      type: [
        new Schema<ISavedAddress>({
          label: { type: String, enum: ["home", "work", "other"], required: true },
          name: { type: String, trim: true, maxlength: 30 },
          street: { type: String, trim: true, required: true, maxlength: 150 },
          area: { type: String, trim: true, maxlength: 80 },
          city: { type: String, trim: true, required: true, maxlength: 60 },
          phone: { type: String, trim: true, required: true, match: /^03\d{9}$/ },
          instructions: { type: String, trim: true, maxlength: 200 },
          location: {
            type: new Schema({ lat: Number, lng: Number }, { _id: false }),
            default: undefined,
          },
        }),
      ],
      default: [],
      select: false,
    },
    role: { type: String, enum: ROLES, default: "customer" },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Unique only when the field exists (a customer may have only email OR only phone)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);

userSchema.index(
  { restaurantId: 1 },
  {
    name: "one_active_manager_per_restaurant",
    unique: true,
    partialFilterExpression: {
      role: "manager",
      isActive: true,
      restaurantId: { $type: "objectId" },
    },
  },
);

userSchema.pre("validate", function () {
  if (!this.email && !this.phone)
    this.invalidate("email", "Email or phone is required");
  if (this.role !== "customer" && this.isNew && !this.password) {
    this.invalidate("password", "Password is required for staff accounts");
  }
  if (this.role === "manager" && !this.restaurantId) {
    this.invalidate("restaurantId", "Manager must be assigned to a restaurant");
  }
});

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return this.password
    ? bcrypt.compare(candidate, this.password)
    : Promise.resolve(false);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { password: _p, __v: _v, ...safe } = ret;
    return safe;
  },
});

export const User = model<IUser, Model<IUser, {}, IUserMethods>>(
  "User",
  userSchema,
);
