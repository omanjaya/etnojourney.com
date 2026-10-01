import { describe, expect, it } from "vitest";
import {
  amountMatches,
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
