import { randomInt } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { bookingStatus, createBooking, jakartaDate, sql } from "../support/db";
import { showCalendarDate } from "../support/calendar";

/**
 * Traveller self-service from /account/bookings/[code]: cancelling a paid
 * booking under the policy tiers (src/config/cancellation.ts defaults:
 * 14+ days 100%, 7-13 days 50%, under 7 days 0%) and moving a booking to
 * another date (once per booking). Every test arranges its own bookings.
 */

const TOUR = "tenun-rangrang-dan-tebing-penida";

/** A confirmed booking with a settled payment, `days` ahead (Asia/Jakarta). */
async function paidBooking(days: number) {
  const booking = await createBooking({
    email: ACCOUNTS.traveler.email,
    tourSlug: TOUR,
    status: "confirmed",
    travelDate: jakartaDate(days),
  });
  const orderId = `${booking.code}-${Date.now()}`;
  await sql`
    insert into payments (booking_id, provider, order_id, amount, status, method, paid_at)
    values (${booking.id}, 'midtrans', ${orderId}, ${booking.total}, 'paid', 'qris', now())`;
  return { booking, orderId };
}

async function refundState(orderId: string) {
  const [row] = await sql<
    { status: string; refundRequired: boolean; refundAmount: number | null }[]
  >`
    select status, refund_required as "refundRequired", refund_amount as "refundAmount"
    from payments where order_id = ${orderId}`;
  return row;
}

async function auditDetails(code: string, action: string) {
  const [row] = await sql<{ details: Record<string, unknown>; actorId: string | null }[]>`
    select a.details, a.actor_id as "actorId"
    from audit_logs a join bookings b on a.entity_id = b.id::text
    where a.entity_type = 'booking' and a.action = ${action} and b.code = ${code}
    order by a.created_at desc limit 1`;
  return row;
}

async function bookingRow(code: string) {
  const [row] = await sql<
    { travelDate: string; rescheduleCount: number; reminderSentAt: Date | null }[]
  >`
    select to_char(travel_date, 'YYYY-MM-DD') as "travelDate",
           reschedule_count as "rescheduleCount", reminder_sent_at as "reminderSentAt"
    from bookings where code = ${code}`;
  return row;
}

async function tourInfo() {
  const [row] = await sql<{ id: number; max: number }[]>`
    select id, max_participants as max from tours where slug = ${TOUR}`;
  return row;
}

