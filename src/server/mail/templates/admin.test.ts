import { describe, expect, it } from "vitest";
import { adminBookingCreatedEmail, adminPaymentSucceededEmail } from "./admin";
import type { EmailTranslator } from "./index";

const t: EmailTranslator = (key, values) =>
  values ? `${key}(${Object.values(values).join(",")})` : key;

const data = {
  recipientName: "Admin",
  code: "EJ-ABC234",
  tourTitle: "Fajar Borobudur",
  travelDate: "15 November 2026",
  participants: "3 orang",
  total: "Rp 5.700.000",
  contactName: "Nadia <b>Putri</b>",
  contactPhone: "081234567890",
  adminUrl: "https://etnojourney.id/admin/bookings/EJ-ABC234",
};

describe("admin booking alerts", () => {
  it("includes booking, contact details and the admin link", () => {
    const email = adminBookingCreatedEmail(t, data);
    for (const value of [data.code, data.tourTitle, data.total, data.contactPhone]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.subject).toBe("admin.bookingCreated.subject(EJ-ABC234,Fajar Borobudur)");
    expect(email.html).toContain(`href="${data.adminUrl}"`);
    expect(email.text).toContain(data.adminUrl);
  });

  it("escapes traveller-supplied contact details", () => {
    const email = adminBookingCreatedEmail(t, data);
    expect(email.html).not.toContain("<b>Putri</b>");
    expect(email.html).toContain("Nadia &lt;b&gt;Putri&lt;/b&gt;");
  });

  it("leads the payment alert with the amount and method", () => {
    const email = adminPaymentSucceededEmail(t, {
      ...data,
      amount: "Rp 5.700.000",
      method: "QRIS",
    });
    expect(email.subject).toBe("admin.paymentSucceeded.subject(EJ-ABC234,Rp 5.700.000)");
    expect(email.text.indexOf("details.amount")).toBeLessThan(email.text.indexOf("details.code"));
    expect(email.text).toContain("QRIS");
  });
});
