"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { guideService } from "@/server/services/guide.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { guideFormSchema, guideIdSchema, linkAccountSchema, type GuideFormValues } from "./schemas";

/** Creates a guide, then opens its edit page (where an admin can link an account). */
export async function createGuideAction(values: GuideFormValues): Promise<ActionResult<never>> {
  const parsed = await parseInput(guideFormSchema, values);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("guides.manage");
    const { id } = await guideService.create(actor.id, parsed.data);
    revalidate.admin();
    return redirect({ href: `/admin/guides/${id}/edit`, locale: await getLocale() });
  });
}

export async function updateGuideAction(
  guideId: number,
  values: GuideFormValues,
): Promise<ActionResult<undefined>> {
  const parsed = await parseInput(guideFormSchema, values);
  if (!parsed.success) return parsed.result;
  const id = await parseInput(guideIdSchema, guideId);
  if (!id.success) return id.result;

  return runAction(async () => {
    const actor = await assertPermission("guides.manage");
    await guideService.update(actor.id, id.data, parsed.data);
    revalidate.admin();
    return undefined;
  });
}

/**
 * Links an existing account as the guide's partner portal login (admins only:
 * it changes the account's role). The service re-checks everything under locks.
 */
export async function linkGuideAccountAction(
  guideId: number,
  email: string,
): Promise<ActionResult<undefined>> {
  const parsed = await parseInput(linkAccountSchema, { guideId, email });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    await guideService.linkAccount(actor.id, parsed.data.guideId, parsed.data.email);
    revalidate.admin();
    return undefined;
  });
}

/** Removes the portal account; a partner goes back to traveller and is signed out. */
export async function unlinkGuideAccountAction(guideId: number): Promise<ActionResult<undefined>> {
  const parsed = await parseInput(guideIdSchema, guideId);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    await guideService.unlinkAccount(actor.id, parsed.data);
    revalidate.admin();
    return undefined;
  });
}
