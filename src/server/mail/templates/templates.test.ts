import { describe, expect, it } from "vitest";
import { escapeHtml, safeUrl } from "./escape";
import { bookingCreatedEmail, passwordResetEmail, type EmailTranslator } from "./index";

// Echoes the key plus interpolated values so assertions can see what was passed.
const t: EmailTranslator = (key, values) =>
  values ? `${key}(${Object.values(values).join(",")})` : key;

const booking = {
  recipientName: "Nadia",
  code: "EJ-ABC234",
  tourTitle: "Fajar Borobudur",
  travelDate: "15 November 2026",
  participants: "3 orang",
  total: "Rp 5.700.000",
  accountUrl: "https://etnojourney.id/account",
};

describe("escapeHtml", () => {
  it("escapes all HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });

  it("stringifies numbers", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("safeUrl", () => {
  it("keeps http(s) URLs and rejects other schemes", () => {
    expect(safeUrl("https://etnojourney.id/a?b=1")).toBe("https://etnojourney.id/a?b=1");
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("not a url")).toBe("#");
  });
});

describe("templates", () => {
  it("escapes user-controlled values in the HTML body", () => {
    const email = bookingCreatedEmail(t, {
      ...booking,
      recipientName: `<img src=x onerror=alert(1)>`,
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("includes booking details in both HTML and plain text", () => {
    const email = bookingCreatedEmail(t, booking);
    for (const value of [booking.code, booking.tourTitle, booking.total]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.subject).toBe("bookingCreated.subject(EJ-ABC234)");
    expect(email.html).toContain('href="https://etnojourney.id/account"');
  });

  it("renders the reset link as a button and as a raw fallback link", () => {
    const resetUrl =
      "https://etnojourney.id/api/auth/reset-password/tok?callbackURL=%2Freset-password";
    const email = passwordResetEmail(t, { recipientName: "Nadia", resetUrl });
    expect(
      email.html.match(/href="https:\/\/etnojourney\.id\/api\/auth\/reset-password\/tok/g),
    ).toHaveLength(2);
    expect(email.text).toContain(resetUrl);
    expect(email.text).toContain("passwordReset.expires");
  });

  it("contains no external images or scripts", () => {
    const email = bookingCreatedEmail(t, booking);
    expect(email.html).not.toMatch(/<img|<script/i);
  });
});
