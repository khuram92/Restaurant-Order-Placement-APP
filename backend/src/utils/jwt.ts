import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "../models/User.js";

export interface TokenPayload {
  id: string;
  role: Role;
  v?: number;
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing in .env");
  return secret;
};
if ((process.env.JWT_SECRET ?? "").length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 random characters. Generate one with:");
  console.error(`   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  process.exit(1);
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as NonNullable<SignOptions["expiresIn"]>,
  });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as TokenPayload;


/** A login token for this user (carries their current tokenVersion) */
export const tokenFor = (user: { id: string; role: Role; tokenVersion?: number }) =>
  signToken({ id: user.id, role: user.role, v: user.tokenVersion ?? 0 });

/** Does the token still belong to the user's current session generation? */
export const tokenIsCurrent = (payload: TokenPayload, user: { tokenVersion?: number }) =>
  (payload.v ?? 0) === (user.tokenVersion ?? 0);