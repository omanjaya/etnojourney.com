import { expect, test } from "@playwright/test";

test.describe("public browsing", () => {
  test("home shows the hero, featured tours and destinations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Pulang membawa");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.locator('a[href^="/destinations/"]').first()).toBeVisible();
  });

  test("category filter narrows the tour list and updates the URL", async ({ page }) => {
    await page.goto("/tours");
    await page
      .getByRole("button", { name: "Kriya & Wastra" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/category=craft/);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) await expect(card).toContainText("Kriya & Wastra");
  });

  test("search by keyword finds matching tours", async ({ page }) => {
    await page.goto("/tours?q=bromo");
    await expect(page.locator("article").first()).toContainText(/Bromo|Tengger/);
  });

  test("invalid filter values are ignored instead of breaking the page", async ({ page }) => {
    const response = await page.goto("/tours?maxPrice=abc&category=nope&sort=priceAsc");
    expect(response?.status()).toBe(200);
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("tour detail renders content, booking CTA and structured data", async ({ page }) => {
    await page.goto("/tours/kasada-dan-fajar-bromo");
    await expect(page.locator("h1")).toHaveText("Tradisi Tengger dan Fajar di Bromo");
    // Signed-out visitors are invited to log in before booking.
    await expect(page.getByRole("link", { name: "Masuk dan pesan" }).first()).toBeVisible();
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.join("\n")).toContain("TouristTrip");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/tours\/kasada-dan-fajar-bromo$/,
    );
  });

  test("destinations list links to a destination page with its tours", async ({ page }) => {
    await page.goto("/destinations");
    await page.locator('a[href="/destinations/yogyakarta"]').first().click();
    await expect(page).toHaveURL(/\/destinations\/yogyakarta$/);
    await expect(page.locator("h1")).toContainText("Yogyakarta");
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("unknown tour and unknown paths return a branded 404", async ({ page }) => {
    for (const path of ["/tours/does-not-exist", "/some/unknown/path"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByText("Jalan ini belum dipetakan")).toBeVisible();
    }
  });
});
