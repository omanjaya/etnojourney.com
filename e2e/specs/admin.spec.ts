import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, BASE_URL, STORAGE_STATE } from "../support/env";
import { bookingStatus, createBooking, setTourPublished, tourIsPublished } from "../support/db";

const ADMIN_PATHS = [
  "/admin",
  "/admin/bookings",
  "/admin/tours",
  "/admin/reviews",
  "/admin/tours/new",
];

test.describe("admin access control", () => {
  test("signed-out visitors are sent to login", async ({ page }) => {
    for (const path of ADMIN_PATHS) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login/);
    }
  });

  test.describe("as a traveller", () => {
    test.use({ storageState: STORAGE_STATE.traveler });
    test("non-admins are sent home", async ({ page }) => {
      await page.goto("/admin/bookings");
      await expect(page).toHaveURL(`${BASE_URL}/`);
    });
  });

  test.describe("RSC refetch replay", () => {
    test.use({ storageState: STORAGE_STATE.admin });

    // Regression test: Next.js can render a page without re-running its
    // layout. Replaying an admin navigation request without the session
    // cookie must not leak any booking data.
    test("does not leak admin data without a session", async ({ page, playwright }) => {
      await page.goto("/admin");
      const captured = new Promise<{ url: string; headers: Record<string, string> }>((resolve) => {
        page.on("request", (request) => {
          const headers = request.headers();
          if (
            headers["rsc"] &&
            !headers["next-router-prefetch"] &&
            !headers["next-router-segment-prefetch"] &&
            new URL(request.url()).pathname.endsWith("/admin/bookings")
          ) {
            resolve({ url: request.url(), headers });
          }
        });
      });
      await page
        .getByRole("link", { name: "Booking", exact: true })
        .filter({ visible: true })
        .first()
        .click();
      const { url, headers } = await captured;

      const cookieHeader = (await page.context().cookies())
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      // Separate request contexts: an authenticated response may refresh the
      // session cookie, which a shared context would then replay.
      // Explicit empty state: request contexts otherwise inherit the spec's storageState.
      const empty = { cookies: [], origins: [] };
      const authed = await playwright.request.newContext({ storageState: empty });
      const anonymous = await playwright.request.newContext({ storageState: empty });
      try {
        const withSession = await authed.get(url, {
          headers: { ...headers, cookie: cookieHeader },
          maxRedirects: 0,
        });
        expect(await withSession.text(), "positive control").toContain(ACCOUNTS.traveler.email);

        const withoutCookie = Object.fromEntries(
          Object.entries(headers).filter(([name]) => name.toLowerCase() !== "cookie"),
        );
        // Precondition: the replay really is anonymous.
        expect((await anonymous.storageState()).cookies).toHaveLength(0);
        const leaked = await anonymous.get(url, { headers: withoutCookie, maxRedirects: 0 });
        const body = await leaked.text();
        expect(body).not.toContain(ACCOUNTS.traveler.email);
        expect(body).not.toContain("081234567890");
      } finally {
        await authed.dispose();
        await anonymous.dispose();
      }
    });
  });
});

test.describe("admin operations", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("dashboard shows statistics", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/Rp\s?[\d.]+/).first()).toBeVisible();
  });

  test("admin confirms a pending booking", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "pura-ulun-danu-upacara-danau",
    });
    await page.goto("/admin/bookings?status=pending");
    const row = rowFor(page, booking.code);
    await row.getByRole("button", { name: "Konfirmasi" }).click();
    await expect.poll(() => bookingStatus(booking.code)).toBe("confirmed");
  });

  test("unpublishing a tour hides it from the public site", async ({ page, browser }) => {
    const slug = "jejak-desa-ngadas";
    await setTourPublished(slug, true);
    try {
      await page.goto("/admin/tours");
      const toggle = page
        .getByRole("switch", { name: /Tayangkan Tiga Hari di Desa Ngadas/ })
        .filter({ visible: true })
        .first();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await expect.poll(() => tourIsPublished(slug)).toBe(false);

      const visitor = await (await browser.newContext()).newPage();
      const response = await visitor.goto(`${BASE_URL}/tours/${slug}`);
      expect(response?.status()).toBe(404);
    } finally {
      await setTourPublished(slug, true);
    }
  });
});

/** The bookings list renders a table on desktop and cards on mobile; pick the visible one. */
function rowFor(page: Page, code: string) {
  return page.locator("tr, li").filter({ hasText: code }).filter({ visible: true }).first();
}
