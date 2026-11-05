/**
 * Pure checks the browser runs on a photo before and after upload. The server
 * still validates and re-encodes every file; these only spare the operator a
 * rejected upload or a blurry hero.
 */
import {
  MAX_OUTPUT_WIDTH,
  MAX_PIXELS,
  MAX_UPLOAD_BYTES,
} from "@/server/storage/image-validation";

export type ImageSize = { width: number; height: number };

/**
 * A file the server would refuse (over 8 MB or over 40 megapixels) is shrunk
 * in the browser first. Anything else goes up untouched, so normal photos are
 * only compressed once, by the server.
 */
export function needsDownscale(bytes: number, size: ImageSize | null): boolean {
  if (bytes > MAX_UPLOAD_BYTES) return true;
  return size !== null && size.width * size.height > MAX_PIXELS;
}

/**
 * Target size for a downscaled photo: no wider than the server keeps anyway
 * (2400 px) and comfortably under the pixel limit, keeping the aspect ratio.
 * Never enlarges.
 */
export function downscaleSize(
  { width, height }: ImageSize,
  maxWidth = MAX_OUTPUT_WIDTH,
  maxPixels = MAX_PIXELS / 2,
): ImageSize {
  const scale = Math.min(1, maxWidth / width, Math.sqrt(maxPixels / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/** Narrower than this, a full-width hero or cover looks soft on a laptop. */
export const MIN_HERO_WIDTH = 1600;

export type HeroPhotoNotice = "notLandscape" | "small";

/**
 * Non-blocking advice for a hero or cover photo (shown full width, cropped
 * to a wide frame): an upright or square photo loses its top and bottom,
 * and a small one looks blurry.
 */
export function heroPhotoNotice({ width, height }: ImageSize): HeroPhotoNotice | null {
  if (height >= width) return "notLandscape";
  if (width < MIN_HERO_WIDTH) return "small";
  return null;
}
