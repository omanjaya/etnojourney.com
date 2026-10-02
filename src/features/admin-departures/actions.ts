"use server";

import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { departureService } from "@/server/services/departure.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import {
  assignGuideSchema,
  departureKeySchema,
  departureNoteSchema,
  type AssignGuideInput,
  type DepartureKeyInput,
  type DepartureNoteInput,
} from "./schemas";

/** Assigns or unassigns the departure's guide (`departure.assigned` / `.unassigned`). */
export async function assignGuideAction(
  input: AssignGuideInput,
): Promise<ActionResult<{ changed: boolean }>> {
  const parsed = await parseInput(assignGuideSchema, input);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("departures.manage");
    const { guideId, ...key } = parsed.data;
    const result = await departureService.assignGuide(actor.id, key, guideId);
    revalidate.admin();
    return result;
  });
}

/** Saves the operational note shared with the guide (`departure.noted`). */
export async function saveDepartureNoteAction(
  input: DepartureNoteInput,
): Promise<ActionResult<{ changed: boolean }>> {
  const parsed = await parseInput(departureNoteSchema, input);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("departures.manage");
    const { note, ...key } = parsed.data;
    const result = await departureService.saveNote(actor.id, key, note);
    revalidate.admin();
    return result;
  });
}

/** Emails the manifest to the assigned guide (`departure.notified`). */
export async function sendManifestAction(
  input: DepartureKeyInput,
): Promise<ActionResult<{ email: string }>> {
  const parsed = await parseInput(departureKeySchema, input);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("departures.manage");
    const result = await departureService.sendManifest(actor.id, parsed.data);
    revalidate.admin();
    return result;
  });
}
