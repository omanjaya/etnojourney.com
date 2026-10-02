import { expect, test } from "@playwright/test";
import { forceTravelDate, showCalendarDate } from "../support/calendar";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate, sql } from "../support/db";

// A tour no other spec books through the UI, so closing its dates is isolated.
const TOUR = "gringsing-tenun-ikat-ganda";
// Inside the 12-month window an admin may close, and past the booking lead time.
const offset = 30 + Math.floor(Math.random() * 250);
const closedDate = jakartaDate(offset);
const bookedDate = jakartaDate(offset + 3);
const bookingCodes: string[] = [];

let tourId: number;

test.beforeAll(async () => {
  const [tour] = await sql<{ id: number }[]>`select id from tours where slug = ${TOUR}`;
  tourId = tour.id;
});

test.afterAll(async () => {
  await sql`delete from tour_closures where tour_id = ${tourId} and date in ${sql([closedDate, bookedDate])}`;
  if (bookingCodes.length) await sql`delete from bookings where code in ${sql(bookingCodes)}`;
});

const adminUrl = (date: string) => `/admin/availability?tour=${tourId}&month=${date.slice(0, 7)}`;

test.describe("availability closures", () => {
  test.describe.configure({ mode: "serial" });

  test("an admin closes a date for one tour", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE.admin });
    const page = await context.newPage();
    await page.goto(adminUrl(closedDate));

    await page.locator(`[data-date="${closedDate}"]`).click();
    await expect(page.locator("#closure-from")).toHaveValue(closedDate);
    await expect(page.getByText(/1 tanggal dipilih/)).toBeVisible();
    await page.locator("#closure-reason").fill("Upacara adat desa");
    await page.getByRole("button", { name: "Tutup 1 tanggal" }).click();

    await expect(page.getByText("1 tanggal ditutup.")).toBeVisible();
    await expect(page.locator(`[data-date="${closedDate}"]`)).toHaveAttribute(
      "data-closed",
      "true",
    );
    await expect(
      page
        .getByRole("region", { name: "Penutupan mendatang" })
        .getByText("Upacara adat desa")
        .first(),
    ).toBeVisible();

    const rows = await sql<{ reason: string; created_by: string | null }[]>`
      select reason, created_by from tour_closures where tour_id = ${tourId} and date = ${closedDate}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("Upacara adat desa");
    const [audit] = await sql<{ n: number }[]>`
      select count(*)::int as n from audit_logs where action = 'closure.created'
        and details->>'date' = ${closedDate} and (details->>'tourId')::int = ${tourId}`;
    expect(audit.n).toBeGreaterThan(0);
    await context.close();
  });

  test("closing a date with bookings warns how many stay active", async ({ browser }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR,
      status: "confirmed",
      travelDate: bookedDate,
      participants: 2,
    });
    bookingCodes.push(booking.code);

    const context = await browser.newContext({ storageState: STORAGE_STATE.admin });
    const page = await context.newPage();
    await page.goto(adminUrl(bookedDate));
    await page.locator(`[data-date="${bookedDate}"]`).click();
    await expect(
      page.getByText(/Ada 1 booking menunggu atau terkonfirmasi \(2 peserta\)/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tutup 1 tanggal" }).click();
    await expect(page.getByText(/1 booking pada tanggal tersebut tetap aktif/)).toBeVisible();

    // Closing never cancels existing bookings.
    const [row] = await sql<
      { status: string }[]
    >`select status from bookings where code = ${booking.code}`;
    expect(row.status).toBe("confirmed");
    await context.close();
  });

  test.describe("traveller", () => {
    test.use({ storageState: STORAGE_STATE.traveler });

    test("the public calendar shows the date as closed", async ({ page }) => {
      await page.goto(`/tours/${TOUR}`);
      const day = await showCalendarDate(page, closedDate);
      await expect(day).toHaveAttribute("data-state", "closed");
      await expect(day).toHaveAttribute("aria-disabled", "true");
      await expect(day).toHaveAccessibleName(/ditutup untuk pemesanan$/);
      await day.click({ force: true });
      await expect(page.locator('input[name="travelDate"]')).toHaveValue("");
    });

    test("the server rejects a booking on the closed date", async ({ page }) => {
      await page.goto(`/tours/${TOUR}`);
      await page.locator("#contactName").fill("Nadia Putri");
      await page.locator("#contactPhone").fill("081234567890");
      // Bypass the calendar to prove the closure is enforced server-side.
      await forceTravelDate(page, closedDate);
      await page
        .getByRole("button", { name: "Pesan sekarang" })
        .filter({ visible: true })
        .last()
        .click();
      await expect(page.locator('form [role="alert"]').first()).toContainText(
        "Tanggal ini ditutup untuk pemesanan",
      );
      const [count] = await sql<{ n: number }[]>`
        select count(*)::int as n from bookings b join tours t on t.id = b.tour_id
        where t.slug = ${TOUR} and b.travel_date = ${closedDate}`;
      expect(count.n).toBe(0);
    });
  });
});
