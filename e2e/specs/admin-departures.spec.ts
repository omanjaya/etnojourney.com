import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { registerNewUser } from "../support/auth";
import { createBooking, jakartaDate, sql } from "../support/db";
import { BASE_URL, STORAGE_STATE } from "../support/env";

const TOUR_SLUG = "dapur-desa-keluarga-bali";

async function pageAs(browser: Browser, storageState?: string): Promise<Page> {
  const context = await browser.newContext(storageState ? { storageState } : {});
  return context.newPage();
}

/**
 * A departure inside the default agenda window (today + 30 days) with one
 * confirmed booking, and a fresh active guide covering the tour's destination.
 * The guides UI is built separately, so the guide is inserted directly.
 */
async function arrangeDeparture() {
  const [tour] = await sql<{ id: number; destinationId: number }[]>`
    select id, destination_id as "destinationId" from tours where slug = ${TOUR_SLUG}`;
  const date = jakartaDate(5 + randomInt(20));
  // Start from a clean departure even if an earlier run assigned someone.
  await sql`delete from departure_assignments where tour_id = ${tour.id} and date = ${date}`;
  const booking = await createBooking({
    email: "traveler@etnojourney.id",
    tourSlug: TOUR_SLUG,
    status: "confirmed",
    travelDate: date,
    participants: 3,
  });
  const guideName = `E2E Pemandu ${randomUUID().slice(0, 8)}`;
  const [guide] = await sql<{ id: number }[]>`
    insert into guides (name, phone, email, languages, is_active)
    values (${guideName}, '081298765432', ${`guide-${randomUUID()}@example.test`}, '{id}', true)
    returning id`;
  await sql`insert into guide_destinations (guide_id, destination_id)
            values (${guide.id}, ${tour.destinationId})`;
  return { tourId: tour.id, date, booking, guideId: guide.id, guideName };
}

