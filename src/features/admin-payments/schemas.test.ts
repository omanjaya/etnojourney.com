import { describe, expect, it } from "vitest";
import { parseAdminPaymentQuery, recordRefundSchema } from "./schemas";

describe("recordRefundSchema", () => {
  it("accepts a trimmed 3-500 character note", () => {
    const parsed = recordRefundSchema.parse({ paymentId: 4, note: "  BCA ref 123  " });
    expect(parsed.note).toBe("BCA ref 123");
  });

  it("rejects notes that are too short or too long", () => {
    expect(recordRefundSchema.safeParse({ paymentId: 4, note: " ab " }).success).toBe(false);
    expect(recordRefundSchema.safeParse({ paymentId: 4, note: "x".repeat(501) }).success).toBe(
      false,
    );
  });

  it("rejects a non-positive payment id", () => {
    expect(recordRefundSchema.safeParse({ paymentId: 0, note: "BCA ref" }).success).toBe(false);
  });
});

describe("parseAdminPaymentQuery", () => {
  it("keeps valid filters", () => {
    expect(parseAdminPaymentQuery({ q: "EJ-ABC", status: "refunded" })).toEqual({
      q: "EJ-ABC",
      status: "refunded",
    });
  });

  it("drops invalid values instead of failing", () => {
    expect(parseAdminPaymentQuery({ status: "bogus", q: "" })).toEqual({
      q: undefined,
      status: undefined,
    });
  });

  it("takes the first value of repeated params", () => {
    expect(parseAdminPaymentQuery({ status: ["paid", "failed"] }).status).toBe("paid");
  });
});
