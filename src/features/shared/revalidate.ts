import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Route patterns for `revalidatePath`. They must mirror the file structure,
 * including route groups such as `(site)`, or the call silently does nothing.
 */
const routes = {
  /** Every page under a locale (layout scope). */
  everything: "/[locale]",
  home: "/[locale]/(site)",
  account: "/[locale]/(site)/account",
  wishlist: "/[locale]/(site)/account/wishlist",
  tourDetail: "/[locale]/(site)/tours/[slug]",
  admin: "/[locale]/admin",
} as const;

export const revalidate = {
  /** All public and admin pages, e.g. after catalogue edits. */
  everything: () => revalidatePath(routes.everything, "layout"),
  home: () => revalidatePath(routes.home, "page"),
  /** Booking list and wishlist under the account layout. */
  account: () => revalidatePath(routes.account, "layout"),
  wishlist: () => revalidatePath(routes.wishlist, "page"),
  tourDetails: () => revalidatePath(routes.tourDetail, "page"),
  admin: () => revalidatePath(routes.admin, "layout"),
};
