import { expect, test } from "@playwright/test";
import { login, registerNewUser } from "../support/auth";
import { ACCOUNTS, STORAGE_STATE } from "../support/env";
import { createBooking, jakartaDate, sql } from "../support/db";

test.describe("account settings", () => {
  test("profile name and email language are saved", async ({ page }) => {
    const { email } = await registerNewUser(page, "settings");
    await page.goto("/account/settings");

    await page.locator("#name").fill("Ayu Settings");
    await page.locator("#locale").selectOption("en");
    await page.getByRole("button", { name: "Simpan profil" }).click();
    await expect(page.getByText("Profil tersimpan.")).toBeVisible();

    const [row] = await sql<{ name: string; locale: string }[]>`
      select name, locale from "user" where email = ${email}`;
    expect(row).toEqual({ name: "Ayu Settings", locale: "en" });
  });

  test("password change rejects a wrong current password and accepts the right one", async ({
    page,
  }) => {
    const { email, password } = await registerNewUser(page, "pwchange");
    const newPassword = "Brand-New-Pass-456";
    await page.goto("/account/settings");

    await page.locator("#currentPassword").fill("not-my-password");
    await page.locator("#newPassword").fill(newPassword);
    await page.locator("#confirmPassword").fill(newPassword);
    await page.getByRole("button", { name: "Ganti kata sandi" }).click();
    await expect(page.getByText("Kata sandi saat ini salah.")).toBeVisible();

    await page.locator("#currentPassword").fill(password);
    await page.getByRole("button", { name: "Ganti kata sandi" }).click();
    // Stays on settings (no bounce through /login) and confirms the change.
    await expect(page).toHaveURL(/\/account\/settings\?password=changed/);
    await expect(page.getByText("Kata sandi berhasil diganti.")).toBeVisible();

    // The new password works for a fresh sign-in.
    await page.context().clearCookies();
    await login(page, email, newPassword);
    await expect(page).toHaveURL(/\/account/);
  });
});

test.describe("booking detail", () => {
  test("owner sees the full booking; other users get a 404", async ({ browser }) => {
    const booking = await createBooking({
      email: ACCOUNTS.traveler.email,
      tourSlug: "borobudur-fajar-dan-batik-tulis",
      status: "pending",
      travelDate: jakartaDate(90),
      participants: 3,
    });

    const owner = await browser.newContext({ storageState: STORAGE_STATE.traveler });
    const ownerPage = await owner.newPage();
    await ownerPage.goto(`/account/bookings/${booking.code}`);
    await expect(ownerPage.getByText(booking.code).first()).toBeVisible();
    await expect(ownerPage.getByRole("heading", { name: /Borobudur/ }).first()).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: /Cetak/ })).toBeVisible();
    await owner.close();

    const stranger = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const strangerPage = await stranger.newPage();
    await registerNewUser(strangerPage, "stranger");
    const response = await strangerPage.goto(`/account/bookings/${booking.code}`);
    expect(response?.status()).toBe(404);
    await expect(strangerPage.getByText(booking.code)).toHaveCount(0);
    await stranger.close();
  });
});

test.describe("admin destinations", () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test("admin creates, publishes and deletes a destination", async ({ page }) => {
    const suffix = Date.now().toString(36);
    const name = `Desa Uji ${suffix}`;

    await page.goto("/admin/destinations/new");
    await page.locator("#name").fill(name);
    await page.locator("#province").fill("Nusa Tenggara Timur");
    await page.locator("#tagline-id").fill("Desa adat di atas awan.");
    await page.locator("#tagline-en").fill("A customary village above the clouds.");
    await page.locator("#description-id").fill("Deskripsi uji untuk destinasi baru.");
    await page.locator("#description-en").fill("Test description for a new destination.");
    await page.getByRole("button", { name: "Atau tempel URL Unsplash" }).click();
    await page
      .getByPlaceholder("https://images.unsplash.com/photo-...")
      .fill(
        "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1600&q=80&auto=format&fit=crop",
      );
    await page.getByRole("button", { name: "Pakai URL" }).click();
    const slug = await page.locator("#slug").inputValue();
    expect(slug).toContain(suffix);
    await page.getByRole("button", { name: "Buat destinasi" }).click();
    await expect(page).toHaveURL(/\/admin\/destinations$/);

    // Visible on the public site.
    const publicPage = await page.context().newPage();
    const response = await publicPage.goto(`/destinations/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(publicPage.getByRole("heading", { name }).first()).toBeVisible();
    await publicPage.close();

    // A destination without tours can be deleted.
    const [{ id }] = await sql<{ id: number }[]>`select id from destinations where slug = ${slug}`;
    await page.goto(`/admin/destinations/${id}/edit`);
    await page.getByRole("button", { name: "Hapus destinasi" }).click();
    await page.getByRole("button", { name: "Ya, hapus" }).click();
    await expect(page).toHaveURL(/\/admin\/destinations$/);
    const remaining = await sql`select 1 from destinations where slug = ${slug}`;
    expect(remaining).toHaveLength(0);
  });

  test("a destination that still has tours cannot be deleted", async ({ page }) => {
    const [{ id }] = await sql<{ id: number }[]>`select id from destinations where slug = 'ubud'`;
    await page.goto(`/admin/destinations/${id}/edit`);
    await expect(page.getByText(/Masih ada \d+ paket tur di destinasi ini/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Hapus destinasi" })).toBeDisabled();
  });
});
