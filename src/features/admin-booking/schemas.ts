import { z } from "zod";
import { NOTE_MAX_LENGTH } from "./limits";

export { NOTE_MAX_LENGTH };

export const addBookingNoteSchema = z.object({
  bookingId: z.number({ error: "invalid" }).int().positive(),
  body: z.string({ error: "required" }).trim().min(1, "required").max(NOTE_MAX_LENGTH, "invalid"),
});

export type AddBookingNoteInput = z.input<typeof addBookingNoteSchema>;
