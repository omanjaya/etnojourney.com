"use client";

import { ImageUp, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE } from "./use-image-upload";

/** Marks the button that opens the file picker, so uploaders can move focus to it. */
export const DROPZONE_TRIGGER = "data-dropzone-trigger";

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

  // The trigger stays mounted (and focusable) while an upload runs, so
  // keyboard focus is not thrown back to the top of the page.
  const open = () => {
    if (!inactive) inputRef.current?.click();
  };
  const trigger = {
    type: "button" as const,
    onClick: open,
    "aria-disabled": inactive || undefined,
    "aria-describedby": describedBy,
    [DROPZONE_TRIGGER]: "",
  };

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
          {...trigger}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-sand-50 px-4 text-sm font-medium text-ink shadow-sm transition hover:bg-white aria-disabled:cursor-default aria-disabled:opacity-60 [&_svg]:size-4"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw aria-hidden />
          )}
          {pending ? t("uploading") : (label ?? t("replace"))}
        </button>
        <span role="status" className="sr-only">
          {pending ? t("uploading") : ""}
        </span>
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
      {!compact && (
        <p className="text-sm font-medium text-ink">
          {pending ? t("uploading") : (label ?? t("title"))}
        </p>
      )}
      <button
        {...trigger}
        className="rounded-full text-sm font-medium text-terracotta underline-offset-4 hover:underline aria-disabled:cursor-default aria-disabled:no-underline aria-disabled:opacity-60"
      >
        {compact
          ? pending
            ? t("uploading")
            : (label ?? t("browse"))
          : `${t("or")} ${t("browse")}`}
      </button>
      {!compact && <p className="text-xs text-muted">{t("hint")}</p>}
      <span role="status" className="sr-only">
        {pending ? t("uploading") : ""}
      </span>
    </div>
  );
}
