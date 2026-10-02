"use server";

import type { ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { bookingService } from "@/server/services/booking.service";
import { revalidate } from "@/features/shared/revalidate";
import { parseInput, runAction } from "@/features/shared/run-action";
import { addBookingNoteSchema, type AddBookingNoteInput } from "./schemas";

/** Adds an internal note to a booking (recorded as `booking.note_added`). */
export async function addBookingNoteAction(
  input: AddBookingNoteInput,
): Promise<ActionResult<{ id: number }>> {
  const parsed = await parseInput(addBookingNoteSchema, input);
  if (!parsed.success) return parsed.result;

  return runAction(async () => {
    const actor = await assertPermission("bookings.manage");
    const { note } = await bookingService.addNote(
      actor.id,
      parsed.data.bookingId,
      parsed.data.body,
    );
    revalidate.admin();
    return { id: note.id };
  });
}
