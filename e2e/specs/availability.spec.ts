import { expect, test } from "@playwright/test";
import { showCalendarDate } from "../support/calendar";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate, sql } from "../support/db";

test.use({ storageState: STORAGE_STATE.traveler });

/** Calendar arithmetic in UTC, matching the app's business-date handling. */
function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Ngadas has 6 seats per date.
const TOUR = "jejak-desa-ngadas";
const offset = 120 + Math.floor(Math.random() * 150);
const fullDate = jakartaDate(offset);
const limitedDate = jakartaDate(offset + 2);
const codes: string[] = [];

test.beforeAll(async () => {
  const email = ACCOUNTS.traveler.email;
  codes.push(
    (
      await createBooking({
        email,
        tourSlug: TOUR,
        status: "confirmed",
        travelDate: fullDate,
        participants: 6,
      })
    ).code,
  );
  codes.push(
    (
      await createBooking({
        email,
        tourSlug: TOUR,
        status: "pending",
        travelDate: limitedDate,
        participants: 5,
      })
    ).code,
  );
});

test.afterAll(async () => {
  await sql`delete from bookings where code in ${sql(codes)}`;
});

test.describe("availability calendar", () => {
  test("a fully booked date is announced and cannot be chosen", async ({ page }) => {
    await page.goto(`/tours/${TOUR}`);
    const day = await showCalendarDate(page, fullDate);
    await expect(day).toHaveAttribute("aria-disabled", "true");
    await expect(day).toHaveAccessibleName(/penuh$/);
    // `force`: Playwright would otherwise wait for the aria-disabled day to enable.
    await day.click({ force: true });
    await expect(page.locator('input[name="travelDate"]')).toHaveValue("");
  });

  test("a nearly full date shows the seats left and caps the group size", async ({ page }) => {
    await page.goto(`/tours/${TOUR}`);
    const day = await showCalendarDate(page, limitedDate);
    await expect(day).toHaveAccessibleName(/sisa 1 kursi$/);
    await expect(day).toContainText("Sisa 1");
    await day.click();
    await expect(page.locator('input[name="travelDate"]')).toHaveValue(limitedDate);
    await expect(page.getByRole("button", { name: "Tambah peserta" })).toBeDisabled();
    await expect(page.getByText("Sisa 1 kursi pada tanggal ini.")).toBeVisible();
  });

  test("arrow and page keys move focus between days and months", async ({ page }) => {
    await page.goto(`/tours/${TOUR}`);
    const day = await showCalendarDate(page, limitedDate);
    await day.focus();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(`[data-date="${shiftDays(limitedDate, 1)}"]`)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(`[data-date="${shiftDays(limitedDate, 8)}"]`)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expect(day).toBeFocused();

    // Page Down jumps to the same day next month (or the month's last day).
    const [y, m, d] = limitedDate.split("-").map(Number);
    const lastOfNext = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const target = new Date(Date.UTC(y, m, Math.min(d, lastOfNext))).toISOString().slice(0, 10);
    await page.keyboard.press("PageDown");
    await expect(page.locator(`[data-date="${target}"]`)).toBeFocused();
  });
});
