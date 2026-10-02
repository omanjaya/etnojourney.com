import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import enEmails from "../../../../messages/en/emails.json";
import idEmails from "../../../../messages/id/emails.json";
import type { EmailTranslator } from "./index";
import { reviewRequestEmail, tripReminderEmail, type TripReminderEmailData } from "./trip";

const translator = (locale: "id" | "en"): EmailTranslator => {
  const t = createTranslator({
    locale,
    messages: { emails: locale === "en" ? enEmails : idEmails },
    namespace: "emails",
  });
  return (key, values) => t(key as never, values as never);
};

const reminder: TripReminderEmailData = {
  recipientName: "Nadia",
  code: "EJ-ABC234",
  tourTitle: "Fajar Borobudur",
  destination: "Borobudur",
  travelDate: "Sunday, November 15, 2026",
  daysUntil: 3,
  participants: "3 people",
  meetingPoint: "Balai Desa <Candirejo>",
  contactName: "Nadia Putri",
  contactPhone: "081234567890",
  whatToBring: ["Torch", "Sarong"],
  etiquette: [],
  bookingUrl: "https://etnojourney.id/en/account/bookings/EJ-ABC234",
  ticketUrl: "https://etnojourney.id/api/bookings/EJ-ABC234/ticket?locale=en",
  support: "hello@etnojourney.id",
};

describe("tripReminderEmail", () => {
  it("includes the meeting point, lists, contact and both links (en)", () => {
    const email = tripReminderEmail(translator("en"), reminder);
    expect(email.subject).toBe("Your trip to Borobudur is coming up (EJ-ABC234)");
    expect(email.text).toContain("Fajar Borobudur starts in 3 days.");
    expect(email.text).toContain("Meeting point: Balai Desa <Candirejo>");
    expect(email.text).toContain("What to bring: Torch; Sarong.");
    expect(email.text).not.toContain("Local etiquette");
    expect(email.text).toContain("Contact phone: 081234567890");
    expect(email.text).toContain(reminder.bookingUrl);
    expect(email.text).toContain("hello@etnojourney.id");
    expect(email.html).toContain(reminder.ticketUrl);
    expect(email.html).toContain("Balai Desa &lt;Candirejo&gt;");
  });

  it("says today/tomorrow and translates to Indonesian", () => {
    const t = translator("id");
    expect(tripReminderEmail(t, { ...reminder, daysUntil: 0 }).text).toContain(
      "Fajar Borobudur dimulai hari ini.",
    );
    expect(tripReminderEmail(t, { ...reminder, daysUntil: 1 }).text).toContain(
      "Fajar Borobudur dimulai besok.",
    );
    expect(tripReminderEmail(t, { ...reminder, support: null }).text).not.toContain("Hubungi kami");
  });
});

describe("reviewRequestEmail", () => {
  it("links to the booking page where the review is written", () => {
    for (const locale of ["id", "en"] as const) {
      const email = reviewRequestEmail(translator(locale), {
        recipientName: "Nadia",
        code: "EJ-ABC234",
        tourTitle: "Fajar Borobudur",
        destination: "Borobudur",
        travelDate: "15 November 2026",
        reviewUrl: "https://etnojourney.id/account/bookings/EJ-ABC234",
      });
      expect(email.subject).toContain("Fajar Borobudur");
      expect(email.text).toContain("https://etnojourney.id/account/bookings/EJ-ABC234");
      expect(email.html).toContain('href="https://etnojourney.id/account/bookings/EJ-ABC234"');
    }
  });
});
