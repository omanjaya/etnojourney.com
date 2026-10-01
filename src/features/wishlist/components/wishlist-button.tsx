"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "../actions";

export function WishlistButton({
  tourId,
  initialSaved,
  isAuthenticated,
  variant = "overlay",
}: {
  tourId: number;
  initialSaved: boolean;
  isAuthenticated: boolean;
  variant?: "overlay" | "inline";
}) {
  const t = useTranslations("booking.wishlist");
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    // The button sits inside a card whose link covers the whole surface.
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push({ pathname: "/login", query: { next: pathname } });
      return;
    }

    startTransition(async () => {
      setOptimisticSaved(!saved);
      const result = await toggleWishlistAction(tourId);
      if (result.ok) setSaved(result.data.saved);
    });
  };

  const label = optimisticSaved ? t("remove") : t("add");

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={optimisticSaved}
        aria-label={label}
        className={cn(
          "relative z-10 inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors",
          optimisticSaved
            ? "border-terracotta bg-terracotta-light text-terracotta-dark"
            : "border-ink/15 hover:border-ink/40",
        )}
      >
        <Heart
          className={cn("size-4 transition-transform", optimisticSaved && "scale-110 fill-terracotta text-terracotta")}
          aria-hidden
        />
        {optimisticSaved ? t("saved") : t("save")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimisticSaved}
      aria-label={label}
      title={label}
      className="relative z-10 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
    >
      <Heart
        className={cn("size-[18px] transition-all", optimisticSaved && "fill-terracotta text-terracotta")}
        aria-hidden
      />
    </button>
  );
}
