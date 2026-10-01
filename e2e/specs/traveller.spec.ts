import { expect, test } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate, sql } from "../support/db";

test.use({ storageState: STORAGE_STATE.traveler });

test.describe("traveller account", () => {
  test("wishlist toggle persists and shows on the wishlist page", async ({ page }) => {
    await page.goto("/tours/trekking-subak-jatiluwih");
    const toggle = page
      .getByRole("button", { name: /wishlist/i })
      .filter({ visible: true })
      .first();
    const before = await toggle.getAttribute("aria-pressed");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");

    await page.reload();
    const after = page
      .getByRole("button", { name: /wishlist/i })
      .filter({ visible: true })
      .first();
    await expect(after).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");

    if (before !== "true") {
      await page.goto("/account/wishlist");
      await expect(page.getByText("Trekking Subak Jatiluwih").first()).toBeVisible();
      await page.goto("/tours/trekking-subak-jatiluwih");
    }
    // Restore the original state so reruns start the same way.
    await page
      .getByRole("button", { name: /wishlist/i })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page
        .getByRole("button", { name: /wishlist/i })
        .filter({ visible: true })
        .first(),
    ).toHaveAttribute("aria-pressed", before ?? "false");
  });

  test("a completed trip can be reviewed once and the review is published", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "kelas-ukir-dan-lukis-batuan",
      status: "completed",
      travelDate: jakartaDate(-20 - Math.floor(Math.random() * 300)),
    });
    const text = `Ulasan uji ${booking.code}: pemandu sabar dan sanggarnya indah sekali.`;

    await page.goto("/account");
    const card = page.locator("li").filter({ hasText: booking.code });
    await card.getByRole("button", { name: "Tulis ulasan" }).click();

    const dialog = page.locator("dialog[open]");
    await dialog.getByRole("radio").nth(4).check({ force: true });
    await dialog.locator("textarea").fill(text);
    await dialog.getByRole("button", { name: "Kirim ulasan" }).click();
    await expect(dialog.getByText("Terima kasih")).toBeVisible();

    const [row] = await sql<{ rating: number }[]>`
      select r.rating from reviews r join bookings b on b.id = r.booking_id where b.code = ${booking.code}`;
    expect(row?.rating).toBe(5);

    await page.goto("/tours/kelas-ukir-dan-lukis-batuan");
    await expect(page.getByText(text)).toBeVisible();
  });
});
