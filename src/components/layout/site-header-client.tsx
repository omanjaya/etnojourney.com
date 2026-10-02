"use client";

import { Handshake, Heart, LayoutDashboard, Menu, Ticket, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { LocaleSwitcher } from "./locale-switcher";
import { Container } from "./container";

type HeaderUser = { name: string; isAdmin: boolean; isPartner?: boolean } | null;

export function SiteHeaderClient({
  user,
  links,
}: {
  user: HeaderUser;
  links: { href: string; label: string }[];
}) {
  const t = useTranslations("common.nav");
  const tp = useTranslations("partner.nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigation (render-time reset, no effect needed).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Move focus into the menu when it opens; Esc closes it and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /** Keeps Tab cycling between the toggle and the menu while it is open. */
  const trapFocus = (e: KeyboardEvent<HTMLElement>) => {
    if (!open || e.key !== "Tab" || !menuRef.current || !toggleRef.current) return;
    const focusable = [
      toggleRef.current,
      ...menuRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    ];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Only the home page has a full-bleed hero behind a transparent header.
  const transparent = pathname === "/";
  const solid = !transparent || scrolled || open;

  return (
    <header
      onKeyDown={trapFocus}
      // Stays put while page content crossfades (see layout-motion.css).
      style={{ viewTransitionName: "site-header" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-(--ease-editorial)",
        solid
          ? "border-line/70 bg-sand-50/85 text-ink border-b backdrop-blur-xl"
          : "border-b border-transparent text-white",
      )}
    >
      <Container
        className={cn(
          "flex items-center justify-between gap-6 transition-[height] duration-500 ease-(--ease-editorial)",
          scrolled && !open ? "h-15" : "h-18",
        )}
      >
        <Link href="/" aria-label="EtnoJourney" className="logo-link shrink-0">
          <Logo inverted={!solid} priority className="h-10 lg:h-12" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // Underline grows from the left on hover and stays for the active page.
                  "relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-opacity duration-300 xl:px-4",
                  "after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:bg-current xl:after:inset-x-4",
                  "after:scale-x-0 after:transition-transform after:duration-500 after:ease-(--ease-editorial)",
                  "hover:after:scale-x-100 focus-visible:after:scale-x-100",
                  active ? "after:scale-x-100" : "opacity-80 hover:opacity-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          <LocaleSwitcher />
          {user ? (
            <div className="flex items-center gap-1">
              {user.isAdmin && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="px-3 whitespace-nowrap text-current xl:px-4"
                >
                  {/* Icon-only below xl so the header never wraps at 1024-1279px. */}
                  <Link href="/admin" aria-label={t("admin")} title={t("admin")}>
                    <LayoutDashboard aria-hidden />
                    <span className="hidden xl:inline">{t("admin")}</span>
                  </Link>
                </Button>
              )}
              {user.isPartner && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="px-3 whitespace-nowrap text-current xl:px-4"
                >
                  {/* Icon-only below xl so the header never wraps at 1024-1279px. */}
                  <Link href="/partner" aria-label={tp("portal")} title={tp("portal")}>
                    <Handshake aria-hidden />
                    <span className="hidden xl:inline">{tp("portal")}</span>
                  </Link>
                </Button>
              )}
              <Button asChild variant={solid ? "dark" : "glass"} size="sm">
                <Link href="/account" title={user.name}>
                  <UserRound aria-hidden />
                  <span className="max-w-24 truncate xl:max-w-32">{user.name.split(" ")[0]}</span>
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center px-3 text-sm font-medium whitespace-nowrap opacity-80 hover:opacity-100"
              >
                {t("login")}
              </Link>
              <Button
                asChild
                variant={solid ? "primary" : "light"}
                size="sm"
                className="whitespace-nowrap"
              >
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("closeMenu") : t("openMenu")}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </Container>

      <div
        id="mobile-menu"
        ref={menuRef}
        inert={!open}
        className={cn(
          "bg-sand-50 overflow-y-auto overscroll-contain transition-[height,opacity] duration-400 ease-(--ease-editorial) lg:hidden",
          open ? "h-[calc(100dvh-4.5rem)] opacity-100" : "h-0 opacity-0",
        )}
      >
        <Container className="flex flex-col gap-1 py-6 sm:py-8">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "font-display py-2 text-3xl sm:py-3",
                  active ? "text-terracotta" : undefined,
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="bg-line my-6 h-px" />
          {user ? (
            <div className="flex flex-col gap-2 text-base sm:gap-3">
              <p className="text-muted truncate text-sm">{user.name}</p>
              <Link href="/account" className="inline-flex min-h-11 items-center gap-3">
                <Ticket className="text-terracotta size-5" aria-hidden /> {t("bookings")}
              </Link>
              <Link href="/account/wishlist" className="inline-flex min-h-11 items-center gap-3">
                <Heart className="text-terracotta size-5" aria-hidden /> {t("wishlist")}
              </Link>
              {user.isPartner && (
                <Link href="/partner" className="inline-flex min-h-11 items-center gap-3">
                  <Handshake className="text-terracotta size-5" aria-hidden /> {tp("portal")}
                </Link>
              )}
              {user.isAdmin && (
                <Link href="/admin" className="inline-flex min-h-11 items-center gap-3">
                  <LayoutDashboard className="text-terracotta size-5" aria-hidden /> {t("admin")}
                </Link>
              )}
              <SignOutButton className="text-muted min-h-11" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" size="lg">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </div>
          )}
          <LocaleSwitcher className="mt-6 sm:mt-8" />
        </Container>
      </div>
    </header>
  );
}
