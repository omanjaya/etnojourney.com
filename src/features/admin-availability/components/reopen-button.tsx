"use client";

import { Unlock } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reopenClosuresAction } from "../actions";

/** Deletes a run of closures after a confirm; the page refreshes via revalidation. */
export function ReopenButton({
  ids,
  label,
  confirmText,
  text,
}: {
  ids: number[];
  /** Accessible name, naming the dates and tour. */
  label: string;
  confirmText: string;
  text: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-10 md:h-8"
        aria-label={label}
        loading={pending}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const result = await reopenClosuresAction(ids);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <Unlock aria-hidden />
        {text}
      </Button>
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
