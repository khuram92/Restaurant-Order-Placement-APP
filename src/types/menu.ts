export interface ItemSize {
  _id?: string;
  name: string;
  price: number;
  serves?: number;
}

export interface AddOnOption {
  _id?: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface AddOnGroup {
  _id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: AddOnOption[];
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  image?: string;
  price?: number;
  serves?: number;
  sizes: ItemSize[];
  addOnGroups: AddOnGroup[];
  isVeg: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  cuisine?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface CategoryInput {
  name: string;
  description?: string;
  cuisine?: string;
  isActive?: boolean;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price?: number | null;
  serves?: number | null;
  sizes?: ItemSize[];
  addOnGroups?: AddOnGroup[];
  isVeg?: boolean;
  isSpicy?: boolean;
  isAvailable?: boolean;
}

export interface MenuResponse {
  cuisines: string[];
  categories: MenuCategoryWithItems[];
}
