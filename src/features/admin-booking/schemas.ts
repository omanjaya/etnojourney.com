import { z } from "zod";

/** Matches the `booking_notes_body_length` check constraint. */
export const NOTE_MAX_LENGTH = 2000;

export const addBookingNoteSchema = z.object({
  bookingId: z.number({ error: "invalid" }).int().positive(),
  body: z.string({ error: "required" }).trim().min(1, "required").max(NOTE_MAX_LENGTH, "invalid"),
});

export type AddBookingNoteInput = z.input<typeof addBookingNoteSchema>;
