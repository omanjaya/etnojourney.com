import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, MIDTRANS_TEST_KEY, STORAGE_STATE } from "../support/env";
import {
  bookingStatus,
  createBooking,
  createPendingPayment,
  midtransSignature,
  paymentStatus,
  sql,
} from "../support/db";

/**
 * Refund queue on /admin/payments. Payments are arranged directly in the test
 * database (a real checkout would call Midtrans); the cancellation and the
 * refund itself go through the admin UI, and the webhook case goes through
 * the same HTTP endpoint Midtrans uses.
 */

/** A confirmed booking with a settled (paid) payment, as after a normal checkout. */
async function paidBooking() {
  const booking = await createBooking({
    email: ACCOUNTS.traveler.email,
    tourSlug: "tenun-rangrang-dan-tebing-penida",
    status: "confirmed",
  });
  const orderId = `${booking.code}-${Date.now()}`;
  await sql`
    insert into payments (booking_id, provider, order_id, amount, status, method, paid_at)
    values (${booking.id}, 'midtrans', ${orderId}, ${booking.total}, 'paid', 'qris', now())`;
  return { booking, orderId };
}

async function refundState(orderId: string) {
  const [row] = await sql<
    {
      status: string;
      refundRequired: boolean;
      refundNote: string | null;
      refundedAt: Date | null;
      refundedBy: string | null;
    }[]
  >`
    select status, refund_required as "refundRequired", refund_note as "refundNote",
           refunded_at as "refundedAt", refunded_by as "refundedBy"
    from payments where order_id = ${orderId}`;
  return row;
}

async function auditReason(orderId: string): Promise<unknown> {
  const [row] = await sql<{ reason: unknown }[]>`
    select a.details->>'reason' as reason
    from audit_logs a join payments p on a.entity_id = p.id::text
    where a.action = 'payment.refund_required' and a.entity_type = 'payment'
      and p.order_id = ${orderId}
    order by a.created_at desc limit 1`;
  return row?.reason;
}

function queueItem(page: Page, code: string) {
  return page.getByTestId("refund-queue-item").filter({ hasText: code });
}

test.describe("admin payments and refunds", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("a booking cancelled after payment is queued and can be marked refunded", async ({
    page,
  }) => {
    const { booking, orderId } = await paidBooking();

    // Cancel through the admin bookings list (the confirm() prompt is accepted).
    await page.goto(`/admin/bookings?q=${booking.code}`);
    const row = page.locator("tr, li").filter({ hasText: booking.code }).filter({ visible: true });
    page.once("dialog", (dialog) => dialog.accept());
    await row.first().getByRole("button", { name: "Batalkan" }).click();
    await expect.poll(() => bookingStatus(booking.code)).toBe("cancelled");
    await expect.poll(async () => (await refundState(orderId)).refundRequired).toBe(true);
    expect(await auditReason(orderId)).toBe("cancelledAfterPayment");

    await page.goto("/admin/payments");
    const item = queueItem(page, booking.code);
    await expect(item).toBeVisible();
    await expect(item).toContainText("Booking dibatalkan setelah dibayar");
    await expect(item.getByRole("link", { name: booking.code })).toHaveAttribute(
      "href",
      new RegExp(`/admin/bookings/${booking.code}$`),
    );

    await item.getByRole("button", { name: /Catat refund/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Too short a reference is rejected with a field error.
    await dialog.getByLabel("Referensi refund").fill("ab");
    await dialog.getByRole("button", { name: "Tandai sudah dikembalikan" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(await paymentStatus(orderId)).toBe("paid");

    await dialog.getByLabel("Referensi refund").fill("BCA ref E2E-123456");
    await dialog.getByRole("button", { name: "Tandai sudah dikembalikan" }).click();

    await expect.poll(() => paymentStatus(orderId)).toBe("refunded");
    const state = await refundState(orderId);
    expect(state.refundRequired).toBe(false);
    expect(state.refundNote).toBe("BCA ref E2E-123456");
    expect(state.refundedAt).not.toBeNull();
    expect(state.refundedBy).not.toBeNull();

    await expect(queueItem(page, booking.code)).toHaveCount(0);

    // The full list shows it under the "refunded" filter.
    await page.goto(`/admin/payments?status=refunded&q=${booking.code}`);
    await expect(page.getByText(orderId).filter({ visible: true }).first()).toBeVisible();
  });

  test("a payment settling after the booking was cancelled is flagged for refund", async ({
    request,
  }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "tenun-rangrang-dan-tebing-penida",
      status: "cancelled",
    });
    const orderId = await createPendingPayment(booking.id, booking.total, booking.code);
    const grossAmount = `${booking.total}.00`;

    const response = await request.post("/api/payments/midtrans", {
      data: {
        order_id: orderId,
        status_code: "200",
        gross_amount: grossAmount,
        transaction_status: "settlement",
        payment_type: "qris",
        signature_key: midtransSignature(orderId, "200", grossAmount, MIDTRANS_TEST_KEY),
      },
    });
    expect(response.status()).toBe(200);
    expect(await bookingStatus(booking.code)).toBe("cancelled");
    const state = await refundState(orderId);
    expect(state.status).toBe("paid");
    expect(state.refundRequired).toBe(true);
    expect(await auditReason(orderId)).toBe("cancelledBooking");
  });
});

test.describe("admin payments access", () => {
  test.use({ storageState: STORAGE_STATE.traveler });

  test("travellers cannot open the payments page", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page).not.toHaveURL(/\/admin\/payments/);
  });
});
