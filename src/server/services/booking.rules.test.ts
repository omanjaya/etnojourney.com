import { describe, expect, it } from "vitest";
import {
  assertCapacity,
  assertTransition,
  assertTravelDate,
  calculateTotal,
  canTransition,
  generateBookingCode,
} from "./booking.rules";
import { DomainError } from "./errors";

const codeOf = (fn: () => void) => {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : "unexpected";
  }
  return null;
};

describe("assertTravelDate", () => {
  it("rejects dates closer than the minimum lead time", () => {
    expect(codeOf(() => assertTravelDate("2026-10-03", "2026-10-01"))).toBe("dateTooSoon");
    expect(codeOf(() => assertTravelDate("2026-09-30", "2026-10-01"))).toBe("dateTooSoon");
  });

  it("accepts dates at or beyond the minimum lead time, across month boundaries", () => {
    expect(codeOf(() => assertTravelDate("2026-10-04", "2026-10-01"))).toBeNull();
    expect(codeOf(() => assertTravelDate("2026-11-02", "2026-10-30"))).toBeNull();
  });
});

describe("assertCapacity", () => {
  it("rejects non-positive or fractional participant counts", () => {
    expect(
      codeOf(() => assertCapacity({ requested: 0, alreadyBooked: 0, maxParticipants: 8 })),
    ).toBe("invalidParticipants");
    expect(
      codeOf(() => assertCapacity({ requested: 1.5, alreadyBooked: 0, maxParticipants: 8 })),
    ).toBe("invalidParticipants");
  });

  it("rejects groups larger than the tour allows", () => {
    expect(
      codeOf(() => assertCapacity({ requested: 9, alreadyBooked: 0, maxParticipants: 8 })),
    ).toBe("invalidParticipants");
  });

  it("rejects when existing bookings leave too few seats", () => {
    expect(
      codeOf(() => assertCapacity({ requested: 3, alreadyBooked: 6, maxParticipants: 8 })),
    ).toBe("capacityExceeded");
  });

  it("accepts exactly filling the remaining seats", () => {
    expect(
      codeOf(() => assertCapacity({ requested: 2, alreadyBooked: 6, maxParticipants: 8 })),
    ).toBeNull();
  });
});

describe("status transitions", () => {
  it("allows the admin workflow", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("forbids leaving terminal states or skipping confirmation", () => {
    expect(canTransition("cancelled", "pending")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("pending", "completed")).toBe(false);
    expect(codeOf(() => assertTransition("cancelled", "confirmed"))).toBe("invalidTransition");
  });
});

describe("pricing and codes", () => {
  it("multiplies the server-side unit price", () => {
    expect(calculateTotal(850_000, 3)).toBe(2_550_000);
  });

  it("generates codes in the EJ-XXXXXX format without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateBookingCode()).toMatch(/^EJ-[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
