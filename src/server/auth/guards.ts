import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { DomainError } from "@/server/services/errors";
import { auth, type AuthSession } from "./index";
import { can, type Permission } from "./permissions";

export type SessionUser = AuthSession["user"];

/**
 * A disabled account counts as signed out. Disabling also deletes its sessions,
 * so this only matters for a session created in the instant before that.
 */
export function activeSession(session: AuthSession | null): AuthSession | null {
  return session && !session.user.disabledAt ? session : null;
}

/** Reads the current session once per request. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return activeSession(await auth.api.getSession({ headers: await headers() }));
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
export async function requireAdmin(
  permission: Permission = "backoffice.access",
): Promise<SessionUser> {
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

/**
 * For partner portal pages: redirects to login without a session and to the
 * home page for anyone who isn't a partner. Reads must still be scoped to the
 * returned user's own guide (see partner.service.ts).
 */
export async function requirePartner(): Promise<SessionUser> {
  return requireAdmin("partner.portal");
}
