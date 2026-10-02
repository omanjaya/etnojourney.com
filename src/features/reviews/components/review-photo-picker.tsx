"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { REVIEW_PHOTO_MAX_BYTES, REVIEW_PHOTOS_MAX } from "@/server/services/review.rules";
import type { ReviewPhotoUpload } from "@/server/services/review.service";
import { ACCEPT_ATTRIBUTE } from "@/features/media/components/use-image-upload";
import { uploadReviewPhotoAction } from "../actions";

/**
 * Up to four photos for a review. Each file is uploaded on selection (the
 * server validates and re-encodes it); the form then submits the receipts in
 * a hidden `photos` field. Client checks only give fast feedback.
 */
export function ReviewPhotoPicker({
  bookingId,
  photos,
  onChange,
  onPendingChange,
}: {
  bookingId: number;
  photos: ReviewPhotoUpload[];
  onChange: (photos: ReviewPhotoUpload[]) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const t = useTranslations("community.photos");
  const tm = useTranslations("media.errors");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Local previews: the uploaded file is not served until the review is
  // published, so show the picked file itself (object URLs, revoked on unmount).
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => () => Object.values(previewsRef.current).forEach(URL.revokeObjectURL), []);
  const remaining = REVIEW_PHOTOS_MAX - photos.length;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const upload = (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    if (files.length > remaining) setError(t("errors.tooMany"));
    const batch = files.slice(0, Math.max(0, remaining));
    if (batch.length === 0) return;
    onPendingChange?.(true);
    startTransition(async () => {
      const added: ReviewPhotoUpload[] = [];
      for (const file of batch) {
        if (file.size > REVIEW_PHOTO_MAX_BYTES) {
          setError(tm("tooLarge"));
          continue;
        }
        const formData = new FormData();
        formData.set("bookingId", String(bookingId));
        formData.set("file", file);
        const result = await uploadReviewPhotoAction(formData);
        if (result.ok) {
          const preview = URL.createObjectURL(file);
          setPreviews((current) => ({ ...current, [result.data.path]: preview }));
          added.push(result.data);
          onChange([...photos, ...added]);
        } else {
          setError(result.error);
        }
      }
      onPendingChange?.(false);
    });
  };

  const remove = (path: string) => {
    setError(null);
    if (previews[path]) URL.revokeObjectURL(previews[path]);
    onChange(photos.filter((photo) => photo.path !== path));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-ink-soft text-sm font-medium">{t("label")}</span>
      <p id={hintId} className="text-muted text-xs leading-relaxed">
        {t("hint", { max: REVIEW_PHOTOS_MAX })}
      </p>

      <ul
        className="flex flex-wrap gap-2"
        aria-label={t("count", { count: photos.length, max: REVIEW_PHOTOS_MAX })}
      >
        {photos.map((photo, i) => (
          <li key={photo.path} className="bg-sand-200 relative size-20 overflow-hidden rounded-xl">
            {previews[photo.path] && (
              <Image
                src={previews[photo.path]}
                alt={t("preview", { position: i + 1 })}
                fill
                sizes="80px"
                unoptimized
                className="object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => remove(photo.path)}
              aria-label={t("remove", { position: i + 1 })}
              className="bg-ink/70 hover:bg-ink absolute top-1 right-1 grid size-7 place-items-center rounded-full text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {remaining > 0 && (
          <li>
            <input
              ref={inputRef}
              id={`${id}-file`}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              className="sr-only"
              tabIndex={-1}
              disabled={pending}
              onChange={(event) => {
                upload(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              className="border-line text-ink-soft hover:border-terracotta hover:text-terracotta flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-white text-[11px] font-medium transition-colors disabled:opacity-60"
            >
              {pending ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-5" aria-hidden />
              )}
              <span className="px-1 text-center leading-tight">{t("add")}</span>
            </button>
          </li>
        )}
      </ul>
      <p className="text-muted text-xs tabular-nums" aria-live="polite">
        {pending ? t("uploading") : t("count", { count: photos.length, max: REVIEW_PHOTOS_MAX })}
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
