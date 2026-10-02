import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, registerNewUser } from "../support/auth";
import { createBooking, sql, uniqueFutureDate, userIdByEmail } from "../support/db";
import { ACCOUNTS, BASE_URL, STORAGE_STATE } from "../support/env";

// Fresh accounts and guides per test: seeded accounts are shared by other specs.

async function adminPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: STORAGE_STATE.admin });
  return context.newPage();
}

/** Fills and submits the new-guide form; returns the new guide's id. */
async function createGuide(page: Page, name: string): Promise<number> {
  await page.goto("/admin/guides/new");
  await page.locator("#name").fill(name);
  await page.locator("#organization").fill("Desa Uji Coba");
  await page.locator("#phone").fill("0812 3456 7890");
  await page.locator("#email").fill("Guide-E2E@Example.test");
  await page.locator("#languages-en").check();
  await page.locator('input[id^="destinationIds-"]').first().check();
  await page.getByRole("button", { name: "Simpan pemandu" }).click();
  await expect(page).toHaveURL(/\/admin\/guides\/\d+\/edit$/, { timeout: 20_000 });
  return Number(page.url().match(/\/admin\/guides\/(\d+)\/edit$/)![1]);
}

async function deleteGuide(guideId: number | undefined) {
  if (!guideId) return;
  await sql`delete from departure_assignments where guide_id = ${guideId}`;
  await sql`delete from guides where id = ${guideId}`;
}

