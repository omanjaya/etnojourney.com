import { test as setup } from "@playwright/test";
import { login } from "./support/auth";
import { ACCOUNTS, STORAGE_STATE } from "./support/env";

// Sign in once per role and reuse the session in every spec (keeps us well
// under the per-account login rate limit).
for (const role of ["traveler", "admin"] as const) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await login(page, ACCOUNTS[role].email, ACCOUNTS[role].password);
    await page.context().storageState({ path: STORAGE_STATE[role] });
  });
}
