import { describe, expect, it } from "vitest";
import { addBookingNoteSchema, NOTE_MAX_LENGTH } from "./schemas";

describe("addBookingNoteSchema", () => {
  it("trims the note body", () => {
    const parsed = addBookingNoteSchema.parse({ bookingId: 3, body: "  Guest is vegetarian  " });
    expect(parsed).toEqual({ bookingId: 3, body: "Guest is vegetarian" });
  });

  it("rejects blank notes", () => {
    const result = addBookingNoteSchema.safeParse({ bookingId: 3, body: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("required");
  });

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(
      addBookingNoteSchema.safeParse({ bookingId: 3, body: "a".repeat(NOTE_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(
      addBookingNoteSchema.safeParse({ bookingId: 3, body: "a".repeat(NOTE_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });

  it("rejects a missing or invalid booking id", () => {
    expect(addBookingNoteSchema.safeParse({ bookingId: 0, body: "x" }).success).toBe(false);
    expect(addBookingNoteSchema.safeParse({ body: "x" }).success).toBe(false);
  });
});
