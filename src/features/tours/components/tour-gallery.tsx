"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, ViewTransition, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import "../view-transitions.css";
import { PhotoCredit, type ImageCredit } from "@/components/shared/photo-credit";

/** Small rendition through the Next image optimizer (same URL shape cards request). */
function underlaySrc(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`;
}

/**
 * Editorial photo mosaic with a lightbox built on the native `<dialog>`:
 * `showModal()` traps focus, makes the page inert and closes on Esc.
 */
export function TourGallery({
  images,
  alt,
  morphName,
  credits = {},
}: {
  images: string[];
  alt: string;
  /** View transition name of the card image this hero morphs from. */
  morphName?: string;
  /** Attribution per image path (curated content photos). */
  credits?: Record<string, ImageCredit>;
}) {
  const t = useTranslations("tours.detail");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const total = images.length;

  const show = (i: number) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setIndex(i);
    setOpen(true);
    dialogRef.current?.showModal();
  };

  const close = () => dialogRef.current?.close();

  // Fires for the close button, Esc and backdrop clicks alike.
  const onClosed = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const step = (delta: number) => setIndex((i) => (i + delta + total) % total);

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  };

  const tiles = images.slice(0, 3);

  return (
    <>
      <div
        className={cn(
          "grid h-[52vh] min-h-[22rem] gap-2 overflow-hidden rounded-(--radius-card) md:h-[64vh] md:gap-3",
          tiles.length > 1 ? "grid-cols-1 md:grid-cols-4 md:grid-rows-2" : "grid-cols-1",
        )}
      >
        {tiles.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => show(i)}
            aria-label={t("photo", { index: i + 1, total })}
            style={{ "--ej-delay": `${0.25 + i * 0.18}s` } as CSSProperties}
            className={cn(
              "group bg-sand-200 relative overflow-hidden",
              tiles.length > 1 && i === 0 && "md:col-span-3 md:row-span-2",
              // Secondary tiles open like curtains; the main photo is the LCP
              // element and the morph target, so it is never clipped.
              i > 0 && "ej-curtain hidden md:block",
              tiles.length === 2 && i === 1 && "md:row-span-2",
            )}
          >
            {i === 0 ? (
              <ViewTransition
                name={morphName}
                share={morphName ? "morph" : undefined}
                default="none"
              >
                {/* The underlay is the card-sized rendition the visitor most likely
                    already has cached, so the morph snapshot is never an empty box
                    while the large hero image is still loading. */}
                <div
                  className="bg-sand-200 absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${underlaySrc(src)}")` }}
                >
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    preload
                    fetchPriority="high"
                    sizes="(min-width: 1280px) 900px, (min-width: 768px) 75vw, 100vw"
                    className="animate-ken-burns object-cover transition-[scale] duration-[1.4s] ease-(--ease-editorial) group-hover:scale-[1.04]"
                  />
                </div>
              </ViewTransition>
            ) : (
              <Image
                src={src}
                alt=""
                fill
                sizes="25vw"
                className="object-cover transition-[scale] duration-[1.4s] ease-(--ease-editorial) group-hover:scale-[1.06]"
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        {total > 1 && (
          <button
            type="button"
            onClick={() => show(0)}
            className="text-ink-soft hover:text-terracotta inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            <Images className="size-4" aria-hidden />
            {t("viewPhotos", { count: total })}
          </button>
        )}
        <PhotoCredit credit={credits[images[0]]} className="text-muted" />
      </div>

      <dialog
        ref={dialogRef}
        aria-label={t("gallery")}
        onClose={onClosed}
        onKeyDown={onKeyDown}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="bg-ink/95 m-0 h-dvh max-h-none w-screen max-w-none p-0 text-white backdrop:bg-black/60 open:flex open:flex-col"
      >
        {open && (
          <>
            <div className="flex items-center justify-between px-4 py-4 sm:px-8">
              <div className="min-w-0" aria-live="polite">
                <p className="text-sm text-white/70">{t("photo", { index: index + 1, total })}</p>
                <PhotoCredit credit={credits[images[index]]} className="mt-1 truncate text-white/60" />
              </div>
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
                key={index}
                className="animate-fade-up absolute inset-4 sm:inset-x-24 sm:inset-y-4"
              >
                <Image src={images[index]} alt="" fill sizes="100vw" className="object-contain" />
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
            <div className="flex scrollbar-none justify-center gap-2 overflow-x-auto px-4 py-4">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t("photo", { index: i + 1, total })}
                  aria-current={i === index}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-opacity",
                    i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-100",
                  )}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