/** Opens the cancel dialog for a paid booking and returns it. */
async function openCancelDialog(page: Page, code: string) {
  await page.goto(`/account/bookings/${code}`);
  await page.getByRole("button", { name: `Batalkan booking ${code}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openRescheduleDialog(page: Page, code: string) {
  await page.goto(`/account/bookings/${code}`);
  await page.getByRole("button", { name: `Ubah tanggal booking ${code}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** A random date in the bookable window, away from the near-term dates other specs use. */
function laterDate(excluding: string[] = []): string {
  for (;;) {
    const date = jakartaDate(40 + randomInt(260));
    if (!excluding.includes(date)) return date;
  }
}

test.describe("traveller cancels a paid booking", () => {
  test.use({ storageState: STORAGE_STATE.traveler });

  test("14 or more days ahead: full refund is queued", async ({ page, browser }) => {
    const { booking, orderId } = await paidBooking(20);

    const dialog = await openCancelDialog(page, booking.code);
    await expect(dialog.getByTestId("cancel-refund-summary")).toContainText(
      "Pengembalian dana penuh",
    );
    await dialog.getByRole("button", { name: "Ya, batalkan booking" }).click();

    await expect.poll(() => bookingStatus(booking.code)).toBe("cancelled");
    const state = await refundState(orderId);
    expect(state.status).toBe("paid");
    expect(state.refundRequired).toBe(true);
    expect(state.refundAmount).toBeNull();

    const audit = await auditDetails(booking.code, "booking.cancelled_by_traveller");
    expect(audit.actorId).not.toBeNull();
    expect(audit.details).toMatchObject({
      daysBefore: 20,
      percent: 100,
      refundAmount: booking.total,
    });

    const admin = await browser.newContext({ storageState: STORAGE_STATE.admin });
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin/payments");
    const item = adminPage.getByTestId("refund-queue-item").filter({ hasText: booking.code });
    await expect(item).toBeVisible();
    await expect(item.getByTestId("refund-partial")).toHaveCount(0);
    await admin.close();
  });

  test("7 to 13 days ahead: half the payment, shown in the refund queue", async ({
    page,
    browser,
  }) => {
    const { booking, orderId } = await paidBooking(10);
    const half = Math.floor(booking.total / 2);

    const dialog = await openCancelDialog(page, booking.code);
    await expect(dialog.getByTestId("cancel-refund-summary")).toContainText(
      "Pengembalian dana 50%",
    );
    await dialog.getByRole("button", { name: "Ya, batalkan booking" }).click();

    await expect.poll(() => bookingStatus(booking.code)).toBe("cancelled");
    const state = await refundState(orderId);
    expect(state.refundRequired).toBe(true);
    expect(state.refundAmount).toBe(half);
    expect(
      (await auditDetails(booking.code, "booking.cancelled_by_traveller")).details,
    ).toMatchObject({ daysBefore: 10, percent: 50, refundAmount: half });

    const admin = await browser.newContext({ storageState: STORAGE_STATE.admin });
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin/payments");
    const item = adminPage.getByTestId("refund-queue-item").filter({ hasText: booking.code });
    await expect(item.getByTestId("refund-partial")).toContainText("50%");

    // Recording the refund confirms the partial amount.
    await item.getByRole("button", { name: /Catat refund/ }).click();
    const refundDialog = adminPage.getByRole("dialog");
    await expect(refundDialog.getByTestId("refund-dialog-amount")).toContainText("50%");
    await refundDialog.getByLabel("Referensi refund").fill("BCA ref E2E-PARTIAL");
    await refundDialog.getByRole("button", { name: "Tandai sudah dikembalikan" }).click();
    await expect.poll(async () => (await refundState(orderId)).status).toBe("refunded");
    expect((await refundState(orderId)).refundAmount).toBe(half);
    await admin.close();
  });

  test("under 7 days ahead: cancelled without a refund", async ({ page, browser }) => {
    const { booking, orderId } = await paidBooking(4);

    const dialog = await openCancelDialog(page, booking.code);
    await expect(dialog.getByTestId("cancel-refund-summary")).toContainText(
      "Tidak ada pengembalian dana",
    );
    await dialog.getByRole("button", { name: "Ya, batalkan booking" }).click();

    await expect.poll(() => bookingStatus(booking.code)).toBe("cancelled");
    const state = await refundState(orderId);
    expect(state.refundRequired).toBe(false);
    expect(state.status).toBe("paid");
    expect(
      (await auditDetails(booking.code, "booking.cancelled_by_traveller")).details,
    ).toMatchObject({ daysBefore: 4, percent: 0, refundAmount: 0 });

    const admin = await browser.newContext({ storageState: STORAGE_STATE.admin });
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin/payments");
    await expect(
      adminPage.getByTestId("refund-queue-item").filter({ hasText: booking.code }),
    ).toHaveCount(0);
    await admin.close();
  });
});

test.describe("traveller reschedules a booking", () => {
  test.use({ storageState: STORAGE_STATE.traveler });

  test("moves to a valid date once; a second move is refused", async ({ page }) => {
    const from = jakartaDate(30);
    const to = laterDate([from]);
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR,
      status: "confirmed",
      travelDate: from,
    });
    // As if the pre-trip reminder had already gone out for the old date.
    await sql`update bookings set reminder_sent_at = now() where id = ${booking.id}`;

    const dialog = await openRescheduleDialog(page, booking.code);
    const day = await showCalendarDate(page, to);
    await day.click();
    await dialog.getByRole("button", { name: "Pindahkan booking" }).click();

    await expect.poll(async () => (await bookingRow(booking.code)).travelDate).toBe(to);
    const row = await bookingRow(booking.code);
    expect(row.rescheduleCount).toBe(1);
    expect(row.reminderSentAt).toBeNull();
    expect(await bookingStatus(booking.code)).toBe("confirmed");
    expect((await auditDetails(booking.code, "booking.rescheduled")).details).toMatchObject({
      from,
      to,
    });

    // The policy allows one move: the button is gone and the reason is shown.
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Ubah tanggal booking ${booking.code}` }),
    ).toHaveCount(0);
    await expect(page.getByTestId("reschedule-blocked")).toBeVisible();
  });

  test("an unpaid pending booking can be moved too", async ({ page }) => {
    const from = jakartaDate(25);
    const to = laterDate([from]);
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR,
      status: "pending",
      travelDate: from,
    });

    const dialog = await openRescheduleDialog(page, booking.code);
    await (await showCalendarDate(page, to)).click();
    await dialog.getByRole("button", { name: "Pindahkan booking" }).click();
    await expect.poll(async () => (await bookingRow(booking.code)).travelDate).toBe(to);
    expect(await bookingStatus(booking.code)).toBe("pending");
  });

  test("closed and full dates are refused", async ({ page }) => {
    const tour = await tourInfo();
    const from = jakartaDate(35);
    const closedDate = laterDate([from]);
    const fullDate = laterDate([from, closedDate]);
    const raceDate = laterDate([from, closedDate, fullDate]);
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR,
      status: "confirmed",
      travelDate: from,
    });
    await sql`
      insert into tour_closures (tour_id, date, reason)
      values (${tour.id}, ${closedDate}, 'E2E self-service')
      on conflict do nothing`;
    const filler = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR,
      status: "confirmed",
      travelDate: fullDate,
      participants: tour.max,
    });

    try {
      const dialog = await openRescheduleDialog(page, booking.code);
      const confirm = dialog.getByRole("button", { name: "Pindahkan booking" });

      const closed = await showCalendarDate(page, closedDate);
      await expect(closed).toHaveAttribute("data-state", "closed");
      await closed.click({ force: true });
      await expect(confirm).toBeDisabled();

      const full = await showCalendarDate(page, fullDate);
      await expect(full).toHaveAttribute("data-state", "full");
      await full.click({ force: true });
      await expect(confirm).toBeDisabled();

      // The server re-checks: a date closed after it was picked is refused.
      await (await showCalendarDate(page, raceDate)).click();
      await expect(confirm).toBeEnabled();
      await sql`
        insert into tour_closures (tour_id, date, reason)
        values (${tour.id}, ${raceDate}, 'E2E self-service race')
        on conflict do nothing`;
      await confirm.click();
      await expect(dialog.getByRole("alert")).toContainText("ditutup");

      const row = await bookingRow(booking.code);
      expect(row.travelDate).toBe(from);
      expect(row.rescheduleCount).toBe(0);
    } finally {
      await sql`
        delete from tour_closures
        where tour_id = ${tour.id} and date in ${sql([closedDate, raceDate])}`;
      await sql`update bookings set status = 'cancelled' where id = ${filler.id}`;
    }
  });
});
