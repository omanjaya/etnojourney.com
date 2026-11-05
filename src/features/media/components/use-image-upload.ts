"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { uploadImageAction, type UploadedImage } from "../actions";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = ACCEPTED.join(",");

/**
 * Uploads files one by one through the server action. Client checks are only
 * for fast feedback; the server re-validates every file by its content.
 */
export function useImageUpload(onUploaded: (image: UploadedImage) => void) {
  const t = useTranslations("media.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const upload = (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          setError(t("tooLarge"));
          continue;
        }
        if (file.type && !ACCEPTED.includes(file.type)) {
          setError(t("unsupported"));
          continue;
        }
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadImageAction(formData);
        if (result.ok) onUploaded(result.data);
        else setError(result.error);
      }
    });
  };

  return { upload, pending, error, setError };
}
