import { describe, expect, it } from "vitest";
import { KNOWN_PAYMENT_METHODS, paymentMethodLabel } from "./payment-method";

const translate = (code: string) => `label:${code}`;

describe("paymentMethodLabel", () => {
  it("translates every known Midtrans code", () => {
    for (const code of KNOWN_PAYMENT_METHODS) {
      expect(paymentMethodLabel(code, translate)).toBe(`label:${code}`);
    }
  });

  it("normalizes case and whitespace before matching", () => {
    expect(paymentMethodLabel(" BANK_TRANSFER ", translate)).toBe("label:bank_transfer");
  });

  it("title-cases unknown codes instead of shouting short words", () => {
    expect(paymentMethodLabel("direct_debit", translate)).toBe("Direct Debit");
    expect(paymentMethodLabel("new_card_type", translate)).toBe("New Card Type");
  });

  it("returns a dash when there is no method", () => {
    expect(paymentMethodLabel(null, translate)).toBe("-");
    expect(paymentMethodLabel("", translate)).toBe("-");
  });
});
