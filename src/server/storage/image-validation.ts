/** Limits for uploaded images. Pure module: safe to import in tests. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MAX_OUTPUT_WIDTH = 2400;
export const OUTPUT_QUALITY = 82;

export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

export type ImageValidationError = "empty" | "tooLarge" | "unsupported" | "tooManyPixels";

/**
 * Detects the real format from the file's magic bytes. Extensions and
 * client-provided MIME types are ignored because both are attacker-controlled.
 */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  const at = (offset: number, signature: number[]) =>
    signature.every((byte, i) => bytes[offset + i] === byte);
  const ascii = (offset: number, text: string) =>
    at(
      offset,
      [...text].map((c) => c.charCodeAt(0)),
    );

  if (bytes.length >= 3 && at(0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bytes.length >= 8 && at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (bytes.length >= 12 && ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) {
    return "avif";
  }
  return null;
}

/** Checks the raw upload before any decoding happens. */
export function validateUpload(bytes: Uint8Array): ImageValidationError | ImageFormat {
  if (bytes.byteLength === 0) return "empty";
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return "tooLarge";
  return sniffImageFormat(bytes) ?? "unsupported";
}

export function exceedsPixelLimit(width: number, height: number): boolean {
  return width * height > MAX_PIXELS;
}

/** Top-level storage folders; each maps to a public `/media/<folder>/` prefix. */
export type ImageFolder = "tours" | "reviews";

/** `<folder>/<yyyy>/<mm>/<uuid>.webp`, built only from server-side values. */
export function buildImageKey(folder: ImageFolder, id: string, now: Date = new Date()): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/${yyyy}/${mm}/${id}.webp`;
}
