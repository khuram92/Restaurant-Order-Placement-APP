// import type { Request, Response } from "express";
// import { z } from "zod";
// import { User } from "../models/User.js";
// import { signToken } from "../utils/jwt.js";

// const loginSchema = z.object({
//   email: z.email({ error: "Enter a valid email" }).trim().toLowerCase(),
//   password: z.string({ error: "Password is required" }).min(1, "Password is required"),
// });

// /** POST /api/auth/login: Super Admin & Managers */
// export const staffLogin = async (req: Request, res: Response) => {
//   const parsed = loginSchema.safeParse(req.body);
//   if (!parsed.success) {
//     return res.status(400).json({ message: parsed.error.issues[0]?.message });
//   }

//   const { email, password } = parsed.data;
//   const user = await User.findOne({ email }).select("+password");

//   // Same message for wrong email or wrong password (don't reveal which)
//   if (!user || user.role === "customer" || !(await user.comparePassword(password))) {
//     return res.status(401).json({ message: "Invalid email or password" });
//   }
//   if (!user.isActive) {
//     return res.status(403).json({ message: "Account is deactivated" });
//   }

//   const token = signToken({ id: user.id, role: user.role });
//   res.json({ token, user });
// };

// /** GET /api/auth/me: any logged-in user */
// export const getMe = async (req: Request, res: Response) => {
//   res.json({ user: req.user });
// };