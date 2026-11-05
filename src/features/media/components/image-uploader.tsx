"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Link2,
  RefreshCw,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import {
  appendPhoto,
  galleryKeys,
  movePhoto,
  moveToFront,
  removePhoto,
  replacePhoto,
} from "../gallery";
import { heroPhotoNotice, type HeroPhotoNotice } from "../image-rules";
import { isUnsplashUrl, previewSrc } from "../image-url";
import { Dropzone, DROPZONE_TRIGGER } from "./dropzone";
import { ACCEPT_ATTRIBUTE, useImageUpload, useReportPending } from "./use-image-upload";

/** Collapsible "or paste an Unsplash URL" control shared by both uploaders. */
function UrlEntry({ onSubmit }: { onSubmit: (url: string) => void }) {
  const t = useTranslations("media.url");
  const id = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  // Closing unmounts the input, so focus goes back to the toggle.
  const close = () => {
    flushSync(() => {
      setOpen(false);
      setValue("");
      setInvalid(false);
    });
    toggleRef.current?.focus();
  };

  const submit = () => {
    const url = value.trim();
    if (!isUnsplashUrl(url)) {
      setInvalid(true);
      return;
    }
    onSubmit(url);
    close();
  };

  if (!open) {
    return (
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted hover:text-ink"
      >
        <Link2 className="size-3.5" aria-hidden />
        {t("toggle")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          placeholder={t("placeholder")}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => {
            // Enter would otherwise submit the whole tour form.
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="h-10"
          autoFocus
        />
        <Button type="button" variant="outline" size="sm" className="h-10" onClick={submit}>
          {t("add")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-10" onClick={close}>
          {t("cancel")}
        </Button>
      </div>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {t("invalid")}
        </p>
      )}
    </div>
  );
}

function UploadError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  );
}

/** Marks a temporary AI illustration that should be replaced by a real photo. */
function PlaceholderBadge({ withHint = false }: { withHint?: boolean }) {
  const t = useTranslations("media.placeholder");
  return (
    <span
      title={t("hint")}
      className="inline-flex items-center gap-1 rounded-full bg-gold-light px-2 py-0.5 text-[11px] font-semibold text-[#8a6420] shadow-sm [&_svg]:size-3"
    >
      <Sparkles aria-hidden />
      {t("badge")}
      {withHint && <span className="font-normal">&middot; {t("hint")}</span>}
    </span>
  );
}

