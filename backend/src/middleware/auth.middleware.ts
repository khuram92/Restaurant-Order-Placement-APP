import type { NextFunction, Request, Response } from "express";
import { User, type Role } from "../models/User.js";
import {
  tokenIsCurrent,
  verifyToken,
  type TokenPayload,
} from "../utils/jwt.js";

/** Checks the token and attaches the logged-in user to req.user */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not logged in" });
  }

  
  let payload: TokenPayload;
  try {
    payload = verifyToken(header.split(" ")[1] as string);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(payload.id);

  if (!user) return res.status(401).json({ message: "User no longer exists" });
  if (!tokenIsCurrent(payload, user)) {
    return res
      .status(401)
      .json({ message: "Your session has ended. Please log in again." });
  }
  if (!user.isActive)
    return res.status(403).json({ message: "Account is deactivated" });

  req.user = user;
  next();
};

/** Allows only the given roles. Use after protect. */
export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You don't have permission to do this" });
    }
    next();
  };
};
