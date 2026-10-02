import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, sql } from "../support/db";

const idr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

test.describe("admin insights", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("reply to a review and see it on the tour page", async ({ page }) => {
    const slug = "jejak-desa-ngadas";
    const author = `E2E Reviewer ${randomUUID().slice(0, 8)}`;
    const replyText = `Terima kasih atas kunjungannya, ${author}.`;
    const [{ id: tourId }] = await sql<{ id: number }[]>`select id from tours where slug = ${slug}`;
    const [review] = await sql<{ id: number }[]>`
      insert into reviews (tour_id, author_name, country, rating, body, language)
      values (${tourId}, ${author}, 'Indonesia', 5,
              ${sql.json({ id: "Pengalaman yang sangat berkesan bersama warga desa.", en: "A memorable stay with the villagers." })},
              'id')
      returning id`;

    await page.goto(`/admin/reviews?q=${encodeURIComponent(author)}`);
    await page
      .getByRole("button", { name: `Balas ulasan dari ${author}` })
      .filter({ visible: true })
      .click();
    await page
      .getByRole("textbox", { name: `Balasan publik untuk ${author}` })
      .filter({ visible: true })
      .fill(replyText);
    await page.getByRole("button", { name: "Terbitkan balasan" }).filter({ visible: true }).click();
    await expect(
      page.getByRole("button", { name: `Ubah balasan untuk ${author}` }).filter({ visible: true }),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const [row] = await sql<{ reply: string | null }[]>`
          select reply from reviews where id = ${review.id}`;
        return row.reply;
      })
      .toBe(replyText);
    const [audit] = await sql<{ total: number }[]>`
      select count(*)::int as total from audit_logs
      where action = 'review.replied' and entity_type = 'review' and entity_id = ${String(review.id)}`;
    expect(audit.total).toBe(1);

    await page.goto(`/tours/${slug}`);
    const card = page.locator('section[aria-labelledby="reviews"] li', { hasText: author });
    await expect(card.getByText("Balasan dari tim EtnoJourney")).toBeVisible();
    await expect(card.getByText(replyText)).toBeVisible();

    // Removing the reply takes it off the tour page.
    await page.goto(`/admin/reviews?q=${encodeURIComponent(author)}`);
    await page
      .getByRole("button", { name: `Hapus balasan untuk ${author}` })
      .filter({ visible: true })
      .click();
    await page.getByRole("button", { name: "Ya, hapus" }).filter({ visible: true }).click();
    await expect(
      page.getByRole("button", { name: `Balas ulasan dari ${author}` }).filter({ visible: true }),
    ).toBeVisible();
    await page.goto(`/tours/${slug}`);
    await expect(page.getByText(replyText)).toHaveCount(0);
  });

  test("reports page renders numbers for the seeded data", async ({ page }) => {
    await page.goto("/admin/reports?period=this-year");
    await expect(page.getByRole("heading", { level: 1, name: "Laporan" })).toBeVisible();
    // Seed: confirmed and completed bookings were paid today.
    await expect(page.getByTestId("report-net")).not.toHaveText(idr(0));
    await expect(page.getByTestId("report-bookings")).not.toHaveText("0");
    const tours = page.locator("section", { has: page.locator("#report-tours") });
    await expect(
      tours.getByRole("link", { name: "Fajar Borobudur dan Batik Tulis" }),
    ).toBeVisible();
    await expect(page.getByText("Terkonfirmasi").first()).toBeVisible();

    const csv = await page.request.get("/api/admin/reports/export?period=this-year");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const body = await csv.text();
    expect(body).toContain("tour_slug,tour_title_id,tour_title_en");
    expect(body).toContain("borobudur-fajar-dan-batik-tulis");
  });

  test("revenue for a custom period is paid minus refunded", async ({ page }) => {
    // A quiet period no other test touches.
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "kasada-dan-fajar-bromo",
      status: "confirmed",
    });
    await sql`update bookings set created_at = '2020-01-05T03:00:00Z' where id = ${booking.id}`;
    await sql`
      insert into payments (booking_id, provider, order_id, amount, status, paid_at)
      values (${booking.id}, 'midtrans', ${`${booking.code}-paid`}, ${booking.total}, 'paid',
              '2020-01-15T03:00:00Z')`;
    await sql`
      insert into payments (booking_id, provider, order_id, amount, status, paid_at, refunded_at)
      values (${booking.id}, 'midtrans', ${`${booking.code}-dup`}, 1000000, 'refunded',
              '2020-01-12T03:00:00Z', '2020-01-20T03:00:00Z')`;

    await page.goto("/admin/reports?period=custom&from=2020-01-01&to=2020-01-31");
    await expect(page.getByTestId("report-net")).toHaveText(idr(booking.total));
    await expect(page.getByTestId("report-bookings")).toHaveText("1");
    await expect(page.getByText(idr(1_000_000)).first()).toBeVisible();
  });

  test("edit a photo credit", async ({ page }) => {
    const [credit] = await sql<
      { path: string; title: string; author: string; source_url: string }[]
    >`
      select path, title, author, source_url from photo_credits order by path limit 1`;
    const newAuthor = `E2E Photographer ${randomUUID().slice(0, 6)}`;
    try {
      await page.goto(`/admin/credits?q=${encodeURIComponent(credit.path)}`);
      await page.getByRole("button", { name: `Ubah kredit untuk ${credit.title}` }).click();

      // URLs must be https.
      await page.getByLabel("Tautan sumber").fill("http://example.com/photo");
      await page.getByRole("button", { name: "Simpan kredit" }).click();
      await expect(page.getByText("Masukkan tautan lengkap yang diawali https://.")).toBeVisible();

      await page.getByLabel("Tautan sumber").fill(credit.source_url);
      await page.getByLabel("Pembuat").fill(newAuthor);
      await page.getByRole("button", { name: "Simpan kredit" }).click();
      await expect(page.getByText(newAuthor)).toBeVisible();

      await expect
        .poll(async () => {
          const [row] = await sql<{ author: string }[]>`
            select author from photo_credits where path = ${credit.path}`;
          return row.author;
        })
        .toBe(newAuthor);

      await page.goto("/credits");
      await expect(page.getByText(newAuthor)).toBeVisible();
    } finally {
      await sql`update photo_credits set author = ${credit.author} where path = ${credit.path}`;
    }
  });
});

test.describe("admin insights access", () => {
  test.use({ storageState: STORAGE_STATE.traveler });

  test("travellers cannot open reports or credits, or export", async ({ page }) => {
    const response = await page.request.get("/api/admin/reports/export");
    expect(response.status()).toBe(403);
    for (const path of ["/admin/reports", "/admin/credits"]) {
      await page.goto(path);
      await expect(page, path).not.toHaveURL(/\/admin/);
    }
  });
});
