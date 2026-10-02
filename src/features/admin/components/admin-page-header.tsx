import type { ReactNode } from "react";
import { SplitWords } from "@/components/motion";

/** Admin page title; a quick word rise keeps it lively without slowing work down. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line mb-10 flex flex-col gap-6 border-b pb-8 md:flex-row md:items-end md:justify-between short:mb-6 short:gap-4 short:pb-5">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow animate-fade-in mb-3 short:mb-2">{eyebrow}</p>}
        <SplitWords
          as="h1"
          play="load"
          text={title}
          stagger={35}
          className="text-4xl leading-tight md:text-5xl short:text-4xl"
        />
        {description && (
          <p
            className="text-ink-soft animate-fade-up mt-3 short:mt-2 short:text-sm"
            style={{ animationDelay: "0.2s" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="animate-fade-in shrink-0" style={{ animationDelay: "0.25s" }}>
          {action}
        </div>
      )}
    </div>
  );
}
