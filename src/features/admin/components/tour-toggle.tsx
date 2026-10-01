"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setTourFeaturedAction, setTourPublishedAction } from "../actions";

const actions = {
  published: setTourPublishedAction,
  featured: setTourFeaturedAction,
};

/** Optimistic switch for a boolean tour flag; reverts if the server rejects. */
export function TourToggle({
  tourId,
  field,
  initial,
  label,
}: {
  tourId: number;
  field: keyof typeof actions;
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
      const result = await actions[field](tourId, next);
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
          "group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 before:absolute before:-inset-2 before:content-[''] disabled:opacity-60",
          checked ? (field === "featured" ? "bg-gold" : "bg-leaf") : "bg-sand-300",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-[translate,scale] duration-300 ease-(--ease-editorial) group-active:scale-90",
            checked ? "translate-x-5.5" : "translate-x-0.5",
            pending && "animate-pulse",
          )}
        />
      </button>
      {error && (
        <span
          role="alert"
          className="text-danger animate-fade-up max-w-32 text-[11px] leading-tight"
        >
          {error}
        </span>
      )}
    </span>
  );
}
