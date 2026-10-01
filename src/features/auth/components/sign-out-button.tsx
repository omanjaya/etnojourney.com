"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { signOutAction } from "../actions";

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("common.nav");
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOutAction())}
      disabled={pending}
      className={cn("inline-flex items-center gap-2 disabled:opacity-50", className)}
    >
      <LogOut className="size-4" aria-hidden />
      {t("logout")}
    </button>
  );
}
