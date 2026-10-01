import { expect, test } from "@playwright/test";

const PAGES = ["/about", "/faq", "/cancellation-policy", "/privacy", "/terms"] as const;

test.describe("content pages", () => {
  for (const path of PAGES) {
    for (const prefix of ["", "/en"] as const) {
      test(`${prefix}${path} renders`, async ({ page }) => {
        const response = await page.goto(`${prefix}${path}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      });
    }
  }

  test("legal pages show the template notice and contents", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("note")).toContainText("templat");
    await expect(page.getByText(/Terakhir diperbarui/)).toBeVisible();
    await page.getByRole("navigation", { name: "Daftar isi" }).getByRole("link").first().click();
    await expect(page).toHaveURL(/#controller$/);
  });

  test("FAQ items open and close with the keyboard", async ({ page }) => {
    await page.goto("/faq");
    const item = page.locator("details.faq-item").first();
    const summary = item.locator("summary");
    await expect(item).not.toHaveAttribute("open");

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("open", "");
    await expect(item.locator("p")).toBeVisible();

    await page.keyboard.press("Space");
    await expect(item).not.toHaveAttribute("open");
  });

  test("FAQ publishes FAQPage structured data matching the visible questions", async ({ page }) => {
    await page.goto("/faq");
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = scripts
      .map((text) => JSON.parse(text) as { "@type"?: string; mainEntity?: { name: string }[] })
      .find((data) => data["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    const questions = faq!.mainEntity!.map((q) => q.name);
    expect(questions.length).toBe(await page.locator("details.faq-item").count());
    await expect(page.locator("details.faq-item summary").first()).toContainText(questions[0]);
  });

  test("footer links reach the content pages", async ({ page }) => {
    const links: [string, RegExp][] = [
      ["Cerita kami", /\/about$/],
      ["Wisata bertanggung jawab", /\/about#responsible$/],
      ["Pertanyaan umum", /\/faq$/],
      ["Kebijakan pembatalan", /\/cancellation-policy$/],
      ["Kebijakan privasi", /\/privacy$/],
      ["Syarat & ketentuan", /\/terms$/],
    ];
    for (const [name, url] of links) {
      await page.goto("/");
      await page.getByRole("contentinfo").getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
