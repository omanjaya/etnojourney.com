"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type ReviewStripPhoto = { id: number; path: string; width: number; height: number };

/**
 * Small thumbnail strip under a traveller review, opening the same native
 * `<dialog>` lightbox pattern as the tour gallery (focus trap, Esc, inert page).
 */
export function ReviewPhotoStrip({
  photos,
  author,
}: {
  photos: ReviewStripPhoto[];
  author: string;
}) {
  const t = useTranslations("community.photos");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const total = photos.length;
  if (total === 0) return null;

  const show = (i: number) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setIndex(i);
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const onClosed = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const step = (delta: number) => setIndex((i) => (i + delta + total) % total);
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };
  const current = photos[Math.min(index, total - 1)];

  return (
    <>
      <ul className="mt-4 flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => show(i)}
              aria-label={t("open", { index: i + 1, total, author })}
              className="group bg-sand-200 focus-visible:ring-terracotta relative block size-16 overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <Image
                src={photo.path}
                alt={t("alt", { author })}
                fill
                sizes="64px"
                className="object-cover transition-[scale] duration-700 ease-(--ease-editorial) group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t("lightbox", { author })}
        onClose={onClosed}
        onKeyDown={onKeyDown}
        onClick={(event) => event.target === event.currentTarget && close()}
        className="bg-ink/95 m-0 h-dvh max-h-none w-screen max-w-none p-0 text-white backdrop:bg-black/60 open:flex open:flex-col"
      >
        {open && current && (
          <>
            <div className="flex items-center justify-between px-4 py-4 sm:px-8">
              <p className="text-sm text-white/70" aria-live="polite">
                {t("counter", { index: index + 1, total })}
              </p>
              <button
                type="button"
                onClick={close}
                autoFocus
                aria-label={t("close")}
                className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <div
                key={current.id}
                className="animate-fade-up absolute inset-4 sm:inset-x-24 sm:inset-y-4"
              >
                <Image
                  src={current.path}
                  alt={t("alt", { author })}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={t("previous")}
                    className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={t("next")}
                    className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                </>
              )}
            </div>
            {total > 1 && (
              <div className="flex scrollbar-none justify-center gap-2 overflow-x-auto px-4 py-4">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={t("counter", { index: i + 1, total })}
                    aria-current={i === index}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-opacity",
                      i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-100",
                    )}
                  >
                    <Image src={photo.path} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
