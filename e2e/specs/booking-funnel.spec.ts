import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { jakartaDate, sql } from "../support/db";
import { pickTravelDate } from "../support/calendar";

/**
 * The anonymous booking funnel: a visitor chooses a date and travellers, signs
 * up, and lands back on the tour with those choices kept, then books.
 */
test.describe("booking funnel", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  const tourPath = "/tours/trekking-subak-jatiluwih";
  const email = `funnel-${randomUUID()}@example.test`;

  test.afterAll(async () => {
    await sql`delete from bookings where user_id in (select id from "user" where email = ${email})`;
    await sql`delete from "user" where email = ${email}`;
  });

  test("choices survive sign-up and the booking completes in view", async ({ page }) => {
    const date = jakartaDate(50 + Math.floor(Math.random() * 150));

    // Anonymous visitors see the calendar, stepper and live total.
    await page.goto(tourPath);
    await pickTravelDate(page, date);
    await page.getByRole("button", { name: "Tambah peserta" }).click();
    await expect(page.locator("#participants")).toHaveText("2");
    await expect(page.getByText(/Kebijakan pembatalan/).first()).toBeVisible();

    const signIn = page.getByRole("link", { name: "Masuk untuk melanjutkan" });
    const href = decodeURIComponent((await signIn.getAttribute("href")) ?? "");
    expect(href).toContain(`${tourPath}?date=${date}&people=2#booking`);
    await signIn.click();

    // The register link on the login page carries the same destination.
    await page.getByRole("link", { name: /Daftar/ }).last().click();
    await expect(page).toHaveURL(/\/register\?next=/);
    await page.locator("#name").fill("Funnel Tester");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("Funnel-Password-123");
    await page.locator("#confirmPassword").fill("Funnel-Password-123");
    await page.locator('form button[type="submit"]').click();

    // Back on the tour with the date and travellers preselected.
    await expect(page).toHaveURL(new RegExp(`${tourPath}\\?date=${date}&people=2`));
    await expect(page.locator('input[name="travelDate"]')).toHaveValue(date, { timeout: 20_000 });
    await expect(page.locator("#participants")).toHaveText("2");

    await page.locator("#contactPhone").fill("081234567890");
    await page.locator('form:has(input[name="travelDate"]) button[type="submit"]').click();

    const heading = page.getByRole("heading", { name: "Booking diterima" });
    await expect(heading).toBeInViewport();
    await expect(heading).toBeFocused();
    await expect(page.getByText("Langkah berikutnya")).toBeVisible();
    await expect(page.getByRole("link", { name: "Tambah ke kalender" })).toHaveAttribute(
      "href",
      /^\/account\/bookings\/EJ-[A-Z0-9]{6}\/calendar\.ics$/,
    );

    // The mobile booking shortcut retires after a booking.
    await expect(page.locator(".fixed.bottom-0[data-hidden]")).toHaveCount(1);
  });
});
