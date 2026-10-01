import { expect, test } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { bookingStatus, createBooking, jakartaDate } from "../support/db";
import { forceTravelDate, pickTravelDate } from "../support/calendar";

test.use({ storageState: STORAGE_STATE.traveler });

test.describe("booking", () => {
  test("a traveller books a tour and is offered payment right away", async ({ page }) => {
    await page.goto("/tours/trekking-subak-jatiluwih");
    await pickTravelDate(page, jakartaDate(40 + Math.floor(Math.random() * 200)));
    await page.locator("#contactName").fill("Nadia Putri");
    await page.locator("#contactPhone").fill("081234567890");
    await page
      .getByRole("button", { name: "Pesan sekarang" })
      .filter({ visible: true })
      .last()
      .click();

    await expect(page.getByText("Booking diterima")).toBeVisible();
    const code = (
      await page
        .getByText(/EJ-[A-Z0-9]{6}/)
        .first()
        .innerText()
    ).match(/EJ-[A-Z0-9]{6}/)![0];
    await expect(page.getByRole("button", { name: "Bayar sekarang" })).toBeVisible();
    expect(await bookingStatus(code)).toBe("pending");
  });

  test("the server rejects dates inside the minimum lead time", async ({ page }) => {
    await page.goto("/tours/trekking-subak-jatiluwih");
    await page.locator("#contactName").fill("Nadia Putri");
    await page.locator("#contactPhone").fill("081234567890");
    // Bypass the calendar's rules to prove the lead time is enforced server-side.
    await forceTravelDate(page, jakartaDate(1));
    await page
      .getByRole("button", { name: "Pesan sekarang" })
      .filter({ visible: true })
      .last()
      .click();
    await expect(page.locator('form [role="alert"]').first()).toContainText("minimal 3 hari");
  });

  test("a pending booking can be cancelled from the account page", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "pura-ulun-danu-upacara-danau",
    });
    await page.goto("/account");
    const card = page.locator("li").filter({ hasText: booking.code });
    await card.getByRole("button", { name: "Batalkan" }).click();
    await card.getByRole("button", { name: "Ya, batalkan" }).click();
    await expect(card.getByText("Dibatalkan").first()).toBeVisible();
    await expect.poll(() => bookingStatus(booking.code)).toBe("cancelled");
  });
});
