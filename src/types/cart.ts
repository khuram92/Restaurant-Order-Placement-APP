/** One chosen add-on (copied from the menu so the cart can show it without the menu) */
export interface CartAddOn {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

/** What the item sheet produces when the customer taps "Add to cart" */
export interface CartSelection {
  itemId: string;
  name: string;
  image?: string;
  sizeId?: string;
  sizeName?: string;
  basePrice: number; // size price or item price
  addOns: CartAddOn[];
  unitPrice: number; // basePrice + add-ons
  quantity: number;
  note?: string;
}