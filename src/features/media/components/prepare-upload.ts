"use client";

import { downscaleSize, needsDownscale, type ImageSize } from "../image-rules";

/** Reads the (EXIF-rotated) pixel size without decoding the whole photo. */
function readSize(file: File): Promise<ImageSize | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

/**
 * Shrinks a photo the server would refuse (a camera original over 8 MB, a
 * 48 MP phone shot) to the 2400 px the site keeps anyway, so the operator does
 * not need a resize tool. Everything else, and anything the browser cannot
 * decode (e.g. HEIC), is returned unchanged for the server to judge.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  const size = await readSize(file);
  if (!needsDownscale(file.size, size)) return file;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const target = downscaleSize({ width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no transparency: give transparent PNGs a white background.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const blob = await toJpeg(canvas);
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]*$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
