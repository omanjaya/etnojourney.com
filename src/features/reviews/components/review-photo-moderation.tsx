"use client";

import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setReviewPhotoHiddenAction } from "../actions";

type ModeratedPhoto = { id: number; path: string; isHidden: boolean };

/** Admin: traveller photos under one review, each with a hide/show control. */
export function ReviewPhotoModeration({
  photos,
  author,
}: {
  photos: ModeratedPhoto[];
  author: string;
}) {
  const t = useTranslations("community.admin");
  if (photos.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-muted text-xs font-medium">{t("photos")}</p>
      <ul className="mt-2 flex flex-wrap gap-3">
        {photos.map((photo, i) => (
          <PhotoTile key={photo.id} photo={photo} index={i + 1} author={author} />
        ))}
      </ul>
    </div>
  );
}

function PhotoTile({
  photo,
  index,
  author,
}: {
  photo: ModeratedPhoto;
  index: number;
  author: string;
}) {
  const t = useTranslations("community.admin");
  const tp = useTranslations("community.photos");
  const [hidden, setHidden] = useState(photo.isHidden);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    setError(null);
    startTransition(async () => {
      const result = await setReviewPhotoHiddenAction(photo.id, next);
      if (!result.ok) {
        setHidden(!next);
        setError(result.error);
      }
    });
  };

  return (
    <li className="flex w-20 flex-col gap-1">
      <span className="bg-sand-200 relative block size-20 overflow-hidden rounded-lg">
        <Image
          src={photo.path}
          alt={tp("alt", { author })}
          fill
          sizes="80px"
          className={cn("object-cover transition-opacity", hidden && "opacity-35 grayscale")}
        />
        {hidden && (
          <span className="bg-ink/75 absolute inset-x-0 bottom-0 py-0.5 text-center text-[10px] font-medium text-white">
            {t("hidden")}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={t(hidden ? "showLabel" : "hideLabel", { index, author })}
        className="text-ink-soft hover:text-terracotta inline-flex min-h-8 items-center gap-1 text-xs font-medium disabled:opacity-60"
      >
        {hidden ? (
          <Eye className="size-3.5" aria-hidden />
        ) : (
          <EyeOff className="size-3.5" aria-hidden />
        )}
        {hidden ? t("show") : t("hide")}
      </button>
      {error && (
        <span role="alert" className="text-danger text-[11px] leading-tight">
          {error}
        </span>
      )}
    </li>
  );
}