test.describe("admin departures", () => {
  test("agenda shows a departure without a guide; assigning a guide and a note is audited", async ({
    browser,
  }) => {
    const { tourId, date, booking, guideName } = await arrangeDeparture();
    const admin = await pageAs(browser, STORAGE_STATE.admin);
    // Earlier runs may have audited the same departure; only look at this run.
    const [{ startedAt }] = await sql<{ startedAt: Date }[]>`select now() as "startedAt"`;

    // Default agenda (today + 30 days) lists it with a clear "no guide" warning.
    await admin.goto(`/admin/departures?tour=${tourId}`);
    await expect(admin.locator("h1")).toContainText("Keberangkatan");
    const row = admin
      .getByTestId("departure-row")
      .filter({ has: admin.locator(`a[href$="/admin/departures/${tourId}/${date}"]`) });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Belum ada pemandu");

    // The "without guide" filter keeps it.
    await admin.goto(`/admin/departures?tour=${tourId}&from=${date}&to=${date}&noGuide=1`);
    await expect(admin.getByTestId("departure-row")).toHaveCount(1);

    // Detail: the manifest lists the booking.
    await admin.getByTestId("departure-row").getByRole("link").first().click();
    await expect(admin).toHaveURL(new RegExp(`/admin/departures/${tourId}/${date}$`));
    const manifestRow = admin.getByTestId("manifest-row").filter({ hasText: booking.code });
    await expect(manifestRow).toBeVisible();
    await expect(manifestRow).toContainText("E2E Traveller");
    await expect(manifestRow.locator('a[href^="tel:"]')).toHaveAttribute(
      "href",
      "tel:081234567890",
    );

    // Assign the (suggested) guide.
    await admin.locator("#departure-guide").selectOption({ label: guideName });
    await admin.getByRole("button", { name: "Tugaskan", exact: true }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Pemandu ditugaskan" })).toBeVisible();

    // Save an operational note.
    await admin.locator("#departure-note").fill("Kumpul pukul 07.00 di balai desa.");
    await admin.getByRole("button", { name: "Simpan catatan" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Catatan disimpan" })).toBeVisible();

    // Both changes are in the audit log under the departure's entity id.
    const entityId = `${tourId}:${date}`;
    await expect
      .poll(async () => {
        const rows = await sql<{ action: string }[]>`
          select action from audit_logs
          where entity_type = 'departure' and entity_id = ${entityId}
            and created_at >= ${startedAt}`;
        return rows.map((r) => r.action).sort();
      })
      .toEqual(["departure.assigned", "departure.noted"]);
    const [assignment] = await sql<{ note: string; guideName: string }[]>`
      select a.note, g.name as "guideName" from departure_assignments a
      join guides g on g.id = a.guide_id
      where a.tour_id = ${tourId} and a.date = ${date}`;
    expect(assignment).toEqual({ note: "Kumpul pukul 07.00 di balai desa.", guideName });

    // Send the manifest by email; notifiedAt and the audit entry are recorded.
    admin.once("dialog", (dialog) => dialog.accept());
    await admin.getByRole("button", { name: "Kirim manifest ke pemandu" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Manifest terkirim" })).toBeVisible();
    const [{ notified }] = await sql<{ notified: boolean }[]>`
      select notified_at is not null as notified from departure_assignments
      where tour_id = ${tourId} and date = ${date}`;
    expect(notified).toBe(true);

    // WhatsApp summary link targets the guide's number in international format.
    await admin.reload();
    await expect(admin.getByRole("link", { name: "Kirim ringkasan via WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/6281298765432\?text=/,
    );

    // The agenda now shows the guide instead of the warning.
    await admin.goto(`/admin/departures?tour=${tourId}&from=${date}&to=${date}`);
    await expect(admin.getByTestId("departure-row")).toContainText(guideName);
    await expect(admin.getByTestId("departure-row")).not.toContainText("Belum ada pemandu");
  });

  test("manifest CSV downloads with the booking and no prices", async ({ browser }) => {
    const { tourId, date, booking } = await arrangeDeparture();
    const admin = await pageAs(browser, STORAGE_STATE.admin);
    await admin.goto(`/admin/departures/${tourId}/${date}`);

    const downloadPromise = admin.waitForEvent("download");
    await admin.getByRole("link", { name: "Unduh CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`manifest-${TOUR_SLUG}-${date}.csv`);

    const response = await admin.request.get(`/api/admin/departures/${tourId}/${date}/export`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const body = await response.text();
    expect(body).toContain("code,status,payment_status,contact_name,contact_phone,participants");
    expect(body).toContain(`${booking.code},confirmed,`);
    expect(body).not.toContain("total");
  });

  test("staff can open departures; a traveller cannot", async ({ browser }) => {
    const { tourId, date } = await arrangeDeparture();

    const staff = await pageAs(browser);
    const { email } = await registerNewUser(staff, "e2e-departures-staff");
    await sql`update "user" set role = 'staff' where email = ${email}`;
    await staff.goto("/admin/departures");
    await expect(staff).toHaveURL(/\/admin\/departures$/);
    await expect(staff.locator("h1")).toContainText("Keberangkatan");
    await staff.goto(`/admin/departures/${tourId}/${date}`);
    await expect(staff.getByRole("heading", { name: "Manifest" })).toBeVisible();
    const staffCsv = await staff.request.get(`/api/admin/departures/${tourId}/${date}/export`);
    expect(staffCsv.status()).toBe(200);

    const traveller = await pageAs(browser, STORAGE_STATE.traveler);
    for (const path of ["/admin/departures", `/admin/departures/${tourId}/${date}`]) {
      await traveller.goto(path);
      await expect(traveller, path).toHaveURL(`${BASE_URL}/`);
    }
    const travellerCsv = await traveller.request.get(
      `/api/admin/departures/${tourId}/${date}/export`,
    );
    expect(travellerCsv.status()).toBe(403);
  });

  test("dashboard links to departures without a guide", async ({ browser }) => {
    const admin = await pageAs(browser, STORAGE_STATE.admin);
    await admin.goto("/admin");
    const card = admin.getByRole("link", { name: /Keberangkatan 7 hari ke depan tanpa pemandu/ });
    await expect(card).toBeVisible();
    await card.click();
    await expect(admin).toHaveURL(/\/admin\/departures\?.*noGuide=1/);
  });
});
