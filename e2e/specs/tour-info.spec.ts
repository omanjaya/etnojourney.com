import { expect, test } from "@playwright/test";
import { sql } from "../support/db";

/**
 * Practical "before you go" information on tour and destination pages.
 * Data is arranged per test and restored afterwards, so the suite does not
 * depend on what the seeded content happens to contain.
 */
const TOUR = "trekking-lembah-baliem";
const DESTINATION = "lembah-baliem";

type Snapshot = {
  difficulty: string;
  not_included: unknown;
  what_to_bring: unknown;
  etiquette: unknown;
  getting_there: unknown;
};
let original: Snapshot;

test.beforeAll(async () => {
  const [row] = await sql<Snapshot[]>`
    select t.difficulty, t.not_included, t.what_to_bring, t.etiquette, d.getting_there
    from tours t join destinations d on d.id = t.destination_id where t.slug = ${TOUR}`;
  original = row;
  await sql`
    update tours set
      difficulty = 'challenging',
      not_included = '[]'::jsonb,
      what_to_bring = ${sql.json([{ id: "Sepatu trekking", en: "Hiking shoes" }])},
      etiquette = ${sql.json([{ id: "Minta izin sebelum memotret", en: "Ask before taking photos" }])}
    where slug = ${TOUR}`;
  await sql`
    update destinations
    set getting_there = ${sql.json({ id: "Terbang ke Wamena via Jayapura.", en: "Fly to Wamena via Jayapura." })}
    where slug = ${DESTINATION}`;
});

test.afterAll(async () => {
  await sql`
    update tours set
      difficulty = ${original.difficulty}::tour_difficulty,
      not_included = ${sql.json(original.not_included as never)},
      what_to_bring = ${sql.json(original.what_to_bring as never)},
      etiquette = ${sql.json(original.etiquette as never)}
    where slug = ${TOUR}`;
  await sql`
    update destinations
    set getting_there = ${original.getting_there === null ? null : sql.json(original.getting_there as never)}
    where slug = ${DESTINATION}`;
});

test.describe("tour practical info", () => {
  test("English tour page shows province, difficulty, before-you-go and not-included", async ({
    page,
  }) => {
    await page.goto(`/en/tours/${TOUR}`);

    await expect(page.getByText("Lembah Baliem, Highland Papua").first()).toBeVisible();

    const facts = page.locator("article dl").first();
    await expect(facts).toContainText("Difficulty");
    await expect(facts).toContainText("Challenging");

    const before = page.locator("section", { has: page.locator("#before-you-go") });
    await expect(before).toContainText("Hiking shoes");
    await expect(before).toContainText("Ask before taking photos");
    await expect(before).toContainText("Fly to Wamena via Jayapura.");

    const maps = before.getByRole("link", { name: "Open in Maps" });
    await expect(maps).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
    );
    await expect(maps).toHaveAttribute("rel", /noopener/);

    // Empty list falls back to the generic exclusions.
    await expect(page.locator("#not-included")).toBeVisible();
    await expect(page.getByText("Flights or transport to the meeting point")).toBeVisible();
  });

  test("Indonesian page keeps the province name and shows the difficulty hint", async ({
    page,
  }) => {
    await page.goto(`/tours/${TOUR}`);
    await expect(page.getByText("Lembah Baliem, Papua Pegunungan").first()).toBeVisible();
    await expect(page.locator("article dl").first()).toContainText("Menantang");
    await expect(page.getByRole("heading", { name: "Persiapan" })).toBeVisible();
  });

  test("destination page shows how to get there", async ({ page }) => {
    await page.goto(`/en/destinations/${DESTINATION}`);
    await expect(page.getByRole("heading", { name: "Getting there" })).toBeVisible();
    await expect(page.getByText("Fly to Wamena via Jayapura.")).toBeVisible();
  });

  test("tour cards flag demanding tours", async ({ page }) => {
    await page.goto(`/en/destinations/${DESTINATION}`);
    const card = page.locator("article", { has: page.locator(`a[href="/en/tours/${TOUR}"]`) });
    await expect(card.first()).toContainText("Challenging");
  });
});
