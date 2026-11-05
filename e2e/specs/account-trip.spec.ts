import { expect, test } from "@playwright/test";
import { registerNewUser } from "../support/auth";
import { STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate } from "../support/db";

/**
 * Upcoming-trip features of the account area. Each test uses a fresh account
 * with its own bookings, so parallel specs that book for the demo traveller
 * can't change which trip is "next".
 */
test.describe("account: upcoming trip", () => {
  test("highlights the soonest upcoming booking with a countdown", async ({ page }) => {
    const { email } = await registerNewUser(page, "nexttrip");
    await createBooking({
      email,
      tourSlug: "kampung-arborek-raja-ampat",
      status: "confirmed",
      travelDate: jakartaDate(90),
    });
    await createBooking({
      email,
      tourSlug: "trekking-subak-jatiluwih",
      status: "pending",
      travelDate: jakartaDate(30),
    });
    await createBooking({
      email,
      tourSlug: "dapur-desa-keluarga-bali",
      status: "cancelled",
      travelDate: jakartaDate(10),
    });

    await page.goto("/account");
    const next = page.locator('article[aria-labelledby="next-trip-title"]');
    await expect(next.getByRole("heading", { name: "Trekking Subak Jatiluwih" })).toBeVisible();
    await expect(next).toContainText("Dalam 30 hari");
    // Unpaid, so the primary action is paying.
    await expect(next.getByRole("button", { name: "Bayar sekarang" })).toBeVisible();
    await expect(next.getByRole("link", { name: "Tambah ke kalender" })).toHaveAttribute(
      "href",
      /\/account\/bookings\/EJ-[A-Z0-9]{6}\/calendar\.ics$/,
    );
  });

  test("booking detail explains what happens next", async ({ page }) => {
    const { email } = await registerNewUser(page, "nextsteps");
    const booking = await createBooking({
      email,
      tourSlug: "trekking-subak-jatiluwih",
      status: "pending",
      travelDate: jakartaDate(45),
    });
    await page.goto(`/account/bookings/${booking.code}`);
    await expect(page.getByRole("heading", { name: "Langkah berikutnya" })).toBeVisible();
    await expect(
      page.getByText("Selesaikan pembayaran agar tempatmu terkonfirmasi."),
    ).toBeVisible();
  });
});

test.describe("account: calendar download", () => {
  test("owner gets a valid all-day event; others get 401/404", async ({ page, browser }) => {
    const { email } = await registerNewUser(page, "ics");
    const booking = await createBooking({
      email,
      tourSlug: "kasada-dan-fajar-bromo", // 2 days
      status: "confirmed",
      travelDate: jakartaDate(60),
    });
    const path = `/account/bookings/${booking.code}/calendar.ics`;

    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(response.headers()["content-disposition"]).toBe(
      `attachment; filename="etnojourney-${booking.code}.ics"`,
    );
    expect(response.headers()["cache-control"]).toContain("no-store");

    const ics = await response.text();
    const start = jakartaDate(60).replace(/-/g, "");
    const end = jakartaDate(62).replace(/-/g, "");
    expect(ics).toContain(`DTSTART;VALUE=DATE:${start}`);
    expect(ics).toContain(`DTEND;VALUE=DATE:${end}`);
    expect(ics).toContain(`UID:${booking.code}@etnojourney`);
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");

    // The English URL variant serves English text.
    const en = await page.request.get(`/en${path}`);
    expect(en.status()).toBe(200);
    expect(await en.text()).toContain(`Booking code: ${booking.code}`);

    // Another signed-in user: 404 (never reveal that the code exists).
    const other = await browser.newContext({ storageState: STORAGE_STATE.traveler });
    expect((await other.request.get(path)).status()).toBe(404);
    await other.close();

    // No session: 401.
    const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    expect((await anonymous.request.get(path)).status()).toBe(401);
    await anonymous.close();
  });
});
