import { model, Schema, Types, type HydratedDocument } from "mongoose";

export interface IMenuCategory {
  restaurantId: Types.ObjectId;
  name: string; 
  description?: string;
  cuisine?: string;
  sortOrder: number; 
  isActive: boolean;
}

export type MenuCategoryDoc = HydratedDocument<IMenuCategory>;

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [40, "Category name is too long"],
    },
    description: { type: String, trim: true, maxlength: 200 },
        cuisine: { type: String, trim: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);


menuCategorySchema.index(
  { restaurantId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
menuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });
menuCategorySchema.index({ cuisine: 1 }); 
menuCategorySchema.set("toJSON", {
  transform: (_doc, ret) => {
    const { __v: _v, ...rest } = ret;
    return rest;
  },
});

export const MenuCategory = model<IMenuCategory>("MenuCategory", menuCategorySchema);