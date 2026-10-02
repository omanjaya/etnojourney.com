import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/server/db";
import { routing, type Locale } from "@/i18n/routing";
import { proxyConfigFromEnv } from "./client-ip";

const proxy = proxyConfigFromEnv();

/** Reads the locale from the reset callback path, e.g. `/en/reset-password` -> `en`. */
function localeFromResetUrl(url: string): Locale {
  const callback = new URL(url).searchParams.get("callbackURL") ?? "";
  const segment = callback.split("/")[1];
  return routing.locales.find((l) => l === segment) ?? routing.defaultLocale;
}

/**
 * Locale of the request that is signing up. next-intl's proxy keeps the active
 * locale in the `NEXT_LOCALE` cookie, which our sign-up server action forwards.
 */
function localeFromHeaders(headers: Headers | undefined): Locale {
  const cookie = headers?.get("cookie") ?? "";
  const match = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(cookie);
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return routing.locales.find((l) => l === value) ?? routing.defaultLocale;
}

/** Error code raised when a disabled account tries to start a session. */
export const ACCOUNT_DISABLED = "ACCOUNT_DISABLED";

export const auth = betterAuth({
  appName: "EtnoJourney",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Disabled accounts get no reset email (completion is blocked as well, in
      // resetPasswordAction). The response stays identical either way.
      if ((user as { disabledAt?: Date | null }).disabledAt) return;
      // Imported lazily: this config is also loaded by the seed script, outside Next.js,
      // where `server-only` modules cannot be imported.
      const { notificationService } = await import("@/server/services/notification.service");
      // Not awaited, so response time doesn't reveal whether the account exists.
      void notificationService.passwordReset({
        name: user.name,
        email: user.email,
        resetUrl: url,
        locale: localeFromResetUrl(url),
      });
    },
  },
  user: {
    additionalFields: {
      // `input: false` prevents clients from choosing their own role at sign-up.
      role: { type: "string", required: false, defaultValue: "user", input: false },
      // Set from the request locale at sign-up and from account settings, never from client input.
      locale: { type: "string", required: false, defaultValue: "id", input: false },
      // Set by an admin (users.manage); blocks sign-in. Never client input.
      disabledAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => ({
          data: { ...user, locale: localeFromHeaders(context?.headers) },
        }),
      },
    },
    session: {
      create: {
        /**
         * Every sign-in path ends here, after the password was verified, so a
         * disabled account is refused without revealing anything to someone
         * who doesn't know its password. Fails closed without an auth context.
         */
        before: async (session, context) => {
          const owner = await context?.context.internalAdapter.findUserById(session.userId);
          if (!owner || (owner as { disabledAt?: Date | null }).disabledAt) {
            throw new APIError("FORBIDDEN", {
              code: ACCOUNT_DISABLED,
              message: "This account has been disabled",
            });
          }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Keep the cookie cache OFF: every getSession reads the user row, so role
    // changes and disabling (which deletes sessions) apply on the next request.
    cookieCache: { enabled: false },
  },
  // The UI only uses these through server actions (`auth.api.*`), which apply our
  // own per-account/per-IP limits. Better Auth's HTTP limiter is skipped when no
  // trusted proxy IP is available, so the raw HTTP routes would allow unlimited
  // password guessing; close them. `disabledPaths` only affects the HTTP router,
  // and `/reset-password/:token` (the emailed link) stays available.
  disabledPaths: [
    "/sign-in/email",
    "/sign-up/email",
    "/request-password-reset",
    "/reset-password",
    "/change-password",
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 600, max: 3 },
      "/reset-password": { window: 600, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // Same trust rules as `resolveClientIp`: forwarded headers only count behind a
    // trusted proxy. Otherwise IPs aren't tracked and limits use a shared bucket.
    ipAddress: proxy.trustProxy
      ? { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"], trustedProxies: proxy.trustedProxies }
      : { disableIpTracking: true },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
