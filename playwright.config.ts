import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, PORT, serverEnv } from "./e2e/support/env";

const isCI = Boolean(process.env.CI);

/**
 * End-to-end suite against a production build, a dedicated `*_test` database
 * (reset by global-setup) and a dummy Midtrans key so the webhook path is live.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "./e2e/.results",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: isCI ? 2 : 3,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL: BASE_URL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    // Locally use the installed Chrome; CI installs Playwright's Chromium.
    channel: isCI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /specs\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: isCI ? undefined : "chrome" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    // Probe a route that doesn't touch the database: Playwright starts the
    // server before global-setup migrates and seeds the test DB.
    url: `${BASE_URL}/robots.txt`,
    env: serverEnv(),
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
