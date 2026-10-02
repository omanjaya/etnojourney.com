import { expect, test } from "@playwright/test";

test.describe("experience", () => {
  test("home ticker moves at a readable pace", async ({ page }) => {
    await page.goto("/");
    const track = page.locator(".marquee-track");
    // The track never stops moving, so it is never "stable" for Playwright's
    // actionability checks; scroll its static container into view instead.
    await page.locator(".marquee").evaluate((el) => el.scrollIntoView({ block: "center" }));
    // Let the component measure its width and apply the duration.
    await page.waitForTimeout(1000);
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const start = await x();
    await page.waitForTimeout(3000);
    const pxPerSecond = Math.abs((await x()) - start) / 3;
    // Comfortable reading speed; it was ~660 px/s when the duration was ignored.
    expect(pxPerSecond).toBeGreaterThan(15);
    expect(pxPerSecond).toBeLessThan(70);
  });

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
      // Only the HTML matters here; waiting for every image ("load") made this
      // depend on the cold image-optimizer queue of slow CI runners.
      await page.goto("/", { waitUntil: "domcontentloaded" });
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
      // While the panel is visible the bar slides away so it never covers the form.
      const container = page.locator(".ej-rise-in");
      await expect(container).toHaveAttribute("data-hidden", "true");
      await expect(container).not.toBeInViewport();
    });
  });
});
