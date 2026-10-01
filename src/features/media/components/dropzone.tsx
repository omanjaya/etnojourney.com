"use client";

import { ImageUp, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE } from "./use-image-upload";

export function Dropzone({
  id,
  multiple = false,
  pending,
  disabled = false,
  variant = "area",
  label,
  describedBy,
  onFiles,
}: {
  id: string;
  multiple?: boolean;
  pending: boolean;
  disabled?: boolean;
  /** `area`: large drop target; `tile`: gallery grid cell; `button`: compact pill. */
  variant?: "area" | "tile" | "button";
  /** Visible call to action; defaults to the dropzone title. */
  label?: string;
  describedBy?: string;
  onFiles: (files: File[]) => void;
}) {
  const t = useTranslations("media.dropzone");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const inactive = pending || disabled;
  const compact = variant === "tile";

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept={ACCEPT_ATTRIBUTE}
      multiple={multiple}
      className="sr-only"
      tabIndex={-1}
      disabled={inactive}
      onChange={(event) => {
        onFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
      }}
    />
  );

  if (variant === "button") {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={inactive}
          aria-describedby={describedBy}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-sand-50 px-4 text-sm font-medium text-ink shadow-sm transition hover:bg-white disabled:opacity-60 [&_svg]:size-4"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw aria-hidden />
          )}
          {pending ? t("uploading") : (label ?? t("replace"))}
        </button>
      </>
    );
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (inactive) return;
    const files = Array.from(event.dataTransfer.files);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!inactive) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-white text-center transition-colors",
        compact ? "aspect-[4/3] h-full p-3" : "px-6 py-10",
        dragging && "border-terracotta bg-terracotta-light/40",
        inactive && "opacity-70",
      )}
    >
      {input}
      <span className="grid size-11 place-items-center rounded-full bg-sand-100 text-terracotta">
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <ImageUp className="size-5" aria-hidden />
        )}
      </span>
      {pending ? (
        <p className="text-sm text-ink-soft" role="status">
          {t("uploading")}
        </p>
      ) : (
        <>
          {!compact && <p className="text-sm font-medium text-ink">{label ?? t("title")}</p>}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={inactive}
            aria-describedby={describedBy}
            className="rounded-full text-sm font-medium text-terracotta underline-offset-4 hover:underline disabled:pointer-events-none"
          >
            {compact ? (label ?? t("browse")) : `${t("or")} ${t("browse")}`}
          </button>
          {!compact && <p className="text-xs text-muted">{t("hint")}</p>}
        </>
      )}
    </div>
  );
}