test.describe("guides and partner portal", () => {
  test("admin links a partner, who sees only their own departure without prices", async ({
    browser,
  }) => {
    const partnerPage = await (await browser.newContext()).newPage();
    const { email, password } = await registerNewUser(partnerPage, "e2e-partner");
    const partnerId = await userIdByEmail(email);
    const admin = await adminPage(browser);

    const [tour] = await sql<{ id: number; slug: string }[]>`
      select id, slug from tours where is_published order by id limit 1`;
    const date = uniqueFutureDate();
    let otherDate = uniqueFutureDate();
    while (otherDate === date) otherDate = uniqueFutureDate();

    let guideId: number | undefined;
    let bookingCode: string | undefined;
    const assignmentIds: number[] = [];
    try {
      const name = `E2E Pemandu ${randomUUID().slice(0, 8)}`;
      guideId = await createGuide(admin, name);

      // Stored normalised, with its destination.
      const [stored] = await sql<{ phone: string; email: string; languages: string[] }[]>`
        select phone, email, languages from guides where id = ${guideId}`;
      expect(stored.phone).toBe("+6281234567890");
      expect(stored.email).toBe("guide-e2e@example.test");
      expect(stored.languages).toEqual(["id", "en"]);
      const [{ destinations }] = await sql<{ destinations: number }[]>`
        select count(*)::int as destinations from guide_destinations where guide_id = ${guideId}`;
      expect(destinations).toBe(1);

      // Listed and searchable.
      await admin.goto(`/admin/guides?q=${encodeURIComponent(name)}`);
      await expect(admin.getByText(name).filter({ visible: true }).first()).toBeVisible();

      // A back-office account can never become a partner.
      await admin.goto(`/admin/guides/${guideId}/edit`);
      await admin.locator("#partner-email").fill(ACCOUNTS.admin.email);
      await admin.getByRole("button", { name: "Hubungkan akun" }).click();
      await expect(admin.getByRole("alert").filter({ hasText: "staf atau admin" })).toBeVisible();

      // Link the freshly registered account: it becomes a partner and is signed out.
      await admin.locator("#partner-email").fill(email.toUpperCase());
      await admin.getByRole("button", { name: "Hubungkan akun" }).click();
      await expect(admin.getByRole("status").filter({ hasText: "Akun terhubung" })).toBeVisible();
      const [{ role }] = await sql<
        { role: string }[]
      >`select role from "user" where id = ${partnerId}`;
      expect(role).toBe("partner");
      const [{ sessions }] = await sql<{ sessions: number }[]>`
        select count(*)::int as sessions from session where user_id = ${partnerId}`;
      expect(sessions).toBe(0);

      // One departure assigned to this guide (with a confirmed booking), one to nobody.
      const [mine] = await sql<{ id: number }[]>`
        insert into departure_assignments (tour_id, date, guide_id, note)
        values (${tour.id}, ${date}, ${guideId}, 'Kumpul 07.00 di lobi')
        returning id`;
      const [other] = await sql<{ id: number }[]>`
        insert into departure_assignments (tour_id, date, guide_id, note)
        values (${tour.id}, ${otherDate}, null, 'Bukan untuk mitra ini')
        returning id`;
      assignmentIds.push(mine.id, other.id);
      const booking = await createBooking({
        email: ACCOUNTS.traveler.email,
        tourSlug: tour.slug,
        status: "confirmed",
        travelDate: date,
        participants: 3,
      });
      bookingCode = booking.code;

      // The partner signs in again and sees the departure in the portal.
      await login(partnerPage, email, password);
      await partnerPage.goto("/partner");
      await expect(partnerPage.getByRole("link", { name: "Portal mitra" }).first()).toBeVisible();
      const card = partnerPage.locator(`a[href$="/partner/departures/${tour.id}/${date}"]`);
      await expect(card).toBeVisible();
      await expect(partnerPage.locator(`a[href*="/${otherDate}"]`)).toHaveCount(0);

      await card.click();
      await expect(partnerPage).toHaveURL(new RegExp(`/partner/departures/${tour.id}/${date}$`));
      const main = partnerPage.locator("main");
      await expect(main).toContainText(booking.code);
      await expect(main).toContainText("Kumpul 07.00 di lobi");
      await expect(main).toContainText("081234567890");
      // No prices, payments or traveller emails.
      await expect(main).not.toContainText("Rp");
      await expect(main).not.toContainText(ACCOUNTS.traveler.email);

      // Departures that aren't theirs are a 404, as are malformed URLs.
      for (const path of [
        `/partner/departures/${tour.id}/${otherDate}`,
        `/partner/departures/${tour.id}/2026-02-30`,
        `/partner/departures/abc/${date}`,
      ]) {
        const response = await partnerPage.goto(path);
        expect(response?.status(), path).toBe(404);
      }

      // Partners have no back office.
      await partnerPage.goto("/admin");
      await expect(partnerPage).toHaveURL(`${BASE_URL}/`);
      await partnerPage.goto("/admin/guides");
      await expect(partnerPage).toHaveURL(`${BASE_URL}/`);

      // Unlinking returns the account to traveller and closes the portal.
      await admin.goto(`/admin/guides/${guideId}/edit`);
      admin.once("dialog", (dialog) => dialog.accept());
      await admin.getByRole("button", { name: "Lepaskan akun" }).click();
      await expect(admin.getByRole("status").filter({ hasText: "Akun dilepaskan" })).toBeVisible();
      const [after] = await sql<
        { role: string }[]
      >`select role from "user" where id = ${partnerId}`;
      expect(after.role).toBe("user");
      await partnerPage.goto("/partner");
      await expect(partnerPage).toHaveURL(/\/login/);
    } finally {
      if (bookingCode) await sql`delete from bookings where code = ${bookingCode}`;
      if (assignmentIds.length) {
        await sql`delete from departure_assignments where id in ${sql(assignmentIds)}`;
      }
      await sql`update guides set user_id = null where user_id = ${partnerId}`;
      await sql`update "user" set role = 'user' where id = ${partnerId}`;
      await deleteGuide(guideId);
    }
  });

  test("staff can manage guides but cannot link portal accounts", async ({ browser }) => {
    const staffPage = await (await browser.newContext()).newPage();
    const { email } = await registerNewUser(staffPage, "e2e-guides-staff");
    const staffId = await userIdByEmail(email);
    await sql`update "user" set role = 'staff' where id = ${staffId}`;

    let guideId: number | undefined;
    try {
      await staffPage.goto("/admin/guides");
      await expect(staffPage.locator("h1")).toContainText("Pemandu");

      guideId = await createGuide(staffPage, `E2E Staf ${randomUUID().slice(0, 8)}`);

      // Editing works.
      await staffPage.locator("#notes").fill("Hanya bisa hari kerja.");
      await staffPage.getByRole("button", { name: "Simpan perubahan" }).click();
      await expect(
        staffPage.getByRole("status").filter({ hasText: "Data pemandu disimpan" }),
      ).toBeVisible();
      const [{ notes }] = await sql<{ notes: string }[]>`
        select notes from guides where id = ${guideId}`;
      expect(notes).toBe("Hanya bisa hari kerja.");

      // Linking is admin-only: no form, and the users page stays closed.
      await expect(staffPage.locator("#partner-email")).toHaveCount(0);
      await expect(
        staffPage.getByText("Hanya admin yang dapat menghubungkan akun portal."),
      ).toBeVisible();
      await staffPage.goto("/admin/users");
      await expect(staffPage).toHaveURL(`${BASE_URL}/`);
    } finally {
      await deleteGuide(guideId);
      await sql`update "user" set role = 'user' where id = ${staffId}`;
    }
  });
});
