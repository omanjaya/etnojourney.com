import { expect, test } from "@playwright/test";

test.describe("brand", () => {
  test("pages link the favicon, apple icon and manifest", async ({ page, request }) => {
    await page.goto("/");
    for (const selector of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]']) {
      const href = await page.locator(selector).first().getAttribute("href");
      expect(href, selector).toBeTruthy();
      expect((await request.get(href!)).ok(), href!).toBe(true);
    }

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  });

  test("header shows the logo image", async ({ page }) => {
    await page.goto("/tours");
    const logo = page.locator("header").first().getByRole("img", { name: "EtnoJourney" });
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });
});
