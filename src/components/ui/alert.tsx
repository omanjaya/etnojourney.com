import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Alert({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "success";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "danger" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
        tone === "danger" ? "bg-danger-light text-danger" : "bg-leaf-light text-leaf",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
