import { expect, test } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, sql } from "../support/db";

const EXPORT_URL = "/api/admin/bookings/export";

test.describe("admin bookings tools", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("search by booking code and by customer email", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "jejak-desa-ngadas",
      status: "pending",
    });

    await page.goto("/admin/bookings");
    const search = page.getByRole("searchbox", { name: "Cari booking" });
    await search.fill(booking.code);
    await expect(page).toHaveURL(new RegExp(`q=${booking.code}`));
    await expect(page.getByText(booking.code).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("1 booking", { exact: true })).toBeVisible();

    await search.fill(ACCOUNTS.traveler.email);
    await expect(page).toHaveURL(/q=traveler%40etnojourney\.id|q=traveler@etnojourney\.id/);
    await expect(page.getByText(booking.code).filter({ visible: true }).first()).toBeVisible();

    await search.fill("no-such-booking-xyz");
    await expect(page.getByText("Tidak ada booking yang cocok")).toBeVisible();
  });

  test("status filter keeps the search and narrows results", async ({ page }) => {
    const cancelled = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "trekking-subak-jatiluwih",
      status: "cancelled",
    });

    await page.goto(`/admin/bookings?q=${cancelled.code}`);
    await page.getByRole("link", { name: "Dibatalkan" }).click();
    await expect(page).toHaveURL(/status=cancelled/);
    await expect(page).toHaveURL(new RegExp(`q=${cancelled.code}`));
    await expect(page.getByText(cancelled.code).filter({ visible: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Terkonfirmasi" }).click();
    await expect(page.getByText("Tidak ada booking yang cocok")).toBeVisible();
  });

  test("bookings paginate 20 per page", async ({ page }) => {
    // Enough bookings for at least two pages.
    const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from bookings`;
    for (let i = total; i < 21; i++) {
      await createBooking({ email: ACCOUNTS.traveler.email, tourSlug: "jejak-desa-ngadas" });
    }

    await page.goto("/admin/bookings");
    const pager = page.getByRole("navigation", { name: "Halaman booking" });
    await expect(pager).toBeVisible();
    await pager.getByRole("link", { name: "Halaman 2" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pager.getByRole("link", { name: "Halaman 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // A page past the end shows the last page instead of nothing.
    await page.goto("/admin/bookings?page=999");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("CSV export includes matching rows and neutralizes formulas", async ({ page }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "kasada-dan-fajar-bromo",
    });
    const injection = `=HYPERLINK("http://evil.test","x")`;
    await sql`update bookings set contact_name = ${injection} where code = ${booking.code}`;

    const response = await page.request.get(`${EXPORT_URL}?q=${booking.code}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(
      /attachment; filename="bookings-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(response.headers()["cache-control"]).toContain("no-store");

    const body = await response.text();
    const lines = body.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe(
      "code,status,payment_status,customer_name,customer_email,contact_name,contact_phone,tour,travel_date,participants,total_idr,created_at",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1].startsWith(booking.code)).toBe(true);
    // Leading "=" is prefixed with an apostrophe and the cell is quoted (it has commas/quotes).
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil.test"",""x"")"`);
    expect(lines[1]).not.toContain(`,=HYPERLINK`);

    // The button on the page links to the export with the current filters.
    await page.goto(`/admin/bookings?q=${booking.code}&status=pending`);
    const exportLink = page.getByRole("link", { name: "Ekspor CSV" });
    await expect(exportLink).toHaveAttribute(
      "href",
      new RegExp(`${EXPORT_URL}\\?.*q=${booking.code}`),
    );
    await expect(exportLink).toHaveAttribute("href", /status=pending/);
  });
});

test.describe("CSV export access control", () => {
  test("anonymous visitors get 401", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const response = await anon.get(EXPORT_URL);
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("EJ-");
    await anon.dispose();
  });

  test("travellers get 403", async ({ playwright, baseURL }) => {
    const traveller = await playwright.request.newContext({
      baseURL,
      storageState: STORAGE_STATE.traveler,
    });
    const response = await traveller.get(EXPORT_URL);
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain("EJ-");
    await traveller.dispose();
  });
});

test.describe("public tours pagination", () => {
  const prefix = `e2e-page-${Date.now().toString(36)}`;

  test.beforeAll(async () => {
    // Clone an existing tour a few times so the catalogue spans two pages (12 per page).
    const [{ total }] = await sql<{ total: number }[]>`
      select count(*)::int as total from tours where is_published`;
    const needed = Math.max(0, 13 - total);
    for (let i = 0; i < needed; i++) {
      await sql`
        insert into tours (slug, destination_id, title, summary, description, category,
          duration_days, price_per_person, max_participants, rating, review_count, cover_image,
          gallery, highlights, included, meeting_point, is_published, is_featured)
        select ${`${prefix}-${i}`}, destination_id,
          jsonb_build_object('id', ${`Tur Paginasi ${i}`}::text, 'en', ${`Pagination Tour ${i}`}::text),
          summary, description, category, duration_days, price_per_person, max_participants,
          0, 0, cover_image, gallery, highlights, included, meeting_point, true, false
        from tours where slug = 'jejak-desa-ngadas'`;
    }
  });

  test.afterAll(async () => {
    await sql`delete from tours where slug like ${`${prefix}-%`}`;
  });

  test("page 2 is reachable, numbered and canonical", async ({ page }) => {
    await page.goto("/tours");
    const pager = page.getByRole("navigation", { name: "Halaman hasil tur" });
    await expect(pager).toBeVisible();
    await expect(page.locator("article")).toHaveCount(12);

    await pager.getByRole("link", { name: "Berikutnya" }).click();
    await expect(page).toHaveURL(/\/tours\?page=2$/);
    await expect(pager.getByRole("link", { name: "Halaman 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.locator("article").count()).toBeGreaterThan(0);
    // Crawlers load pages fresh; check the server-rendered canonical.
    await page.reload();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/tours\?page=2$/);

    // Changing a filter starts over at page 1.
    await page.getByRole("button", { name: "Ritual & Upacara" }).first().click();
    await expect(page).not.toHaveURL(/page=/);

    // Out-of-range pages redirect to the last real page (keeping filters).
    // Must be a real HTTP redirect (not a streamed 200 + meta refresh), so
    // crawlers never index an out-of-range page under a false canonical.
    const [{ total }] = await sql<{ total: number }[]>`
      select count(*)::int as total from tours where is_published`;
    const lastPage = Math.ceil(total / 12);
    const raw = await page.request.get("/tours?page=999", { maxRedirects: 0 });
    expect([307, 308]).toContain(raw.status());
    expect(raw.headers().location).toMatch(new RegExp(`/tours\\?page=${lastPage}$`));
    await page.goto("/tours?page=999");
    await expect(page).toHaveURL(new RegExp(`/tours\\?page=${lastPage}$`));
    expect(await page.locator("article").count()).toBeGreaterThan(0);
  });
});
