import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { DomainError } from "@/server/services/errors";
import { auth, type AuthSession } from "./index";
import { can, type Permission } from "./permissions";

export type SessionUser = AuthSession["user"];

/** Reads the current session once per request. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getSession())?.user ?? null;
}

/** For pages and layouts: redirects to login when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    return redirect({ href: "/login", locale });
  }
  return user;
}

/**
 * For pages and layouts: redirects anyone without `permission` (default:
 * back-office access, i.e. staff or admin) to the home page.
 */
export async function requireAdmin(permission: Permission = "backoffice.access"): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    const locale = await getLocale();
    return redirect({ href: "/", locale });
  }
  return user;
}

/** For server actions and route handlers: throws `forbidden` without `permission`. */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) throw new DomainError("forbidden");
  return user;
}
