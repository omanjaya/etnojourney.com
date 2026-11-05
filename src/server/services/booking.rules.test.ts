import { describe, expect, it } from "vitest";
import {
  adminStatusOptions,
  assertCanComplete,
  assertCapacity,
  assertTransition,
  assertTravelDate,
  calculateTotal,
  canComplete,
  canTransition,
  generateBookingCode,
  isStaleHold,
  phoneSearchDigits,
  type BookingHold,
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

describe("completing a booking", () => {
  it("is allowed from the travel date onwards", () => {
    expect(canComplete("2026-11-05", "2026-11-05")).toBe(true);
    expect(canComplete("2026-10-31", "2026-11-05")).toBe(true);
    expect(codeOf(() => assertCanComplete("2026-11-05", "2026-11-05"))).toBeNull();
  });

  it("is refused before the trip has started", () => {
    expect(canComplete("2026-11-06", "2026-11-05")).toBe(false);
    expect(codeOf(() => assertCanComplete("2027-01-20", "2026-11-05"))).toBe("tripNotStarted");
  });

  it("hides 'completed' from the admin options until the travel date", () => {
    const today = "2026-11-05";
    expect(adminStatusOptions({ status: "confirmed", travelDate: "2026-12-20" }, today)).toEqual([
      "cancelled",
    ]);
    expect(adminStatusOptions({ status: "confirmed", travelDate: today }, today)).toEqual([
      "completed",
      "cancelled",
    ]);
    expect(adminStatusOptions({ status: "pending", travelDate: "2026-12-20" }, today)).toEqual([
      "confirmed",
      "cancelled",
    ]);
    expect(adminStatusOptions({ status: "completed", travelDate: "2026-10-01" }, today)).toEqual(
      [],
    );
  });
});

describe("isStaleHold", () => {
  // 10:00 in Jakarta on 5 Nov 2026.
  const now = new Date("2026-11-05T03:00:00Z");
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  const hold = (overrides: Partial<BookingHold> = {}): BookingHold => ({
    status: "pending",
    travelDate: "2026-11-20",
    createdAt: hoursAgo(49),
    hasPaid: false,
    pendingPaymentAt: null,
    ...overrides,
  });

  it("releases unpaid pending bookings older than the hold time", () => {
    expect(isStaleHold(hold(), now)).toBe(true);
    expect(isStaleHold(hold({ createdAt: hoursAgo(48) }), now)).toBe(true);
  });

  it("keeps recent bookings", () => {
    expect(isStaleHold(hold({ createdAt: hoursAgo(47) }), now)).toBe(false);
  });

  it("never releases paid or non-pending bookings", () => {
    expect(isStaleHold(hold({ hasPaid: true }), now)).toBe(false);
    expect(isStaleHold(hold({ status: "confirmed" }), now)).toBe(false);
    expect(isStaleHold(hold({ status: "cancelled", travelDate: "2026-11-01" }), now)).toBe(false);
  });

  it("waits while a payment is still in progress at the gateway", () => {
    expect(isStaleHold(hold({ pendingPaymentAt: hoursAgo(2) }), now)).toBe(false);
    // A pending attempt older than a day has expired at the gateway.
    expect(isStaleHold(hold({ pendingPaymentAt: hoursAgo(25) }), now)).toBe(true);
  });

  it("releases bookings whose travel date has passed (they can't be paid any more)", () => {
    const past = { travelDate: "2026-11-04", createdAt: hoursAgo(5) };
    expect(isStaleHold(hold(past), now)).toBe(true);
    expect(isStaleHold(hold({ ...past, pendingPaymentAt: hoursAgo(1) }), now)).toBe(true);
    // The travel date itself is still payable.
    expect(isStaleHold(hold({ travelDate: "2026-11-05", createdAt: hoursAgo(5) }), now)).toBe(
      false,
    );
  });

  it("uses the Jakarta date for 'passed'", () => {
    // 23:30 UTC on 4 Nov is already 5 Nov in Jakarta.
    const lateUtc = new Date("2026-11-04T23:30:00Z");
    const recent = new Date(lateUtc.getTime() - 3_600_000);
    expect(isStaleHold(hold({ travelDate: "2026-11-04", createdAt: recent }), lateUtc)).toBe(true);
  });
});

describe("phoneSearchDigits", () => {
  it("normalizes local and international forms to the same digits", () => {
    expect(phoneSearchDigits("081234567890")).toBe("81234567890");
    expect(phoneSearchDigits("6281234567890")).toBe("81234567890");
    expect(phoneSearchDigits("+62 812-3456-7890")).toBe("81234567890");
    expect(phoneSearchDigits("(0812) 3456 7890")).toBe("81234567890");
  });

  it("keeps partial numbers searchable", () => {
    expect(phoneSearchDigits("34567890")).toBe("34567890");
  });

  it("ignores text and very short numbers", () => {
    expect(phoneSearchDigits("EJ-7K2Q9A")).toBeNull();
    expect(phoneSearchDigits("Nadia")).toBeNull();
    expect(phoneSearchDigits("0812")).toBeNull();
    expect(phoneSearchDigits("   ")).toBeNull();
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

  it("maps every byte value onto the 32-character alphabet evenly", () => {
    const counts = new Map<string, number>();
    for (let byte = 0; byte < 256; byte++) {
      const code = generateBookingCode(() => new Uint8Array(6).fill(byte)).slice(3, 4);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    expect(counts.size).toBe(32);
    expect(new Set(counts.values())).toEqual(new Set([8]));
  });
});
