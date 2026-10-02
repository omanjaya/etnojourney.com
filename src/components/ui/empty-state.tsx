import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel: Heading = "h2",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Defaults to h2 (it usually sits right under the page h1). */
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "border-line flex flex-col items-center rounded-(--radius-card) border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <span className="bg-sand-100 text-terracotta mb-5 grid size-14 place-items-center rounded-full">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <Heading className="text-xl">{title}</Heading>
      {description && <p className="text-muted mt-2 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
