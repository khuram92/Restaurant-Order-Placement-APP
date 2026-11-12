import { randomInt } from "node:crypto";

// No 0/O or 1/I so it's easy to read out on the phone
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateOrderNumber = (length = 6) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");