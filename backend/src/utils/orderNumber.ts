import { randomInt } from "node:crypto";

// No 0/O or 1/I so it's easy to read out on the phone
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** First 3 letters of the restaurant name: "Kababjees" → "KAB", "Al-Baik" → "ALB", "7Up Café" → "UPC" */
const restaurantPrefix = (name: string) => {
  const letters = name
    .normalize("NFD") // "é" → "e" + accent
    .replace(/[^A-Za-z]/g, "") // letters only
    .toUpperCase();
  return letters.slice(0, 3).padEnd(3, "X"); // "Bo" → "BOX"
};

/** e.g. "KAB-7Q2XM4" */
export const generateOrderNumber = (restaurantName: string, length = 6) => {
  const random = Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${restaurantPrefix(restaurantName)}-${random}`;
};