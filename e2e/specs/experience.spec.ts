import { expect, test } from "@playwright/test";

test.describe("experience", () => {
  test("language switch keeps the current page", async ({ page }) => {
    await page.goto("/tours/kasada-dan-fajar-bromo");
    await page
      .getByRole("button", { name: /English/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/tours\/kasada-dan-fajar-bromo$/);
    await expect(page.locator("h1")).toHaveText("Tengger Traditions and Dawn at Bromo");
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("hero content is fully visible immediately", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("search")).toBeVisible();
      const hidden = await page.evaluate(
        () =>
          [...document.querySelectorAll("h1 [data-word]")].filter(
            (el) => Number(getComputedStyle(el).opacity) < 0.99,
          ).length,
      );
      expect(hidden).toBe(0);
      await page.mouse.wheel(0, 2500);
      expect(await page.locator('[data-reveal="pending"]').count()).toBe(0);
    });
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("server HTML already contains the content", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("h1")).toContainText("Pulang membawa");
      await expect(page.locator("article").first()).toBeVisible();
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const path of [
      "/",
      "/tours",
      "/tours/kasada-dan-fajar-bromo",
      "/destinations",
      "/login",
    ]) {
      test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test("tour detail has a sticky booking bar that jumps to the panel", async ({ page }) => {
      await page.goto("/tours/kasada-dan-fajar-bromo");
      const bar = page
        .getByRole("link", { name: /Pesan sekarang/ })
        .filter({ visible: true })
        .first();
      await expect(bar).toBeVisible();
      await bar.click();
      await expect(page.locator("#booking")).toBeInViewport();
    });
  });
});
