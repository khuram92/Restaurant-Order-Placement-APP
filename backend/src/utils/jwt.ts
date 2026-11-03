import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "../models/User.js";

export interface TokenPayload {
  id: string;
  role: Role;
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