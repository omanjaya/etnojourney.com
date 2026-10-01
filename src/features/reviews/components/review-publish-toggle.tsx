"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setReviewPublishedAction } from "../actions";

/** Optimistic publish switch for a review; reverts if the server rejects. */
export function ReviewPublishToggle({
  reviewId,
  initial,
  label,
}: {
  reviewId: number;
  initial: boolean;
  label: string;
}) {
  const [checked, setChecked] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await setReviewPublishedAction(reviewId, next);
      if (!result.ok) {
        setChecked(!next);
        setError(result.error);
      }
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={error ?? undefined}
        onClick={toggle}
        disabled={pending}
        className={cn(
          // The ::before extends the hit area to 40px for touch without changing the look.
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 before:absolute before:-inset-2 before:content-[''] disabled:opacity-60",
          checked ? "bg-leaf" : "bg-sand-300",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform duration-300 ease-(--ease-editorial)",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
      {error && (
        <span role="alert" className="text-danger max-w-32 text-[11px] leading-tight">
          {error}
        </span>
      )}
    </span>
  );
}
