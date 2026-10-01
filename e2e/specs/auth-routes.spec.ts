import { expect, test } from "@playwright/test";
import { STORAGE_STATE } from "../support/env";

/**
 * Raw Better Auth HTTP routes bypass our validation and rate limits, so the
 * route handler only exposes an allowlist (see app/api/auth/[...all]/route.ts).
 */
test.describe("auth HTTP routes", () => {
  test.use({ storageState: STORAGE_STATE.traveler });

  const closed: [string, string, unknown?][] = [
    ["POST", "/api/auth/sign-in/email", { email: "a@b.c", password: "x" }],
    ["POST", "/api/auth/sign-up/email", { email: "a@b.c", password: "x", name: "x" }],
    ["POST", "/api/auth/update-user", { name: "x".repeat(5000) }],
    ["POST", "/api/auth/verify-password", { password: "x" }],
    ["POST", "/api/auth/change-password", { currentPassword: "x", newPassword: "y" }],
    ["POST", "/api/auth/revoke-other-sessions", {}],
    ["GET", "/api/auth/get-session"],
    ["GET", "/api/auth/list-sessions"],
  ];

  for (const [method, path, body] of closed) {
    test(`${method} ${path} is not exposed, even with a session`, async ({ request }) => {
      const response =
        method === "GET"
          ? await request.get(path)
          : await request.post(path, { data: body, headers: { Origin: "http://localhost:3460" } });
      expect(response.status()).toBe(404);
    });
  }

  test("the emailed reset link route stays reachable", async ({ request }) => {
    const response = await request.get(
      "/api/auth/reset-password/not-a-real-token?callbackURL=%2Freset-password",
      { maxRedirects: 0 },
    );
    // Better Auth redirects back to our page with ?error=INVALID_TOKEN.
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain("INVALID_TOKEN");
  });
});
