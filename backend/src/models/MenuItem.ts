import { model, Schema, Types, type HydratedDocument } from "mongoose";

const MAX_PRICE = 1_000_000; // PKR


export interface IItemSize {
  _id?: Types.ObjectId;
  name: string;
  price: number;
  serves?: number; 
}


export interface IAddOnOption {
  _id?: Types.ObjectId;
  name: string;
  price: number; 
  isAvailable: boolean;
}


export interface IAddOnGroup {
  _id?: Types.ObjectId;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: IAddOnOption[];
}

export interface IMenuItem {
  restaurantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  image?: string; 

  price?: number;
  serves?: number;
  sizes: IItemSize[];

  addOnGroups: IAddOnGroup[];

  isBestseller: boolean;
  isChefSpecial: boolean;
  isNew: boolean;
  isSpicy: boolean;
  isAvailable: boolean; 
  sortOrder: number;
}

export type MenuItemDoc = HydratedDocument<IMenuItem>;

const priceMin: [number, string] = [0, "Price can't be negative"];
const priceMax: [number, string] = [MAX_PRICE, "Price is too high"];
const servesField = {
  type: Number,
  min: [1, "Serves must be at least 1 person"] as [number, string],
  max: [50, "Serves can be at most 50 persons"] as [number, string],
};

const sizeSchema = new Schema<IItemSize>({
  name: { type: String, required: [true, "Size name is required"], trim: true, maxlength: 30 },
  price: { type: Number, required: [true, "Size price is required"], min: priceMin, max: priceMax },
  serves: servesField,
});

const addOnOptionSchema = new Schema<IAddOnOption>({
  name: { type: String, required: [true, "Add-on name is required"], trim: true, maxlength: 40 },
  price: { type: Number, default: 0, min: priceMin, max: priceMax },
  isAvailable: { type: Boolean, default: true },
});

const addOnGroupSchema = new Schema<IAddOnGroup>({
  name: { type: String, required: [true, "Add-on group name is required"], trim: true, maxlength: 40 },
  minSelect: { type: Number, default: 0, min: 0 },
  maxSelect: { type: Number, default: 1, min: 1 },
  options: { type: [addOnOptionSchema], default: [] },
});

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "MenuCategory", required: [true, "Choose a category"] },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [60, "Item name is too long"],
    },
    description: { type: String, trim: true, maxlength: 300 },
    image: { type: String },

    price: { type: Number, min: priceMin, max: priceMax },
    serves: servesField,
    sizes: { type: [sizeSchema], default: [] },

    addOnGroups: { type: [addOnGroupSchema], default: [] },

    isBestseller: { type: Boolean, default: false },
    isChefSpecial: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

menuItemSchema.pre("validate", function () {
  
  if (this.sizes.length > 0) {
    this.set("price", undefined);
    this.set("serves", undefined);

    const names = this.sizes.map((s) => s.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) this.invalidate("sizes", "Each size needs a different name");
    if (this.sizes.length > 6) this.invalidate("sizes", "At most 6 sizes");
  } else if (this.price === undefined || this.price === null) {
    this.invalidate("price", "Enter a price, or add sizes");
  }

  
  if (this.addOnGroups.length > 10) this.invalidate("addOnGroups", "At most 10 add-on groups");
  this.addOnGroups.forEach((group, i) => {
    const path = `addOnGroups.${i}`;
    if (group.options.length === 0) {
      this.invalidate(path, `"${group.name}" needs at least one option`);
    } else if (group.options.length > 20) {
      this.invalidate(path, `"${group.name}" can have at most 20 options`);
    }
    if (group.minSelect > group.maxSelect) {
      this.invalidate(path, `"${group.name}": minimum can't be more than maximum`);
    }
    if (group.maxSelect > group.options.length) {
      this.invalidate(path, `"${group.name}": maximum can't be more than the number of options`);
    }
  });
});

menuItemSchema.index({ restaurantId: 1, categoryId: 1, sortOrder: 1 }); // menu screen
menuItemSchema.index({ categoryId: 1 }); 
menuItemSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { __v: _v, ...rest } = ret;
    return rest;
  },
});

export const MenuItem = model<IMenuItem>("MenuItem", menuItemSchema);