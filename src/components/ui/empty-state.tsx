import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
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
      <h3 className="text-xl">{title}</h3>
      {description && <p className="text-muted mt-2 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
