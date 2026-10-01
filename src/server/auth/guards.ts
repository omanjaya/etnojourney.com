import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth, type AuthSession } from "./index";

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

/** For pages and layouts: redirects non-admins to the home page. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    const locale = await getLocale();
    return redirect({ href: "/", locale });
  }
  return user;
}
