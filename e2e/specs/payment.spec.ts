import { expect, test } from "@playwright/test";
import { ACCOUNTS, MIDTRANS_TEST_KEY } from "../support/env";
import {
  bookingStatus,
  createBooking,
  createPendingPayment,
  midtransSignature,
  paymentStatus,
} from "../support/db";

/**
 * The Midtrans webhook is exercised against the production build. Starting a
 * payment through the UI would call the real Midtrans API (the server runs
 * with a dummy key), so the pending payment row is arranged directly in the
 * test database and only the notification is sent over HTTP — the same path
 * Midtrans uses in production.
 */
test.describe("Midtrans webhook", () => {
  async function arrange() {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "tenun-rangrang-dan-tebing-penida",
    });
    const orderId = await createPendingPayment(booking.id, booking.total, booking.code);
    return { booking, orderId, grossAmount: `${booking.total}.00` };
  }

  test("rejects notifications with a bad signature", async ({ request }) => {
    const { booking, orderId, grossAmount } = await arrange();
    const response = await request.post("/api/payments/midtrans", {
      data: {
        order_id: orderId,
        status_code: "200",
        gross_amount: grossAmount,
        transaction_status: "settlement",
        signature_key: "forged",
      },
    });
    expect(response.status()).toBe(403);
    expect(await paymentStatus(orderId)).toBe("pending");
    expect(await bookingStatus(booking.code)).toBe("pending");
  });

  test("a valid settlement marks the payment paid and confirms the booking, idempotently", async ({
    request,
  }) => {
    const { booking, orderId, grossAmount } = await arrange();
    const notification = {
      order_id: orderId,
      status_code: "200",
      gross_amount: grossAmount,
      transaction_status: "settlement",
      payment_type: "qris",
      signature_key: midtransSignature(orderId, "200", grossAmount, MIDTRANS_TEST_KEY),
    };

    const first = await request.post("/api/payments/midtrans", { data: notification });
    expect(first.status()).toBe(200);
    expect(await paymentStatus(orderId)).toBe("paid");
    expect(await bookingStatus(booking.code)).toBe("confirmed");

    const replay = await request.post("/api/payments/midtrans", { data: notification });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).result).toBe("ignored");
  });

  test("a tampered amount is rejected", async ({ request }) => {
    const { orderId } = await arrange();
    const gross = "1.00";
    const response = await request.post("/api/payments/midtrans", {
      data: {
        order_id: orderId,
        status_code: "200",
        gross_amount: gross,
        transaction_status: "settlement",
        signature_key: midtransSignature(orderId, "200", gross, MIDTRANS_TEST_KEY),
      },
    });
    // Whatever the response code, a mismatched amount must never mark it paid.
    expect(response.status()).toBeLessThan(500);
    expect(await paymentStatus(orderId)).toBe("pending");
  });
});
