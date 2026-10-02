import { expect, test } from "@playwright/test";
import { registerNewUser } from "../support/auth";
import { createBooking, jakartaDate, sql } from "../support/db";
import { CRON_TEST_SECRET, STORAGE_STATE } from "../support/env";

const empty = { cookies: [], origins: [] };

test.describe("trip documents: e-ticket PDF", () => {
  test("owner downloads the PDF; others are refused", async ({ page, browser }) => {
    const { email } = await registerNewUser(page, "ticket");
    const booking = await createBooking({
      email,
      tourSlug: "kasada-dan-fajar-bromo",
      status: "confirmed",
      travelDate: jakartaDate(40),
    });
    const path = `/api/bookings/${booking.code}/ticket`;

    // The booking page links to it.
    await page.goto(`/account/bookings/${booking.code}`);
    await expect(page.getByRole("link", { name: "Unduh e-tiket (PDF)" })).toHaveAttribute(
      "href",
      `${path}?locale=id`,
    );

    const response = await page.request.get(`${path}?locale=en`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect(response.headers()["content-disposition"]).toBe(
      `attachment; filename="etnojourney-e-ticket-${booking.code}.pdf"`,
    );
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.body();
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    // Another signed-in user: 404 (never reveal that the code exists).
    const other = await browser.newContext({ storageState: STORAGE_STATE.traveler });
    expect((await other.request.get(path)).status()).toBe(404);
    await other.close();

    // No session: 401.
    const anonymous = await browser.newContext({ storageState: empty });
    expect((await anonymous.request.get(path)).status()).toBe(401);
    await anonymous.close();
  });

  test("a pending booking has no e-ticket yet", async ({ page }) => {
    const { email } = await registerNewUser(page, "ticketpending");
    const booking = await createBooking({
      email,
      tourSlug: "kasada-dan-fajar-bromo",
      status: "pending",
      travelDate: jakartaDate(40),
    });
    expect((await page.request.get(`/api/bookings/${booking.code}/ticket`)).status()).toBe(403);
    await page.goto(`/account/bookings/${booking.code}`);
    await expect(page.getByRole("link", { name: "Unduh e-tiket (PDF)" })).toHaveCount(0);
  });
});

test.describe("scheduled trip emails (cron)", () => {
  const endpoint = "/api/cron/trip-emails";

  test("rejects calls without the right secret", async ({ playwright }) => {
    const api = await playwright.request.newContext({ storageState: empty });
    expect((await api.post(endpoint)).status()).toBe(401);
    const wrong = await api.post(endpoint, {
      headers: { Authorization: `Bearer ${CRON_TEST_SECRET}-wrong` },
    });
    expect(wrong.status()).toBe(401);
    await api.dispose();
  });

  test("sends a due reminder exactly once across runs", async ({ page, playwright }) => {
    const { email } = await registerNewUser(page, "reminder");
    const booking = await createBooking({
      email,
      tourSlug: "kasada-dan-fajar-bromo",
      status: "confirmed",
      travelDate: jakartaDate(2),
    });
    // Not due: too far ahead.
    const later = await createBooking({
      email,
      tourSlug: "kasada-dan-fajar-bromo",
      status: "confirmed",
      travelDate: jakartaDate(10),
    });

    const api = await playwright.request.newContext({ storageState: empty });
    const run = () =>
      api.post(endpoint, { headers: { Authorization: `Bearer ${CRON_TEST_SECRET}` } });
    const sentAt = async (id: number) => {
      const [row] = await sql<{ sent: Date | null }[]>`
        select reminder_sent_at as sent from bookings where id = ${id}`;
      return row.sent;
    };

    const first = await run();
    expect(first.status()).toBe(200);
    const json = await first.json();
    expect(json.ok).toBe(true);
    expect(json.reminders.sent).toBeGreaterThanOrEqual(1);
    const stamped = await sentAt(booking.id);
    expect(stamped).not.toBeNull();
    expect(await sentAt(later.id)).toBeNull();

    // A second run leaves the claim untouched and sends nothing for it.
    const second = await run();
    expect(second.status()).toBe(200);
    expect((await sentAt(booking.id))?.getTime()).toBe(stamped!.getTime());
    await api.dispose();
  });
});
