export type AddressLabel = "home" | "work" | "other";


export interface SavedAddress {
  _id: string;
  label: AddressLabel;
  name?: string; // for "other"
  street: string;
  area?: string;
  city: string;
  phone: string;
  instructions?: string;
  location?: { lat: number; lng: number };
}

export type AddressInput = Omit<SavedAddress, "_id">;