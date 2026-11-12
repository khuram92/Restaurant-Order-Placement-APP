import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine, CartRestaurant, CartSelection } from "../types/cart";
import { useAuth } from "./AuthContext";

type AddResult = "added" | "other-restaurant";

type CartContextValue = {
  restaurant: CartRestaurant | null;
  lines: CartLine[];
  itemCount: number; // total quantity
  subtotal: number; // before tax / delivery
  /** Adds to the cart. Returns "other-restaurant" (and adds nothing) if the cart has another restaurant's food */
  add: (restaurant: CartRestaurant, selection: CartSelection) => AddResult;
  /** Empties the cart and starts a new one with this item */
  replaceWith: (restaurant: CartRestaurant, selection: CartSelection) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const MAX_QTY = 20;

/** Same item + size + add-ons + note → same line (quantities are merged) */
const lineKey = (s: CartSelection) =>
  [s.itemId, s.sizeId ?? "", s.addOns.map((a) => a.optionId).sort().join(","), s.note ?? ""].join("|");

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<CartRestaurant | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);

  // A different (or no) user = a fresh cart
  useEffect(() => {
    setRestaurant(null);
    setLines([]);
  }, [user?._id]);

  const clear = useCallback(() => {
    setRestaurant(null);
    setLines([]);
  }, []);

  const pushLine = (prev: CartLine[], selection: CartSelection) => {
    const key = lineKey(selection);
    const existing = prev.find((l) => l.key === key);
    if (existing) {
      return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + selection.quantity) } : l));
    }
    return [...prev, { ...selection, key }];
  };

  const add = useCallback(
    (r: CartRestaurant, selection: CartSelection): AddResult => {
      if (restaurant && restaurant._id !== r._id && lines.length > 0) return "other-restaurant";
      setRestaurant(r);
      setLines((prev) => pushLine(prev, selection));
      return "added";
    },
    [restaurant, lines.length],
  );

  const replaceWith = useCallback((r: CartRestaurant, selection: CartSelection) => {
    setRestaurant(r);
    setLines(pushLine([], selection));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => {
      const next = quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l));
      if (next.length === 0) setRestaurant(null);
      return next;
    });
  }, []);

  const remove = useCallback((key: string) => setQuantity(key, 0), [setQuantity]);

  const value = useMemo<CartContextValue>(
    () => ({
      restaurant,
      lines,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
      add,
      replaceWith,
      setQuantity,
      remove,
      clear,
    }),
    [restaurant, lines, add, replaceWith, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** const { lines, add, itemCount } = useCart(); */
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};