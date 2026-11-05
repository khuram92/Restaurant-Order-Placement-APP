import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

let configured = false;

// Configured on first use, so .env is already loaded
const getCloudinary = () => {
  if (configured) return cloudinary;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary settings are missing in .env");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return cloudinary;
};

/**
 * Uploads a user's avatar. Using the user id as public_id means a new upload
 * replaces the old image instead of creating a new one.
 */
export const uploadAvatarImage = (buffer: Buffer, userId: string): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder: "food-app/avatars",
        public_id: userId,
        overwrite: true,
        invalidate: true, // clear the cached old image
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};



export type RestaurantImageKind = "logo" | "cover";

/**
 * Uploads a restaurant's logo (400×400) or cover (1200×600).
 * public_id = "<restaurantId>-logo" / "<restaurantId>-cover", so a new upload replaces the old one.
 */
export const uploadRestaurantImage = (
  buffer: Buffer,
  restaurantId: string,
  kind: RestaurantImageKind
): Promise<UploadApiResponse> => {
  const size = kind === "logo" ? { width: 400, height: 400 } : { width: 1200, height: 600 };

  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder: "food-app/restaurants",
        public_id: `${restaurantId}-${kind}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        transformation: [
          { ...size, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/** Deletes a restaurant's logo and cover from Cloudinary (missing images are ignored) */
export const deleteRestaurantImages = async (restaurantId: string): Promise<void> => {
  const cloud = getCloudinary();
  await Promise.allSettled(
    (["logo", "cover"] as const).map((kind) =>
      cloud.uploader.destroy(`food-app/restaurants/${restaurantId}-${kind}`, { invalidate: true })
    )
  );
};