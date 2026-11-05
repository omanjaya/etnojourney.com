"use server";

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { isAPIError } from "better-auth/api";
import { getPathname, redirect } from "@/i18n/navigation";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { ACCOUNT_DISABLED, auth } from "@/server/auth";
import { resetTokenOwnerIsDisabled } from "@/server/auth/reset-token";
import { parseInput } from "@/features/shared/run-action";
import { createHash } from "node:crypto";
import { proxyConfigFromEnv, resolveClientIp } from "@/server/auth/client-ip";
import { authRateLimiter, normalizeEmail, rateLimitChecks, type AuthAction } from "./rate-limit";
import { safeRedirectPath } from "./safe-redirect";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

type AuthErrorKey =
  | "invalidCredentials"
  | "emailTaken"
  | "tooManyRequests"
  | "invalidToken"
  | "accountDisabled"
  | "generic";

const proxyConfig = proxyConfigFromEnv();

/**
 * Returns a translated failure when the caller exceeded a limit for this action.
 * Counts against the client IP (only if it comes from a trusted proxy) and, when
 * given, the target account, so rotating spoofed IPs can't bypass it.
 */
async function rateLimited(
  action: AuthAction,
  account?: string,
): Promise<ActionResult<never> | null> {
  const ip = resolveClientIp(await headers(), proxyConfig);
  // Every bucket is hit (no short-circuit) so each one keeps an accurate count.
  const results = rateLimitChecks(action, ip, account).map(({ key, rule }) =>
    authRateLimiter.hit(key, rule),
  );
  if (results.every(Boolean)) return null;
  const t = await getTranslations("auth.errors");
  return fail(t("tooManyRequests"));
}

/** Reset tokens are bucketed by hash so raw tokens never sit in memory as keys. */
const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 32);

/** Maps Better Auth errors to safe, translated messages without leaking internals. */
async function authFailure(error: unknown): Promise<ActionResult<never>> {
  const t = await getTranslations("auth.errors");
  let key: AuthErrorKey = "generic";
  if (isAPIError(error)) {
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    if (error.status === 429 || error.statusCode === 429) key = "tooManyRequests";
    else if (code === "INVALID_EMAIL_OR_PASSWORD") key = "invalidCredentials";
    else if (code.startsWith("USER_ALREADY_EXISTS")) key = "emailTaken";
    else if (code === "INVALID_TOKEN") key = "invalidToken";
    // Raised by the session hook only after the password was verified.
    else if (code === ACCOUNT_DISABLED) key = "accountDisabled";
  } else {
    console.error("[auth]", error);
  }
  return fail(t(key));
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = await parseInput(signInSchema, Object.fromEntries(formData));
  if (!parsed.success) return parsed.result;
  const limited = await rateLimited("signIn", normalizeEmail(parsed.data.email));
  if (limited) return limited;
  const { email, password, next } = parsed.data;

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (error) {
    return authFailure(error);
  }

  redirect({ href: safeRedirectPath(next), locale: await getLocale() });
  return { ok: true, data: undefined };
}

export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = await parseInput(signUpSchema, Object.fromEntries(formData));
  if (!parsed.success) return parsed.result;
  const { name, email, password, next } = parsed.data;
  const limited = await rateLimited("signUp", normalizeEmail(email));
  if (limited) return limited;

  try {
    await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
  } catch (error) {
    return authFailure(error);
  }

  redirect({ href: safeRedirectPath(next), locale: await getLocale() });
  return { ok: true, data: undefined };
}

/**
 * Always reports success for a well-formed email, whether or not an account
 * exists, so the form cannot be used to discover registered addresses.
 */
export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = await parseInput(forgotPasswordSchema, Object.fromEntries(formData));
  if (!parsed.success) return parsed.result;
  const limited = await rateLimited("forgotPassword", normalizeEmail(parsed.data.email));
  if (limited) return limited;

  const locale = await getLocale();
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: getPathname({ href: "/reset-password", locale }),
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[auth] password reset request failed", error);
  }
  return ok(undefined);
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = await parseInput(resetPasswordSchema, Object.fromEntries(formData));
  if (!parsed.success) return parsed.result;
  const limited = await rateLimited("resetPassword", tokenKey(parsed.data.token));
  if (limited) return limited;

  try {
    if (await resetTokenOwnerIsDisabled(parsed.data.token)) {
      const t = await getTranslations("auth.errors");
      return fail(t("accountDisabled"));
    }
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
  } catch (error) {
    return authFailure(error);
  }

  redirect({ href: { pathname: "/login", query: { reset: "1" } }, locale: await getLocale() });
  return { ok: true, data: undefined };
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect({ href: "/", locale: await getLocale() });
}
