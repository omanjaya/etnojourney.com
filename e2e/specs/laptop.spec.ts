import { expect, test } from "@playwright/test";

/**
 * Key information must be visible without scrolling on common laptop screens
 * (see AGENTS.md: the `short:` variant targets these sizes).
 */
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]) {
  test.describe(`laptop ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("tour detail shows title, price and the date CTA above the fold", async ({ page }) => {
      await page.goto("/tours/kasada-dan-fajar-bromo");
      await expect(page.locator("h1")).toBeInViewport();
      const cta = page.getByRole("link", { name: "Pilih tanggal" }).first();
      await expect(cta).toBeInViewport();
      await expect(page.getByText("Rp 2.400.000").first()).toBeInViewport();

      // The sticky booking panel fits the viewport, so its button is reachable.
      const panelHeight = await page
        .locator("#booking")
        .evaluate((el) => el.getBoundingClientRect().height);
      expect(panelHeight).toBeLessThanOrEqual(viewport.height);
    });

    test("lists show their first result without scrolling", async ({ page }) => {
      await page.goto("/tours");
      await expect(page.locator("main article").first()).toBeInViewport();

      await page.goto("/destinations");
      await expect(page.locator('section#bali a[href^="/destinations/"]').first()).toBeInViewport();

      await page.goto("/destinations/ubud");
      await expect(page.locator("main article").first()).toBeInViewport({ ratio: 0.1 });
    });
  });
}

test.describe("tablet header", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("uses the menu button instead of a crowded inline nav", async ({ page }) => {
    await page.goto("/tours");
    const header = page.locator("header").first();
    await expect(header.getByRole("button", { name: "Buka menu" })).toBeVisible();
    await expect(header.getByRole("navigation", { name: "Main" })).toBeHidden();
    const height = await header.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(90);
  });
});

test.describe("card grid symmetry", () => {
  test.use({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });

  test("tour cards in a row share height and a price baseline", async ({ page }) => {
    await page.goto("/tours");
    const cards = await page.locator("main article").evaluateAll((els) =>
      els.slice(0, 6).map((el) => {
        const price = el.querySelector("p.border-t")!.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return { top: Math.round(box.top), height: Math.round(box.height), price: Math.round(price.top) };
      }),
    );
    const rows = Map.groupBy(cards, (c) => c.top);
    for (const row of rows.values()) {
      expect(new Set(row.map((c) => c.height)).size, "card heights").toBe(1);
      expect(new Set(row.map((c) => c.price)).size, "price rows").toBe(1);
    }
  });
});

/**
 * A 1366x768 screen leaves roughly 1366x625 for the page once browser tabs,
 * the address bar and the taskbar are drawn; the home hero must fit that.
 */
for (const viewport of [
  { width: 1280, height: 600 },
  { width: 1366, height: 625 },
  { width: 1536, height: 730 },
  { width: 1920, height: 945 },
]) {
  test.describe(`home hero ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("fits one screen, stats bar included", async ({ page }) => {
      await page.goto("/");
      const hero = page.locator("main section").first();
      const height = await hero.evaluate((el) => el.getBoundingClientRect().height);
      expect(height).toBeLessThanOrEqual(viewport.height);
      await expect(hero.locator("dl")).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("search")).toBeInViewport({ ratio: 1 });
    });
  });
}
