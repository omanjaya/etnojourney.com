import { expect, test } from "@playwright/test";
import { STORAGE_STATE } from "../support/env";
import { sql } from "../support/db";

/**
 * Admin edits a tour's practical "before you go" info and the public tour
 * page shows it. The tour's original values are restored afterwards.
 */
const SLUG = "trekking-subak-jatiluwih";

test.use({ storageState: STORAGE_STATE.admin });

test.describe("admin practical info", () => {
  let original: {
    id: number;
    difficulty: string;
    not_included: unknown;
    what_to_bring: unknown;
    etiquette: unknown;
  };

  test.beforeAll(async () => {
    [original] = await sql<(typeof original)[]>`
      select id, difficulty, not_included, what_to_bring, etiquette from tours where slug = ${SLUG}`;
  });

  test.afterAll(async () => {
    await sql`
      update tours set
        difficulty = ${original.difficulty}::tour_difficulty,
        not_included = ${sql.json(original.not_included as never)},
        what_to_bring = ${sql.json(original.what_to_bring as never)},
        etiquette = ${sql.json(original.etiquette as never)}
      where id = ${original.id}`;
  });

  test("difficulty and lists saved in the admin appear on the tour page", async ({ page }) => {
    const marker = Date.now().toString(36);
    await page.goto(`/admin/tours/${original.id}/edit`);

    await page.locator("#difficulty").selectOption("challenging");
    await page.locator("#whatToBring-id").fill(`Jas hujan ${marker}\nSepatu trekking`);
    await page.locator("#whatToBring-en").fill(`Rain jacket ${marker}\nHiking shoes`);
    await page.locator("#notIncluded-id").fill(`Tiket pesawat ${marker}`);
    await page.locator("#notIncluded-en").fill(`Flights ${marker}`);
    await page.locator("#etiquette-id").fill(`Berpakaian sopan ${marker}`);
    await page.locator("#etiquette-en").fill(`Dress modestly ${marker}`);
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page).toHaveURL(/\/admin\/tours$/);

    // Persisted and prefilled when editing again.
    await page.goto(`/admin/tours/${original.id}/edit`);
    await expect(page.locator("#difficulty")).toHaveValue("challenging");
    await expect(page.locator("#whatToBring-en")).toHaveValue(
      `Rain jacket ${marker}\nHiking shoes`,
    );

    // Shown to travellers on the public tour page.
    await page.goto(`/tours/${SLUG}`);
    await expect(page.getByText(`Jas hujan ${marker}`).first()).toBeVisible();
    await expect(page.getByText(`Tiket pesawat ${marker}`).first()).toBeVisible();
    await expect(page.getByText(`Berpakaian sopan ${marker}`).first()).toBeVisible();
    await expect(page.getByText("Menantang").first()).toBeVisible();
  });

  test("Indonesian and English lines must pair up", async ({ page }) => {
    await page.goto(`/admin/tours/${original.id}/edit`);
    await page.locator("#etiquette-id").fill("Satu\nDua");
    await page.locator("#etiquette-en").fill("One");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Periksa kembali isian yang ditandai.")).toBeVisible();
    await expect(page).toHaveURL(/\/edit$/);
  });
});
