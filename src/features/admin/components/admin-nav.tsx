"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CalendarX,
  Camera,
  History,
  LayoutDashboard,
  MapIcon,
  MapPin,
  Menu,
  MessageSquareText,
  ReceiptText,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { can, type Permission } from "@/server/auth/permissions";

type NavKey =
  | "overview"
  | "bookings"
  | "payments"
  | "availability"
  | "tours"
  | "destinations"
  | "reviews"
  | "credits"
  | "reports"
  | "users"
  | "activity";

/** Each link shows only to roles holding its permission (the page re-checks). */
const allItems: { href: string; key: NavKey; icon: LucideIcon; permission: Permission }[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard, permission: "backoffice.access" },
  { href: "/admin/bookings", key: "bookings", icon: CalendarCheck, permission: "bookings.manage" },
  { href: "/admin/payments", key: "payments", icon: ReceiptText, permission: "payments.refund" },
  { href: "/admin/availability", key: "availability", icon: CalendarX, permission: "availability.manage" },
  { href: "/admin/tours", key: "tours", icon: MapIcon, permission: "catalogue.manage" },
  { href: "/admin/destinations", key: "destinations", icon: MapPin, permission: "catalogue.manage" },
  { href: "/admin/reviews", key: "reviews", icon: MessageSquareText, permission: "reviews.manage" },
  { href: "/admin/credits", key: "credits", icon: Camera, permission: "credits.manage" },
  { href: "/admin/reports", key: "reports", icon: BarChart3, permission: "reports.view" },
  { href: "/admin/users", key: "users", icon: Users, permission: "users.manage" },
  { href: "/admin/activity", key: "activity", icon: History, permission: "audit.view" },
];

/** Item height (h-11) + gap (gap-1), used to slide the active indicator. */
const ITEM_STEP_PX = 48;

function NavLinks({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin.nav");
  const tr = useTranslations("reviews.admin");
  const items = allItems.filter((item) => can(role, item.permission));
  const activeIndex = items.findIndex(({ href }) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href),
  );
  return (
    <ul className="relative flex flex-col gap-1">
      {/* One indicator slides between items instead of each item lighting up. */}
      <li
        aria-hidden
        className={cn(
          "bg-sand-50 pointer-events-none absolute inset-x-0 top-0 h-11 rounded-xl shadow-[0_1px_0_rgb(0_0_0/0.04)]",
          "transition-[translate,opacity] duration-500 ease-(--ease-editorial)",
          activeIndex < 0 && "opacity-0",
        )}
        style={{ translate: `0 ${Math.max(activeIndex, 0) * ITEM_STEP_PX}px` }}
      />
      {items.map(({ href, key, icon: Icon }, index) => {
        const active = index === activeIndex;
        return (
          <li key={href} className="relative">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors duration-300",
                active ? "text-ink" : "text-sand-100/70 hover:text-sand-50 hover:bg-white/5",
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-transform duration-300",
                  active ? "text-terracotta" : "group-hover:translate-x-0.5",
                )}
                aria-hidden
              />
              {key === "reviews" ? tr("nav") : t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavFooter({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations("admin.nav");
  return (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-sm">
      <div className="min-w-0">
        <p className="text-sand-100/70 text-xs">{t("signedInAs")}</p>
        <p className="text-sand-50 truncate font-medium">{user.name}</p>
        <p className="text-sand-100/60 truncate text-xs">{user.email}</p>
      </div>
      <Link
        href="/"
        className="text-sand-100/70 hover:text-sand-50 inline-flex min-h-10 items-center gap-2"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToSite")}
      </Link>
      <SignOutButton className="text-sand-100/70 hover:text-sand-50 min-h-10" />
    </div>
  );
}

export function AdminNav({ user }: { user: { name: string; email: string; role: string } }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Esc closes the mobile menu and returns focus to its toggle.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ viewTransitionName: "admin-nav" }}
        className="bg-indigo text-sand-50 short:gap-6 short:py-6 sticky top-0 hidden h-dvh flex-col gap-10 overflow-y-auto overscroll-contain px-5 py-8 lg:flex"
      >
        <Link href="/admin" className="logo-link px-2" aria-label="EtnoJourney Admin">
          <Logo inverted className="h-11" />
        </Link>
        <nav aria-label={t("label")} className="flex-1">
          <NavLinks pathname={pathname} role={user.role} />
        </nav>
        <NavFooter user={user} />
      </aside>

      {/* Mobile top bar */}
      <header
        style={{ viewTransitionName: "admin-nav" }}
        className="bg-indigo text-sand-50 sticky top-0 z-40 lg:hidden"
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/admin" className="logo-link" aria-label="EtnoJourney Admin">
            <Logo inverted className="h-11" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="grid size-11 place-items-center rounded-full hover:bg-white/10"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {/* Height animates via grid rows (0fr -> 1fr); `inert` hides it when closed. */}
        <nav
          id="admin-mobile-nav"
          aria-label={t("label")}
          inert={!open}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-350 ease-(--ease-editorial)",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            {/* Scrolls inside the sticky bar when the menu is taller than the screen (landscape phones). */}
            <div className="flex max-h-[calc(100dvh-4rem)] flex-col gap-6 overflow-y-auto overscroll-contain px-4 pb-6">
              <NavLinks pathname={pathname} role={user.role} onNavigate={() => setOpen(false)} />
              <NavFooter user={user} />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
