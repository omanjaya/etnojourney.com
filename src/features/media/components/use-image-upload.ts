"use client";

import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { MAX_UPLOAD_BYTES } from "@/server/storage/image-validation";
import { uploadImageAction, type UploadedImage } from "../actions";
import { prepareImageForUpload } from "./prepare-upload";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const ACCEPT_ATTRIBUTE = ACCEPTED.join(",");

/**
 * Uploads files one by one through the server action. Large photos are shrunk
 * in the browser first; the remaining client checks are only for fast
 * feedback, the server re-validates every file by its content.
 */
export function useImageUpload(onUploaded: (image: UploadedImage) => void) {
  const t = useTranslations("media.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const upload = (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const original of files) {
        if (original.type && !ACCEPTED.includes(original.type)) {
          setError(t("unsupported"));
          continue;
        }
        const file = await prepareImageForUpload(original);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(t("tooLarge"));
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

/**
 * Tells the parent form whether this uploader is busy, so it can hold the
 * save until every photo is in (a save sent mid-upload would keep the old photo).
 */
export function useReportPending(pending: boolean, onPendingChange?: (pending: boolean) => void) {
  const report = useEffectEvent((value: boolean) => onPendingChange?.(value));
  useEffect(() => {
    report(pending);
  }, [pending]);
  // An uploader removed mid-upload must not keep the form locked.
  useEffect(() => () => report(false), []);
}
