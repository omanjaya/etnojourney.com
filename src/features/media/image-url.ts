/** Image sources accepted for tour content: Unsplash CDN or our own uploads. */
const UPLOAD_PATH = /^\/media\/tours\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.webp$/;

export function isUnsplashUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

export function isUploadedImagePath(value: string): boolean {
  return UPLOAD_PATH.test(value);
}

export function isAllowedImageSource(value: string): boolean {
  return isUploadedImagePath(value) || isUnsplashUrl(value);
}

/** Small preview URL: resizes Unsplash images, leaves uploads to next/image. */
export function previewSrc(value: string, width = 800): string {
  return isUnsplashUrl(value) ? `${value.split("?")[0]}?w=${width}&q=70&auto=format&fit=crop` : value;
}
