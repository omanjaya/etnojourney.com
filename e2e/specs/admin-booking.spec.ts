import { expect, test } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, sql } from "../support/db";

test.describe("admin booking detail", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("opens a booking from the list and adds an internal note", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "pura-ulun-danu-upacara-danau",
    });

    await page.goto(`/admin/bookings?q=${booking.code}`);
    await page
      .getByRole("link", { name: new RegExp(booking.code) })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/bookings/${booking.code}$`));
    await expect(page.locator("h1")).toContainText(booking.code);
    await expect(page.getByText(ACCOUNTS.traveler.email)).toBeVisible();
    await expect(page.getByText("081234567890").first()).toBeVisible();
    // Status control is available on the detail page (pending -> confirm/cancel).
    await expect(page.getByRole("button", { name: "Konfirmasi" })).toBeVisible();

    const body = `E2E note ${Date.now()}: guest asked for a vegetarian lunch.`;
    await page.getByLabel("Tambah catatan").fill(body);
    await page.getByRole("button", { name: "Simpan catatan" }).click();

    await expect(page.getByRole("list", { name: "Catatan internal" })).toContainText(body);
    await expect(page.getByLabel("Tambah catatan")).toHaveValue("");
    await expect(page.getByText("Catatan internal ditambahkan")).toBeVisible();

    const [note] = await sql<{ body: string }[]>`
      select n.body from booking_notes n where n.booking_id = ${booking.id}`;
    expect(note?.body).toBe(body);
    const [audit] = await sql<{ count: number }[]>`
      select count(*)::int as count from audit_logs
      where entity_type = 'booking' and entity_id = ${String(booking.id)}
        and action = 'booking.note_added'`;
    expect(audit.count).toBe(1);
  });

  test("unknown booking codes return 404", async ({ page }) => {
    const response = await page.goto("/admin/bookings/EJ-NOPE00");
    expect(response?.status()).toBe(404);
  });
});
