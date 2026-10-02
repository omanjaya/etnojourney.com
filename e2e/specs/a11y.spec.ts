import { expect, test, type Page } from "@playwright/test";
import { STORAGE_STATE } from "../support/env";

/**
 * Automated WCAG 2.2 AA checks (axe-core). They catch regressions such as
 * contrast, landmarks, heading order and unlabelled controls; keyboard flows
 * are covered by their own specs.
 */
const axePath = require.resolve("axe-core/axe.min.js");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function violations(page: Page, path: string) {
  await page.goto(path);
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (tags) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ...args: unknown[]
          ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>;
        };
      }
    ).axe;
    const result = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  }, TAGS);
}

test.describe("accessibility", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of [
    "/",
    "/tours",
    "/tours/kasada-dan-fajar-bromo",
    "/destinations",
    "/about",
    "/credits",
    "/login",
  ]) {
    test(`public ${path} has no axe violations`, async ({ page }) => {
      expect(await violations(page, path)).toEqual([]);
    });
  }

  test.describe("admin", () => {
    test.use({ storageState: STORAGE_STATE.admin });
    for (const path of [
      "/admin",
      "/admin/bookings",
      "/admin/payments",
      "/admin/availability",
      "/admin/reports",
      "/admin/users",
      "/admin/activity",
    ]) {
      test(`${path} has no axe violations`, async ({ page }) => {
        expect(await violations(page, path)).toEqual([]);
      });
    }
  });
});
