"use server";

import type { ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/server/db/schema";
import { assertPermission } from "@/server/auth/guards";
import { userService } from "@/server/services/user.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { changeRoleSchema, setDisabledSchema } from "./schemas";

/** Sets a user's role. Self-changes and demoting the last admin are refused by the service. */
export async function changeUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<ActionResult<{ role: UserRole }>> {
  const parsed = await parseInput(changeRoleSchema, { userId, role });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    await userService.changeRole(actor.id, parsed.data.userId, parsed.data.role);
    revalidate.admin();
    return { role: parsed.data.role };
  });
}

/** Disables (and signs out everywhere) or re-enables an account. */
export async function setUserDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult<{ disabled: boolean }>> {
  const parsed = await parseInput(setDisabledSchema, { userId, disabled });
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    await userService.setDisabled(actor.id, parsed.data.userId, parsed.data.disabled);
    revalidate.admin();
    return { disabled: parsed.data.disabled };
  });
}
