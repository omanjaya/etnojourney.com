import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { ACCOUNTS, E2E_WHATSAPP, STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate, sql } from "../support/db";

test.use({ storageState: STORAGE_STATE.traveler });

const TOUR_SLUG = "kelas-ukir-dan-lukis-batuan";

/** CRC-32 (PNG chunk checksum). */
function crc32(bytes: Buffer): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A small, valid RGB PNG with a simple gradient (no fixtures on disk). */
function testPng(width = 48, height = 32): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    rows.push(0); // filter: none
    for (let x = 0; x < width; x++) rows.push(180, 83 + y * 3, 42 + x * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test.describe("contact and community", () => {
  test("the tour page links to WhatsApp with the tour title and URL prefilled", async ({
    page,
  }) => {
    await page.goto(`/tours/${TOUR_SLUG}`);
    const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();

    const link = page
      .getByRole("link", { name: "Tanya via WhatsApp tentang tur ini (membuka tab baru)" })
      .filter({ visible: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const href = (await link.getAttribute("href")) ?? "";
    const url = new URL(href);
    expect(`${url.origin}${url.pathname}`).toBe(`https://wa.me/${E2E_WHATSAPP}`);
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain(`"${title}"`);
    expect(text).toMatch(new RegExp(`https?://[^\\s]+/tours/${TOUR_SLUG}$`));

    // The footer contact block links to the same number.
    await expect(
      page.locator("footer").locator(`a[href^="https://wa.me/${E2E_WHATSAPP}"]`),
    ).toHaveCount(1);
  });

  test("a traveller adds a photo to a review; an admin hides it again", async ({
    page,
    browser,
  }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: TOUR_SLUG,
      status: "completed",
      travelDate: jakartaDate(-20 - Math.floor(Math.random() * 300)),
    });
    const text = `Ulasan foto ${booking.code}: anak-anak belajar mengukir bersama pak Wayan.`;
    const author = ACCOUNTS.traveler.name;

    await page.goto("/account");
    const card = page.locator("li").filter({ hasText: booking.code });
    await card.getByRole("button", { name: "Tulis ulasan" }).click();

    const dialog = page.locator("dialog[open]");
    await dialog.getByRole("radio").nth(4).check({ force: true });
    await dialog.locator("textarea").fill(text);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "trip.png",
      mimeType: "image/png",
      buffer: testPng(),
    });
    await expect(dialog.getByRole("button", { name: "Hapus foto 1" })).toBeVisible({
      timeout: 20_000,
    });
    await dialog.getByRole("button", { name: "Kirim ulasan" }).click();
    await expect(dialog.getByText("Terima kasih")).toBeVisible();

    const photos = await sql<{ id: number; path: string; position: number; published: boolean }[]>`
      select p.id, p.path, p.position, r.is_published as published
      from review_photos p
      join reviews r on r.id = p.review_id
      join bookings b on b.id = r.booking_id
      where b.code = ${booking.code}`;
    expect(photos).toHaveLength(1);
    expect(photos[0].position).toBe(0);
    expect(photos[0].published).toBe(true);
    expect(photos[0].path).toMatch(/^\/media\/reviews\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.webp$/);

    // The stored file is the re-encoded WebP, served from storage.
    const media = await page.request.get(photos[0].path);
    expect(media.status()).toBe(200);
    expect(media.headers()["content-type"]).toBe("image/webp");

    // Published review: the thumbnail shows on the tour page and opens the lightbox.
    await page.goto(`/tours/${TOUR_SLUG}`);
    const review = page.locator('section[aria-labelledby="reviews"] li', { hasText: text });
    const thumb = review.getByRole("button", { name: `Lihat foto 1 dari 1 dari ${author}` });
    await expect(thumb).toBeVisible();
    await thumb.click();
    const lightbox = page.locator("dialog[open]");
    await expect(lightbox.getByAltText(`Foto dari ${author}`)).toBeVisible();
    await lightbox.getByRole("button", { name: "Tutup" }).click();

    // An admin hides the photo; it disappears from the tour page.
    const admin = await browser.newContext({ storageState: STORAGE_STATE.admin });
    try {
      const adminPage = await admin.newPage();
      await adminPage.goto(`/admin/reviews?q=${encodeURIComponent(booking.code)}`);
      await adminPage
        .getByRole("button", { name: `Sembunyikan foto 1 dari ${author}` })
        .filter({ visible: true })
        .click();
      await expect(
        adminPage
          .getByRole("button", { name: `Tampilkan foto 1 dari ${author}` })
          .filter({ visible: true }),
      ).toBeVisible();
    } finally {
      await admin.close();
    }

    await expect
      .poll(async () => {
        const [row] = await sql<{ hidden: boolean }[]>`
          select is_hidden as hidden from review_photos where id = ${photos[0].id}`;
        return row.hidden;
      })
      .toBe(true);
    const [audit] = await sql<{ total: number }[]>`
      select count(*)::int as total from audit_logs
      where action = 'review.photo_hidden' and entity_type = 'review'
        and details->>'photoId' = ${String(photos[0].id)}`;
    expect(audit.total).toBe(1);

    await page.goto(`/tours/${TOUR_SLUG}`);
    await expect(page.getByText(text)).toBeVisible();
    await expect(review.getByRole("button", { name: /Lihat foto/ })).toHaveCount(0);
  });
});
