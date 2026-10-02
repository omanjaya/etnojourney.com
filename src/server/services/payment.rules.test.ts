import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import {
  amountMatches,
  assertRefundable,
  canRecordRefund,
  isRefundReason,
  refundAgeDays,
  refundDue,
  refundReasonForPaidNotification,
  buildOrderId,
  computeSignature,
  isReusable,
  mapTransactionStatus,
  resolvePaymentStatus,
  verifySignature,
  type GatewayNotification,
} from "./payment.rules";

const KEY = "SB-Mid-server-test";
const base: GatewayNotification = {
  order_id: "EJ-ABC234-1712345678",
  status_code: "200",
  gross_amount: "1400000.00",
  transaction_status: "settlement",
};

describe("verifySignature", () => {
  it("matches the documented SHA-512 recipe", () => {
    const signature = computeSignature(base.order_id, "200", "1400000.00", KEY);
    expect(signature).toMatch(/^[0-9a-f]{128}$/);
    expect(verifySignature({ ...base, signature_key: signature }, KEY)).toBe(true);
  });

  it("rejects a wrong key, a tampered amount, or a missing signature", () => {
    const signature = computeSignature(base.order_id, "200", "1400000.00", KEY);
    expect(verifySignature({ ...base, signature_key: signature }, "other-key")).toBe(false);
    expect(verifySignature({ ...base, gross_amount: "1.00", signature_key: signature }, KEY)).toBe(
      false,
    );
    expect(verifySignature(base, KEY)).toBe(false);
    expect(verifySignature({ ...base, signature_key: "short" }, KEY)).toBe(false);
  });
});

describe("mapTransactionStatus", () => {
  it.each([
    ["settlement", undefined, "paid"],
    ["capture", "accept", "paid"],
    ["capture", "challenge", "pending"],
    ["pending", undefined, "pending"],
    ["expire", undefined, "expired"],
    ["deny", undefined, "failed"],
    ["cancel", undefined, "failed"],
    ["failure", undefined, "failed"],
    ["something-new", undefined, "pending"],
  ] as const)("%s/%s -> %s", (status, fraud, expected) => {
    expect(mapTransactionStatus(status, fraud)).toBe(expected);
  });
});

