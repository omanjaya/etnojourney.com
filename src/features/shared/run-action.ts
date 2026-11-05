import "server-only";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { isDomainError } from "@/server/services/errors";
import { groupFieldErrors, issueParams } from "./field-errors";

/**
 * Wraps a server action body: maps domain errors to translated messages and
 * hides unexpected errors from the client. Next.js redirects are rethrown.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    unstable_rethrow(error);
    const t = await getTranslations("errors");
    if (isDomainError(error)) return fail(t(error.code));
    console.error("[action]", error);
    return fail(t("unexpected"));
  }
}

/** Namespaces that hold field-level validation messages. */
type FieldsNamespace = "errors.fields" | "reviews.fields" | "adminInsights.fields";

/**
 * Validates input with Zod. Schema messages are keys (e.g.
 * `z.string().min(2, "required")`) looked up first in `fieldsNamespace`, then in
 * `errors.fields`, so field errors reach the client already localized. A size
 * check's limit is passed as `{max}` / `{min}` (e.g. "Maksimal {max} karakter.").
 * Field errors are keyed by top-level field and by dotted path
 * (`title.en`, `itinerary.0.title`), see `groupFieldErrors`.
 */
export async function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
  options: { fieldsNamespace?: FieldsNamespace } = {},
): Promise<{ success: true; data: z.infer<S> } | { success: false; result: ActionResult<never> }> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };

  const t = await getTranslations();
  // Message keys are dynamic here; `t.has` guards every lookup.
  type Key = Parameters<typeof t>[0];
  const namespaces = [options.fieldsNamespace, "errors.fields"].filter(
    Boolean,
  ) as FieldsNamespace[];
  const translate = (issue: z.core.$ZodIssue) => {
    for (const ns of namespaces) {
      const full = `${ns}.${issue.message}` as Key;
      if (t.has(full)) return t(full, issueParams(issue));
    }
    return t("errors.fields.invalid");
  };

  const fieldErrors = groupFieldErrors(parsed.error.issues, translate);
  return { success: false, result: fail(t("errors.validation"), fieldErrors) };
}
