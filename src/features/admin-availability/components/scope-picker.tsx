"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/form-controls";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Tour (or "all tours") picker; keeps the shown month in the URL. */
export function ScopePicker({
  value,
  month,
  label,
  options,
}: {
  value: string;
  month: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="closure-scope" className="text-ink-soft text-sm font-medium">
        {label}
      </label>
      <Select
        id="closure-scope"
        value={value}
        aria-busy={pending || undefined}
        onChange={(event) => {
          const tour = event.target.value;
          startTransition(() =>
            router.push({
              pathname: "/admin/availability",
              query: tour === "all" ? { month } : { tour, month },
            }),
          );
        }}
        className={cn("short:h-10 h-11 w-full sm:w-80", pending && "opacity-70")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
