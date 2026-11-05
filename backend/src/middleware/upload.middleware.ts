import type { Request, Response, NextFunction, RequestHandler } from "express";
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

/** Wraps a multer handler so upload errors become friendly 400 messages */
const withFriendlyErrors =
  (handler: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `Image must be smaller than ${MAX_SIZE_MB} MB` });
      }
      if (err instanceof multer.MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ message: `Unexpected file field "${err.field}"` });
      }
      if (err) {
        return res.status(400).json({ message: (err as Error).message || "Invalid upload" });
      }
      next();
    });
  };

/** One image in the "avatar" field */
export const avatarUpload = withFriendlyErrors(upload.single("avatar"));

/** Restaurant images: optional "logo" and/or "cover" (one each) */
export const restaurantImagesUpload = withFriendlyErrors(
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ])
);