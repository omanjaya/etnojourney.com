/**
 * Matches the `booking_notes_body_length` check constraint. Shared by the
 * schema and the client form; kept zod-free so the form's bundle stays small.
 */
export const NOTE_MAX_LENGTH = 2000;