/** Single image (e.g. a tour cover): drop or choose a file, preview, replace, remove. */
export function ImageUploader({
  id,
  value,
  onChange,
  invalid = false,
  placeholderImages = [],
  onPendingChange,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  invalid?: boolean;
  /** Images credited as temporary AI placeholders; they get a "replace me" badge. */
  placeholderImages?: readonly string[];
  /** Reports uploads in progress, so the form can wait before saving. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const t = useTranslations("media.dropzone");
  const tw = useTranslations("media.warnings");
  const containerRef = useRef<HTMLDivElement>(null);
  // Advice about the last uploaded photo (too small, not landscape).
  const [notice, setNotice] = useState<{ url: string; kind: HeroPhotoNotice; width: number } | null>(
    null,
  );
  const { upload, pending, error } = useImageUpload((image) => {
    const kind = heroPhotoNotice(image);
    setNotice(kind ? { url: image.url, kind, width: image.width } : null);
    // The first photo replaces the drop area (and its focused button) with
    // the preview: keep keyboard focus on the preview's "replace" button.
    const hadFocus = containerRef.current?.contains(document.activeElement) ?? false;
    if (!hadFocus) {
      onChange(image.url);
      return;
    }
    flushSync(() => onChange(image.url));
    containerRef.current?.querySelector<HTMLElement>(`[${DROPZONE_TRIGGER}]`)?.focus();
  });
  useReportPending(pending, onPendingChange);
  const errorId = `${id}-upload-error`;

  // Removing unmounts the focused button: move focus to the file picker that replaces it.
  const remove = () => {
    flushSync(() => onChange(""));
    containerRef.current?.querySelector<HTMLElement>(`[${DROPZONE_TRIGGER}]`)?.focus();
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {value ? (
        <figure
          className={cn(
            "relative aspect-[16/9] overflow-hidden rounded-xl border bg-sand-100",
            invalid ? "border-danger" : "border-line",
          )}
        >
          <Image
            src={previewSrc(value, 1200)}
            alt={t("preview")}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className={cn("object-cover transition-opacity", pending && "opacity-40")}
          />
          {placeholderImages.includes(value) && (
            <div className="absolute inset-x-3 top-3 flex">
              <PlaceholderBadge withHint />
            </div>
          )}
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-end gap-2">
            <Dropzone
              id={id}
              variant="button"
              pending={pending}
              label={t("replace")}
              describedBy={error ? errorId : undefined}
              onFiles={upload}
            />
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={remove}
              disabled={pending}
              aria-label={t("remove")}
            >
              <X aria-hidden />
              {t("remove")}
            </Button>
          </div>
        </figure>
      ) : (
        <Dropzone
          id={id}
          pending={pending}
          describedBy={error ? errorId : undefined}
          onFiles={upload}
        />
      )}
      <UploadError id={errorId} message={error} />
      <div aria-live="polite" className="empty:-mt-3">
        {notice && notice.url === value && (
          <p className="flex items-start gap-1.5 text-xs text-ink-soft">
            <Info className="mt-px size-3.5 shrink-0 text-gold" aria-hidden />
            {tw(notice.kind, { width: notice.width })}
          </p>
        )}
      </div>
      <UrlEntry onSubmit={onChange} />
    </div>
  );
}

/**
 * Ordered gallery: upload several files, reorder, replace or remove one photo,
 * and (with `onSetCover`) pick the cover. The list is controlled by `value`.
 */
export function MultiImageUploader({
  id,
  value,
  onChange,
  max = 12,
  coverUrl,
  onSetCover,
  placeholderImages = [],
  onPendingChange,
}: {
  id: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** The current cover, marked on its gallery tile. */
  coverUrl?: string;
  /** Makes a gallery photo the cover (it also moves to the first position). */
  onSetCover?: (url: string) => void;
  /** Images credited as temporary AI placeholders; they get a "replace me" badge. */
  placeholderImages?: readonly string[];
  /** Reports uploads in progress, so the form can wait before saving. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const t = useTranslations("media.gallery");
  const errorId = `${id}-upload-error`;
  const replaceErrorId = `${id}-replace-error`;
  const listRef = useRef<HTMLUListElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Uploads finish one after another, after the render that started them, so
  // every change starts from the newest list rather than a stale prop.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  // `focus` runs once the new list is on screen (for keyboard users).
  const commit = (next: string[], focus?: () => void) => {
    if (next === latest.current) return;
    latest.current = next;
    if (!focus) {
      onChange(next);
      return;
    }
    flushSync(() => onChange(next));
    focus();
  };

  /** Focuses a tile's button, or the "add photo" button when the tile is gone. */
  const focusTile = (index: number, action: string) => {
    const tiles = listRef.current?.querySelectorAll<HTMLElement>("[data-gallery-tile]");
    const button = tiles?.[index]?.querySelector<HTMLElement>(
      `[data-action="${action}"]:not(:disabled)`,
    );
    (button ?? listRef.current?.querySelector<HTMLElement>(`[${DROPZONE_TRIGGER}]`))?.focus();
  };

  const add = useImageUpload((image) => commit(appendPhoto(latest.current, image.url, max)));

  // Replacing one photo keeps its place in the order.
  const replaceTarget = useRef<{ index: number; url: string } | null>(null);
  const [replacingUrl, setReplacingUrl] = useState<string | null>(null);
  const replace = useImageUpload((image) => {
    const target = replaceTarget.current;
    if (!target) return;
    const next = replacePhoto(latest.current, target, image.url);
    // The tile is re-created for its new photo; keep focus on its replace button.
    const hadFocus = listRef.current?.contains(document.activeElement) ?? false;
    commit(next, hadFocus ? () => focusTile(next.indexOf(image.url), "replace") : undefined);
  });
  const startReplace = (index: number) => {
    if (replace.pending) return;
    const url = latest.current[index];
    replaceTarget.current = { index, url };
    setReplacingUrl(url);
    replaceInputRef.current?.click();
  };

  useReportPending(add.pending || replace.pending, onPendingChange);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    const next = movePhoto(latest.current, index, delta);
    // At either end the pressed arrow is disabled, so focus the other one.
    const atEdge = target === 0 || target === next.length - 1;
    const forward = delta === 1 ? "move-right" : "move-left";
    const backward = delta === 1 ? "move-left" : "move-right";
    commit(next, () => focusTile(target, atEdge ? backward : forward));
  };

  const remove = (index: number) => {
    const next = removePhoto(latest.current, index);
    commit(next, () => focusTile(Math.min(index, next.length - 1), "remove"));
  };

  const makeCover = (index: number) => {
    onSetCover?.(latest.current[index]);
    commit(moveToFront(latest.current, index), () => focusTile(0, "cover"));
  };

  const full = value.length >= max;
  const keys = galleryKeys(value);

  const addFiles = (files: File[]) => {
    const room = max - latest.current.length;
    if (room <= 0) {
      add.setError(t("full"));
      return;
    }
    add.upload(files.slice(0, room));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted" aria-live="polite">
        {t("count", { count: value.length, max })}
      </p>
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-label={t("replaceInput")}
        onChange={(event) => {
          replace.upload(Array.from(event.target.files ?? []).slice(0, 1));
          event.target.value = "";
        }}
      />
      <ul ref={listRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url, index) => {
          const position = index + 1;
          const isCover = Boolean(coverUrl) && url === coverUrl;
          const replacing = replace.pending && replacingUrl === url;
          return (
            <li
              key={keys[index]}
              data-gallery-tile=""
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-xl border bg-sand-100",
                isCover ? "border-terracotta ring-1 ring-terracotta" : "border-line",
              )}
            >
              <Image
                src={previewSrc(url, 600)}
                alt={t("position", { position })}
                fill
                sizes="(min-width: 640px) 15vw, 45vw"
                className={cn("object-cover transition-opacity", replacing && "opacity-40")}
              />
              <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {position}
                  </span>
                  {isCover && (
                    <span className="rounded-full bg-terracotta px-2 py-0.5 text-[11px] font-semibold text-white">
                      {t("coverBadge")}
                    </span>
                  )}
                  {placeholderImages.includes(url) && <PlaceholderBadge />}
                </div>
                {onSetCover && (
                  <IconButton
                    action="cover"
                    label={t("makeCover", { position })}
                    onClick={() => {
                      if (!isCover) makeCover(index);
                    }}
                    pressed={isCover}
                  >
                    <Star className={cn(isCover && "fill-gold text-gold")} aria-hidden />
                  </IconButton>
                )}
              </div>
              <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                <div className="flex gap-1">
                  <IconButton
                    action="move-left"
                    label={t("moveLeft")}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowLeft aria-hidden />
                  </IconButton>
                  <IconButton
                    action="move-right"
                    label={t("moveRight")}
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                  >
                    <ArrowRight aria-hidden />
                  </IconButton>
                  <IconButton
                    action="replace"
                    label={t("replace", { position })}
                    onClick={() => startReplace(index)}
                    busy={replace.pending}
                    describedBy={replace.error ? replaceErrorId : undefined}
                  >
                    <RefreshCw className={cn(replacing && "animate-spin")} aria-hidden />
                  </IconButton>
                </div>
                <IconButton
                  action="remove"
                  label={t("remove", { position })}
                  onClick={() => remove(index)}
                >
                  <X aria-hidden />
                </IconButton>
              </div>
            </li>
          );
        })}
        {!full && (
          <li>
            <Dropzone
              id={id}
              variant="tile"
              multiple
              pending={add.pending}
              label={t("add")}
              describedBy={add.error ? errorId : undefined}
              onFiles={addFiles}
            />
          </li>
        )}
      </ul>
      <span role="status" className="sr-only">
        {replace.pending ? t("replacing") : ""}
      </span>
      <UploadError id={errorId} message={add.error} />
      <UploadError id={replaceErrorId} message={replace.error} />
      {!full && (
        <UrlEntry onSubmit={(url) => commit(appendPhoto(latest.current, url, max))} />
      )}
    </div>
  );
}

function IconButton({
  action,
  label,
  onClick,
  disabled = false,
  busy = false,
  pressed,
  describedBy,
  children,
}: {
  /** Lets the gallery find this button again to restore keyboard focus. */
  action: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Acts disabled but keeps keyboard focus while an upload runs. */
  busy?: boolean;
  /** For toggle-like buttons (the cover star). */
  pressed?: boolean;
  describedBy?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-action={action}
      onClick={() => {
        if (!busy) onClick();
      }}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-pressed={pressed}
      aria-label={label}
      aria-describedby={describedBy}
      title={label}
      className="grid size-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition hover:bg-white disabled:opacity-40 aria-disabled:cursor-default aria-disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
