import { expect, test, type Page } from "@playwright/test";

/** "20 tur ditemukan · …" → 20 (0 when nothing matched). */
async function resultCount(page: Page): Promise<number> {
  const text = await page.locator("p[aria-live='polite']").first().innerText();
  return Number(text.match(/(\d+)\s+tur/)?.[1] ?? 0);
}

test.describe("tour discovery", () => {
  test("an island name finds every tour there, combined with price and duration", async ({
    page,
  }) => {
    await page.goto("/tours?q=Bali&maxPrice=1000000&duration=1");
    expect(await resultCount(page)).toBeGreaterThanOrEqual(10);
  });

  test("province and region words match destinations, not just titles", async ({ page }) => {
    await page.goto("/tours?q=Sulawesi");
    await expect(page.getByRole("heading", { name: /Toraja/ }).first()).toBeVisible();

    await page.goto("/tours?q=eastern%20indonesia");
    expect(await resultCount(page)).toBeGreaterThanOrEqual(5);
  });

  test("island filter narrows results and the destination list", async ({ page }) => {
    await page.goto("/tours");
    await page.selectOption("#filter-island", "bali");
    await expect(page).toHaveURL(/island=bali/);
    await expect(page.locator('#filter-destination option[value="ubud"]')).toHaveCount(1);
    await expect(page.locator('#filter-destination option[value="tana-toraja"]')).toHaveCount(0);
    expect(await resultCount(page)).toBeGreaterThanOrEqual(10);
  });

  test("duration buckets and longest-first sort", async ({ page }) => {
    await page.goto("/tours?duration=4%2B&sort=longest");
    const days = await page
      .locator("article")
      .evaluateAll((cards) => cards.map((c) => Number(c.textContent?.match(/(\d+) hari/)?.[1])));
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((d) => d >= 4)).toBe(true);
    expect(days).toEqual([...days].sort((a, b) => b - a));
  });

  test("old 'up to N days' links still work", async ({ page }) => {
    const response = await page.goto("/tours?maxDays=1");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#filter-duration")).toHaveValue("1");
  });
});

test.describe("tour discovery on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("filters open in a bottom sheet and apply from there", async ({ page }) => {
    await page.goto("/tours");
    // Category pills stay visible; the other filters are tucked away.
    await expect(page.getByRole("button", { name: "Semua kategori" })).toBeVisible();
    await expect(page.locator("#filter-island")).toBeHidden();

    const toggle = page.getByRole("button", { name: /^Filter/ });
    await toggle.click();
    const sheet = page.getByRole("dialog", { name: "Filter tur" });
    await expect(sheet).toBeVisible();
    await expect(page.locator("#filter-island")).toBeFocused();

    await page.selectOption("#filter-island", "bali");
    await expect(page).toHaveURL(/island=bali/);
    const apply = sheet.getByRole("button", { name: /Tampilkan \d+ tur/ });
    await expect(apply).toBeVisible();
    await apply.click();
    await expect(sheet).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(toggle).toContainText("1");
  });

  test("Escape closes the sheet", async ({ page }) => {
    await page.goto("/tours");
    await page.getByRole("button", { name: /^Filter/ }).click();
    await expect(page.getByRole("dialog", { name: "Filter tur" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Filter tur" })).toBeHidden();
  });
});
