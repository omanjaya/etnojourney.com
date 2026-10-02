"use server";

import { getTranslations } from "next-intl/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import { photoCreditService } from "@/server/services/photo-credit.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { createCreditSchema, updateCreditSchema } from "./schemas";

const FIELDS = ["title", "author", "license", "licenseUrl", "sourceUrl", "source"] as const;

/** Only the fields that actually changed, for a compact audit entry. */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return FIELDS.filter((key) => (before[key] ?? null) !== (after[key] ?? null));
}

export async function updateCreditAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ path: string }>> {
  const parsed = await parseInput(updateCreditSchema, input, {
    fieldsNamespace: "adminInsights.fields",
  });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("credits.manage");
    const { path, ...values } = parsed.data;
    const { before, after } = await photoCreditService.update(path, values);
    await auditService.record({
      actorId: actor.id,
      action: "credit.updated",
      entityType: "credit",
      entityId: path,
      details: { change: "updated", fields: changedFields(before, after) },
    });
    // Credits appear on tour/destination pages and on /credits.
    revalidate.everything();
    return { path };
  });
}

export async function createCreditAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ path: string }>> {
  const parsed = await parseInput(createCreditSchema, input, {
    fieldsNamespace: "adminInsights.fields",
  });
  if (!parsed.success) return parsed.result;

  const { path, ...values } = parsed.data;
  const result = await runAction(async () => {
    const actor = await assertPermission("credits.manage");
    const created = await photoCreditService.create(path, values);
    if (created) {
      await auditService.record({
        actorId: actor.id,
        action: "credit.updated",
        entityType: "credit",
        entityId: path,
        details: { change: "created" },
      });
      revalidate.everything();
    }
    return { created: created !== null };
  });
  if (!result.ok) return result;
  if (!result.data.created) {
    const t = await getTranslations("adminInsights.fields");
    return fail(t("creditExists"), { path: [t("creditExists")] });
  }
  return ok({ path });
}
