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

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as NonNullable<SignOptions["expiresIn"]>,
  });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, getSecret()) as TokenPayload;


/** A login token for this user (carries their current tokenVersion) */
export const tokenFor = (user: { id: string; role: Role; tokenVersion?: number }) =>
  signToken({ id: user.id, role: user.role, v: user.tokenVersion ?? 0 });

/** Does the token still belong to the user's current session generation? */
export const tokenIsCurrent = (payload: TokenPayload, user: { tokenVersion?: number }) =>
  (payload.v ?? 0) === (user.tokenVersion ?? 0);