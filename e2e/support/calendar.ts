import { expect, type Page } from "@playwright/test";

/** Pages the availability calendar forward until `date` (YYYY-MM-DD) is shown. */
export async function showCalendarDate(page: Page, date: string) {
  const day = page.locator(`[data-date="${date}"]`);
  const next = page.getByRole("button", { name: /Bulan berikutnya|Next month/ });
  // The first month loads asynchronously.
  await expect(page.locator("[data-date]").first()).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 14 && !(await day.isVisible()); i++) {
    await next.click();
    await expect(page.locator("[data-date]").first()).toBeVisible({ timeout: 15_000 });
  }
  await expect(day).toBeVisible();
  return day;
}

/** Picks a travel date through the calendar UI. */
export async function pickTravelDate(page: Page, date: string) {
  const day = await showCalendarDate(page, date);
  await day.click();
  await expect(page.locator('input[name="travelDate"]')).toHaveValue(date);
}

/**
 * Writes a date straight into the form, bypassing the calendar's rules, to
 * prove the server enforces them. Call after filling the other fields.
 */
export async function forceTravelDate(page: Page, date: string) {
  await page
    .locator('input[name="travelDate"]')
    .evaluate((el, value) => ((el as HTMLInputElement).value = value), date);
}
