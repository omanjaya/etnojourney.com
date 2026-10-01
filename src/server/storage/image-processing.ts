import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { getStorage } from "./index";
import {
  buildImageKey,
  exceedsPixelLimit,
  MAX_OUTPUT_WIDTH,
  MAX_PIXELS,
  OUTPUT_QUALITY,
  validateUpload,
  type ImageValidationError,
} from "./image-validation";

export class ImageRejectedError extends Error {
  constructor(public readonly reason: ImageValidationError | "corrupt") {
    super(reason);
    this.name = "ImageRejectedError";
  }
}

export type StoredImage = { key: string; url: string; width: number; height: number };

/**
 * Validates, normalizes and stores an uploaded image. Re-encoding through
 * sharp drops EXIF/GPS metadata and any non-image payload in the file.
 */
export async function storeTourImage(bytes: Uint8Array): Promise<StoredImage> {
  const check = validateUpload(bytes);
  if (check === "empty" || check === "tooLarge" || check === "unsupported") {
    throw new ImageRejectedError(check);
  }

  let output: { data: Buffer; info: OutputInfo };
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new ImageRejectedError("corrupt");
    if (exceedsPixelLimit(metadata.width, metadata.height)) {
      throw new ImageRejectedError("tooManyPixels");
    }
    output = await image
      .rotate() // apply EXIF orientation before metadata is discarded
      .resize({ width: MAX_OUTPUT_WIDTH, withoutEnlargement: true })
      .webp({ quality: OUTPUT_QUALITY })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof ImageRejectedError) throw error;
    const message = error instanceof Error ? error.message : "";
    throw new ImageRejectedError(/pixel limit/i.test(message) ? "tooManyPixels" : "corrupt");
  }

  const key = buildImageKey("tours", randomUUID());
  await getStorage().put(key, output.data, "image/webp");
  return { key, url: `/media/${key}`, width: output.info.width, height: output.info.height };
}
