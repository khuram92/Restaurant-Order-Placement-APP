import type { Request, Response, NextFunction } from "express";
import multer from "multer";

const MAX_SIZE_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(), // keep in memory, we send it straight to Cloudinary
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/** Accepts one image in the "avatar" field, with friendly error messages */
export const avatarUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("avatar")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Image must be smaller than ${MAX_SIZE_MB} MB` });
    }
    if (err) {
      return res.status(400).json({ message: (err as Error).message || "Invalid upload" });
    }
    next();
  });
};