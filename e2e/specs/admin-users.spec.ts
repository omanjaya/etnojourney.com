import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, registerNewUser } from "../support/auth";
import { sql, userIdByEmail } from "../support/db";
import { ACCOUNTS, BASE_URL, STORAGE_STATE } from "../support/env";

// Fresh accounts per test: the seeded traveller and admin are shared by other specs.

async function adminPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: STORAGE_STATE.admin });
  return context.newPage();
}

/** Opens a user's admin page through the searchable list. */
async function openUser(admin: Page, email: string) {
  await admin.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: "E2E Tester" }).filter({ visible: true }).first().click();
  await expect(admin).toHaveURL(/\/admin\/users\/[^/?]+$/);
  await expect(admin.locator("h1")).toContainText("E2E Tester");
}

test.describe("admin users", () => {
  test("admin promotes a traveller to staff; staff gets bookings but not users", async ({
    browser,
  }) => {
    const travellerPage = await (await browser.newContext()).newPage();
    const { email } = await registerNewUser(travellerPage, "e2e-staff");

    const admin = await adminPage(browser);
    await openUser(admin, email);
    await admin.locator("#user-role").selectOption("staff");
    await admin.getByRole("button", { name: "Simpan peran" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Peran diperbarui" })).toBeVisible();

    // Recorded in the activity log, filtered to user changes.
    await admin.goto("/admin/activity?group=users");
    await expect(admin.getByText("Mengubah peran pengguna").first()).toBeVisible();

    // A promotion keeps the session; the new role applies on the next request.
    await travellerPage.goto("/admin/bookings");
    await expect(travellerPage).toHaveURL(/\/admin\/bookings$/);
    await expect(travellerPage.locator("h1")).toBeVisible();

    for (const path of ["/admin/users", "/admin/activity"]) {
      await travellerPage.goto(path);
      await expect(travellerPage, path).toHaveURL(`${BASE_URL}/`);
    }
  });

  test("a disabled account is signed out and cannot sign in until re-enabled", async ({
    browser,
  }) => {
    const travellerPage = await (await browser.newContext()).newPage();
    const { email, password } = await registerNewUser(travellerPage, "e2e-disabled");
    const userId = await userIdByEmail(email);

    const admin = await adminPage(browser);
    try {
      await openUser(admin, email);
      admin.once("dialog", (dialog) => dialog.accept());
      await admin.getByRole("button", { name: "Nonaktifkan akun" }).click();
      await expect(admin.getByRole("status").filter({ hasText: "Akses diperbarui" })).toBeVisible();

      // Every session was deleted: the open tab is signed out.
      const [{ sessions }] = await sql<{ sessions: number }[]>`
        select count(*)::int as sessions from session where user_id = ${userId}`;
      expect(sessions).toBe(0);
      await travellerPage.goto("/account");
      await expect(travellerPage).toHaveURL(/\/login/);

      // Signing in with the right password is refused with a clear message.
      await travellerPage.locator("#email").fill(email);
      await travellerPage.locator("#password").fill(password);
      await travellerPage.locator('form button[type="submit"]').click();
      await expect(travellerPage.locator('form [role="alert"]')).toContainText("dinonaktifkan");
      await expect(travellerPage).toHaveURL(/\/login/);

      await admin.reload();
      admin.once("dialog", (dialog) => dialog.accept());
      await admin.getByRole("button", { name: "Aktifkan akun" }).click();
      await expect(admin.getByRole("status").filter({ hasText: "Akses diperbarui" })).toBeVisible();
    } finally {
      // Never leave a disabled account behind for other specs.
      await sql`update "user" set disabled_at = null where id = ${userId}`;
    }

    const again = await (await browser.newContext()).newPage();
    await login(again, email, password);
    await expect(again).toHaveURL(/\/account/);
  });

  test("admin cannot change their own role or access", async ({ browser }) => {
    const admin = await adminPage(browser);
    const adminId = await userIdByEmail(ACCOUNTS.admin.email);
    await admin.goto(`/admin/users/${adminId}`);
    await expect(admin.locator("#user-role")).toHaveCount(0);
    await expect(admin.getByRole("button", { name: "Nonaktifkan akun" })).toHaveCount(0);
  });
});
