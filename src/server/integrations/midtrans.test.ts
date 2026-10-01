import { describe, expect, it, vi } from "vitest";
import { buildSnapPayload, createSnapTransaction, MidtransError, snapEndpoint } from "./midtrans";

const input = {
  orderId: "EJ-ABC234-1",
  grossAmount: 2_800_000,
  customer: { name: "Nadia Putri Lestari", email: "n@example.com", phone: "0812" },
  item: { id: "tour-6", name: "A".repeat(80), price: 1_400_000, quantity: 2 },
  finishUrl: "http://localhost:3000/payment/finish",
};

describe("midtrans client", () => {
  it("builds a payload whose item total equals the gross amount", () => {
    const payload = buildSnapPayload(input);
    const [item] = payload.item_details;
    expect(item.price * item.quantity).toBe(payload.transaction_details.gross_amount);
    expect(item.name).toHaveLength(50);
    expect(payload.customer_details).toMatchObject({
      first_name: "Nadia",
      last_name: "Putri Lestari",
    });
  });

  it("targets sandbox unless production is enabled", () => {
    expect(snapEndpoint(false)).toContain("sandbox");
    expect(snapEndpoint(true)).not.toContain("sandbox");
  });

  it("sends basic auth and returns the redirect url", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ token: "t", redirect_url: "https://pay" }), { status: 201 }),
      );
    const result = await createSnapTransaction(
      { serverKey: "key", isProduction: false },
      input,
      fetchMock,
    );
    expect(result).toEqual({ token: "t", redirectUrl: "https://pay" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("key:").toString("base64")}`);
  });

  it("throws a MidtransError on gateway errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error_messages: ["bad"] }), { status: 400 }),
      );
    await expect(
      createSnapTransaction({ serverKey: "key", isProduction: false }, input, fetchMock),
    ).rejects.toBeInstanceOf(MidtransError);
  });
});
