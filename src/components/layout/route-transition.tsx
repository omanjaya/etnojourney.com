"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Crossfades page content on navigation only.
 *
 * Layouts persist across navigations, so an unkeyed <ViewTransition> would
 * play its "update" animation on every server action or refresh that changes
 * the DOM (wishlist toggles, admin switches, form submits). Keying by pathname
 * turns real navigations into exit/enter pairs and disables updates.
 * Search-param changes (e.g. filters) keep the same key and do not animate.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-content" exit="page-content" default="none">
      {children}
    </ViewTransition>
  );
}
