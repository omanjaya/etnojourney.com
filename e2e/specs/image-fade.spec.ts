import { expect, test } from "@playwright/test";

test.describe("photo fade-in", () => {
  test("a slow photo stays hidden while loading, then fades in", async ({ page }) => {
    await page.route(/\/images\/content\/.+\.webp/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    const img = page.locator("main article img").first();
    const opacity = () => img.evaluate((el) => Number(getComputedStyle(el).opacity));

    expect(await opacity()).toBe(0);
    await expect.poll(opacity, { timeout: 10_000 }).toBe(1);
  });

  test("reduced motion shows photos without the effect", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    const img = page.locator("main article img").first();
    expect(await img.evaluate((el) => el.getAnimations().length)).toBe(0);
    await context.close();
  });
});
