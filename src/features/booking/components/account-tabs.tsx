"use client";

import { Heart, Settings, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/account", key: "bookings", icon: Ticket },
  { href: "/account/wishlist", key: "wishlist", icon: Heart },
  { href: "/account/settings", key: "settings", icon: Settings },
] as const;

export function AccountTabs() {
  const t = useTranslations("account.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label={t("bookings")} className="mt-10 flex flex-wrap gap-2 print:hidden">
      {tabs.map(({ href, key, icon: Icon }) => {
        // Booking detail pages live under /account/bookings and belong to the bookings tab.
        const active =
          pathname === href || (href === "/account" && pathname.startsWith("/account/bookings"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
              active ? "bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40 border",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
