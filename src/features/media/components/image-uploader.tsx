"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Link2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { isUnsplashUrl, previewSrc } from "../image-url";
import { Dropzone } from "./dropzone";
import { useImageUpload } from "./use-image-upload";

/** Collapsible "or paste an Unsplash URL" control shared by both uploaders. */
function UrlEntry({ onSubmit }: { onSubmit: (url: string) => void }) {
  const t = useTranslations("media.url");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const url = value.trim();
    if (!isUnsplashUrl(url)) {
      setInvalid(true);
      return;
    }
    onSubmit(url);
    setValue("");
    setInvalid(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
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

/** Single image (e.g. a tour cover): drop or choose a file, preview, replace, remove. */
export function ImageUploader({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("media.dropzone");
  const { upload, pending, error } = useImageUpload((image) => onChange(image.url));
  const errorId = `${id}-upload-error`;

  return (
    <div className="flex flex-col gap-3">
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
              onClick={() => onChange("")}
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
      <UrlEntry onSubmit={onChange} />
    </div>
  );
}

/** Ordered gallery: upload several files, reorder with buttons, remove. */
export function MultiImageUploader({
  id,
  value,
  onChange,
  max = 12,
}: {
  id: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const t = useTranslations("media.gallery");
  const [items, setItems] = useState(value);
  const errorId = `${id}-upload-error`;

  // Uploads resolve one after another, so keep a local copy that every
  // callback reads from instead of the possibly stale prop.
  const commit = (next: string[]) => {
    setItems(next);
    onChange(next);
  };

  const { upload, pending, error, setError } = useImageUpload((image) =>
    setItems((current) => {
      if (current.length >= max) return current;
      const next = [...current, image.url];
      onChange(next);
      return next;
    }),
  );

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const full = items.length >= max;

  const add = (files: File[]) => {
    const room = max - items.length;
    if (room <= 0) {
      setError(t("full"));
      return;
    }
    upload(files.slice(0, room));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted" aria-live="polite">
        {t("count", { count: items.length, max })}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((url, index) => (
          <li
            key={`${url}-${index}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-sand-100"
          >
            <Image
              src={previewSrc(url, 600)}
              alt={t("position", { position: index + 1 })}
              fill
              sizes="(min-width: 640px) 15vw, 45vw"
              className="object-cover"
            />
            <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              {index + 1}
            </span>
            <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
              <div className="flex gap-1">
                <IconButton
                  label={t("moveLeft")}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowLeft aria-hidden />
                </IconButton>
                <IconButton
                  label={t("moveRight")}
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ArrowRight aria-hidden />
                </IconButton>
              </div>
              <IconButton
                label={t("remove", { position: index + 1 })}
                onClick={() => commit(items.filter((_, i) => i !== index))}
              >
                <X aria-hidden />
              </IconButton>
            </div>
          </li>
        ))}
        {!full && (
          <li>
            <Dropzone
              id={id}
              variant="tile"
              multiple
              pending={pending}
              label={t("add")}
              describedBy={error ? errorId : undefined}
              onFiles={add}
            />
          </li>
        )}
      </ul>
      <UploadError id={errorId} message={error} />
      {!full && <UrlEntry onSubmit={(url) => commit([...items, url])} />}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition hover:bg-white disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
