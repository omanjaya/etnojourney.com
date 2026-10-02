import { z } from "zod";

/**
 * Server environment contract. Validated once at startup by
 * `src/instrumentation.ts`, so a misconfigured deploy fails before serving
 * traffic. Error messages name the variable and the problem, never the value.
 */

const booleanString = z.enum(["true", "false"]);
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));
const optionalUrl = optionalString.pipe(z.url().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string({ error: "is required" })
    .refine((value) => /^postgres(ql)?:\/\//.test(value), "must be a postgres:// connection URL"),
  BETTER_AUTH_SECRET: z
    .string({ error: "is required" })
    .min(32, "must be at least 32 characters (generate with: openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url({ error: "must be an absolute URL, e.g. https://etnojourney.id" }),
  SITE_URL: optionalUrl,
  MIDTRANS_SERVER_KEY: optionalString,
  MIDTRANS_IS_PRODUCTION: booleanString.default("false"),
  RESEND_API_KEY: optionalString,
  CONTACT_EMAIL: optionalString,
  CONTACT_PHONE: optionalString,
  CONTACT_ADDRESS: optionalString,
  MAIL_FROM: optionalString,
  UPLOAD_DIR: optionalString,
  TRUST_PROXY: booleanString.default("false"),
  TRUSTED_PROXIES: optionalString,
});

export type Env = z.infer<typeof schema>;

export type EnvCheck =
  { ok: true; env: Env; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] };

/** Pure validation (no side effects), used by startup and tests. */
export function checkEnv(source: Record<string, string | undefined>): EnvCheck {
  const parsed = schema.safeParse(source);
  const warnings: string[] = [];

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const name = issue.path.join(".") || "(root)";
      const message = issue.code === "invalid_type" ? "is required" : issue.message;
      return `${name} ${message}`;
    });
    return { ok: false, errors, warnings };
  }

  const env = parsed.data;
  // Production-only requirements apply to the running server, not to
  // `next build` (prerendering may read env, but deploy values come later).
  const isBuild = source.NEXT_PHASE === "phase-production-build";
  if (env.NODE_ENV === "production" && !isBuild) {
    const errors: string[] = [];
    if (!env.SITE_URL) errors.push("SITE_URL is required in production (public site URL)");
    if (!env.BETTER_AUTH_URL.startsWith("https://")) {
      warnings.push("BETTER_AUTH_URL does not use https; secure cookies require HTTPS");
    }
    if (!env.MIDTRANS_SERVER_KEY) {
      warnings.push("MIDTRANS_SERVER_KEY is not set; online payments will be refused");
    }
    if (!env.CONTACT_EMAIL) {
      warnings.push(
        "CONTACT_EMAIL is not set; the site shows no contact details (FAQ and policies refer guests to contact you)",
      );
    }
    if (!env.RESEND_API_KEY) {
      warnings.push("RESEND_API_KEY is not set; emails will not be delivered");
    }
    if (errors.length) return { ok: false, errors, warnings };
  }
  if (env.TRUSTED_PROXIES && env.TRUST_PROXY !== "true") {
    warnings.push("TRUSTED_PROXIES is set but TRUST_PROXY is not true; it will be ignored");
  }

  return { ok: true, env, warnings };
}

let cached: Env | undefined;

/** Typed, validated environment. Throws with a readable list when invalid. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = checkEnv(process.env);
  if (!result.ok) {
    throw new Error(
      `Invalid environment configuration:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
  cached = result.env;
  return cached;
}
