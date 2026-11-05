import { expect, test } from "@playwright/test";
import { login, registerNewUser } from "../support/auth";

test.describe("authentication", () => {
  test("wrong credentials show a generic error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(`nobody-${Date.now()}@example.test`);
    await page.locator("#password").fill("wrong-password-1");
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('form [role="alert"]')).toContainText("Email atau kata sandi salah");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a new traveller can register and lands on their account", async ({ page }) => {
    await registerNewUser(page);
    await expect(page.locator("h1")).toContainText("E2E");
  });

  test("login honours a safe `next` path but ignores external redirects", async ({ browser }) => {
    const signup = await browser.newContext();
    const { email, password } = await registerNewUser(await signup.newPage());
    await signup.close();

    const safe = await (await browser.newContext()).newPage();
    await login(safe, email, password, "/tours/kasada-dan-fajar-bromo");
    await expect(safe).toHaveURL(/\/tours\/kasada-dan-fajar-bromo$/);

    const evil = await (await browser.newContext()).newPage();
    await login(evil, email, password, "//evil.example.com");
    expect(new URL(evil.url()).host).toBe(new URL(safe.url()).host);
    await expect(evil).toHaveURL(/\/account$/);
  });

  test("forgot password answers the same for known and unknown emails", async ({ browser }) => {
    const signup = await browser.newContext();
    const { email } = await registerNewUser(await signup.newPage());
    await signup.close();

    const messages: string[] = [];
    for (const address of [email, `ghost-${Date.now()}@example.test`]) {
      const page = await (await browser.newContext()).newPage();
      await page.goto("/forgot-password");
      await page.locator("#email").fill(address);
      await page.getByRole("button", { name: "Kirim tautan" }).click();
      const heading = page.getByText("Periksa email kamu");
      await expect(heading).toBeVisible();
      messages.push((await page.locator("main").innerText()).replace(address, "<email>"));
    }
    expect(messages[0]).toBe(messages[1]);
  });
});
