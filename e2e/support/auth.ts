import { expect, type Page } from "@playwright/test";

/** Signs in through the real login form and waits until we've left /login. */
export async function login(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 20_000 });
}

/** Registers a brand-new traveller through the UI and returns the credentials. */
export async function registerNewUser(page: Page, prefix = "e2e") {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
  const password = "E2e-Password-123";
  await page.goto("/register");
  await page.locator("#name").fill("E2E Tester");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
  return { email, password };
}
