import crypto from "node:crypto";

/** At least 8 characters with a letter, a number and a special character */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
export const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters and include a letter, a number and a special character";

// No look-alike characters (0/O, 1/l/I) so it's easy to type from an email
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SPECIAL = "@#$%&*!?";

const pick = (chars: string) => chars[crypto.randomInt(chars.length)]!;

/** Random 12-character password that always passes PASSWORD_REGEX */
export const generatePassword = (length = 12): string => {
  const all = LETTERS + DIGITS + SPECIAL;
  const chars = [pick(LETTERS), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(all));

  // Shuffle so the required characters aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
};