describe("helpers", () => {
  it("compares gateway amounts against integer rupiah", () => {
    expect(amountMatches("1400000.00", 1_400_000)).toBe(true);
    expect(amountMatches("1400000", 1_400_000)).toBe(true);
    expect(amountMatches("1399999.00", 1_400_000)).toBe(false);
    expect(amountMatches("abc", 1_400_000)).toBe(false);
  });

  it("builds fresh order ids per attempt within Midtrans' 50-char limit", () => {
    const id = buildOrderId("EJ-ABC234", 1_712_345_678_000);
    expect(id).toBe("EJ-ABC234-1712345678000");
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it("reuses only recent pending sessions with a redirect url", () => {
    const now = Date.now();
    const fresh = {
      status: "pending" as const,
      redirectUrl: "https://x",
      createdAt: new Date(now - 60_000),
    };
    expect(isReusable(fresh, now)).toBe(true);
    expect(isReusable({ ...fresh, createdAt: new Date(now - 24 * 3_600_000) }, now)).toBe(false);
    expect(isReusable({ ...fresh, status: "failed" }, now)).toBe(false);
    expect(isReusable({ ...fresh, redirectUrl: null }, now)).toBe(false);
  });
});

describe("resolvePaymentStatus", () => {
  const base = { transaction_status: "settlement", fraud_status: "accept" };

  it("accepts a paid outcome only with the signed success status code", () => {
    expect(resolvePaymentStatus({ ...base, status_code: "200" })).toBe("paid");
    expect(
      resolvePaymentStatus({ ...base, transaction_status: "capture", status_code: "200" }),
    ).toBe("paid");
  });

  it("downgrades a paid outcome whose status code disagrees", () => {
    expect(resolvePaymentStatus({ ...base, status_code: "201" })).toBe("pending");
    expect(resolvePaymentStatus({ ...base, status_code: "202" })).toBe("pending");
  });

  it("leaves non-paid outcomes unchanged", () => {
    expect(resolvePaymentStatus({ transaction_status: "expire", status_code: "202" })).toBe(
      "expired",
    );
    expect(resolvePaymentStatus({ transaction_status: "deny", status_code: "202" })).toBe("failed");
    expect(resolvePaymentStatus({ transaction_status: "pending", status_code: "201" })).toBe(
      "pending",
    );
  });
});

describe("refundReasonForPaidNotification", () => {
  it("flags a second successful charge as a duplicate", () => {
    expect(refundReasonForPaidNotification({ alreadyPaid: true, bookingStatus: "confirmed" })).toBe(
      "duplicate",
    );
    // Duplicate wins even when the booking was later cancelled.
    expect(refundReasonForPaidNotification({ alreadyPaid: true, bookingStatus: "cancelled" })).toBe(
      "duplicate",
    );
  });

  it("flags money that arrived for a cancelled booking", () => {
    expect(
      refundReasonForPaidNotification({ alreadyPaid: false, bookingStatus: "cancelled" }),
    ).toBe("cancelledBooking");
  });

  it("does not flag a normal first payment", () => {
    for (const status of ["pending", "confirmed", "completed"] as const) {
      expect(refundReasonForPaidNotification({ alreadyPaid: false, bookingStatus: status })).toBe(
        null,
      );
    }
    expect(
      refundReasonForPaidNotification({ alreadyPaid: false, bookingStatus: undefined }),
    ).toBeNull();
  });
});

describe("canRecordRefund / assertRefundable", () => {
  it("only allows refunding a paid payment that is flagged for refund", () => {
    expect(canRecordRefund({ status: "paid", refundRequired: true })).toBe(true);
    for (const status of ["pending", "failed", "expired", "refunded"] as const) {
      expect(canRecordRefund({ status, refundRequired: true })).toBe(false);
      expect(() => assertRefundable({ status, refundRequired: true })).toThrow(DomainError);
    }
    expect(() => assertRefundable({ status: "paid", refundRequired: true })).not.toThrow();
  });

  it("refuses a paid payment of a live booking (not flagged)", () => {
    expect(canRecordRefund({ status: "paid", refundRequired: false })).toBe(false);
  });

  it("raises the notRefundable code", () => {
    try {
      assertRefundable({ status: "refunded", refundRequired: false });
      expect.unreachable();
    } catch (error) {
      expect((error as DomainError).code).toBe("notRefundable");
    }
  });
});

describe("isRefundReason", () => {
  it("accepts known reasons only", () => {
    expect(isRefundReason("duplicate")).toBe(true);
    expect(isRefundReason("cancelledBooking")).toBe(true);
    expect(isRefundReason("cancelledAfterPayment")).toBe(true);
    expect(isRefundReason("other")).toBe(false);
    expect(isRefundReason(undefined)).toBe(false);
  });
});

describe("refundAgeDays", () => {
  const since = new Date("2026-10-01T10:00:00Z");
  it("counts whole days waited", () => {
    expect(refundAgeDays(since, new Date("2026-10-01T23:00:00Z"))).toBe(0);
    expect(refundAgeDays(since, new Date("2026-10-02T10:00:00Z"))).toBe(1);
    expect(refundAgeDays(since, new Date("2026-10-08T09:59:59Z"))).toBe(6);
  });
  it("never goes negative on clock skew", () => {
    expect(refundAgeDays(since, new Date("2026-09-30T00:00:00Z"))).toBe(0);
  });
});

describe("refundDue", () => {
  it("is the full payment when no partial amount is stored", () => {
    expect(refundDue({ amount: 1_400_000, refundAmount: null })).toEqual({
      amount: 1_400_000,
      partial: false,
      percent: 100,
    });
  });

  it("is the stored amount for a partial refund, with its share", () => {
    expect(refundDue({ amount: 1_400_000, refundAmount: 700_000 })).toEqual({
      amount: 700_000,
      partial: true,
      percent: 50,
    });
    // Rounded-down rupiah still reads as the policy percentage.
    expect(refundDue({ amount: 900_001, refundAmount: 450_000 }).percent).toBe(50);
  });

  it("never asks for more than was paid", () => {
    expect(refundDue({ amount: 500_000, refundAmount: 600_000 })).toEqual({
      amount: 500_000,
      partial: false,
      percent: 100,
    });
  });
});
