import { describe, expect, it } from "vitest";
import enEmails from "../../../../messages/en/emails.json";
import idEmails from "../../../../messages/id/emails.json";
import type { EmailTranslator } from "./index";
import {
  adminRescheduledEmail,
  adminTravellerCancelledEmail,
  travellerCancelledEmail,
  travellerRescheduledEmail,
} from "./self-service";

const t: EmailTranslator = (key, values) =>
  values ? `${key}(${Object.values(values).join(",")})` : key;

const data = {
  recipientName: "Nadia",
  code: "EJ-ABC234",
  tourTitle: "Fajar Borobudur",
  travelDate: "15 November 2026",
  participants: "2 orang",
  total: "Rp 1.400.000",
  accountUrl: "https://etnojourney.id/account/bookings/EJ-ABC234",
};

const adminData = {
  ...data,
  contactName: "Nadia Putri",
  contactPhone: "081234567890",
  adminUrl: "https://etnojourney.id/admin/bookings/EJ-ABC234",
};

describe("traveller cancellation email", () => {
  it("states a partial refund with its share and the processing note", () => {
    const email = travellerCancelledEmail(t, {
      ...data,
      refund: { kind: "partial", amount: "Rp 700.000", percent: 50 },
    });
    expect(email.subject).toBe("selfService.cancelled.subject(EJ-ABC234)");
    expect(email.text).toContain("selfService.refund.partial(Rp 700.000,50)");
    expect(email.text).toContain("selfService.refund.processing");
    expect(email.html).toContain(`href="${data.accountUrl}"`);
  });

  it("says no refund applies without promising a transfer", () => {
    const email = travellerCancelledEmail(t, { ...data, refund: { kind: "none", days: 3 } });
    expect(email.text).toContain("selfService.refund.none(3)");
    expect(email.text).not.toContain("selfService.refund.processing");
  });

  it("covers unpaid bookings", () => {
    const email = travellerCancelledEmail(t, { ...data, refund: { kind: "unpaid" } });
    expect(email.text).toContain("selfService.refund.unpaid");
  });
});

describe("reschedule emails", () => {
  it("shows both dates to the traveller", () => {
    const email = travellerRescheduledEmail(t, { ...data, previousDate: "1 November 2026" });
    expect(email.subject).toBe("selfService.rescheduled.subject(EJ-ABC234,15 November 2026)");
    expect(email.text).toContain("1 November 2026");
    expect(email.text).toContain("15 November 2026");
  });

  it("alerts the back office with the admin link", () => {
    const email = adminRescheduledEmail(t, { ...adminData, previousDate: "1 November 2026" });
    expect(email.html).toContain(`href="${adminData.adminUrl}"`);
    expect(email.text).toContain("081234567890");
  });

  it("tells the back office when a refund is queued", () => {
    const owed = adminTravellerCancelledEmail(t, {
      ...adminData,
      refund: { kind: "full", amount: "Rp 1.400.000" },
    });
    expect(owed.text).toContain("selfService.admin.cancelled.refundQueued");
    const none = adminTravellerCancelledEmail(t, {
      ...adminData,
      refund: { kind: "none", days: 2 },
    });
    expect(none.text).toContain("selfService.admin.cancelled.noRefund");
  });
});

/** Every key the templates use exists in both locales. */
describe("selfService email copy", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null
      ? Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
      : [prefix];

  it("has the same keys in id and en", () => {
    expect(keys(idEmails.selfService).sort()).toEqual(keys(enEmails.selfService).sort());
  });

  it("defines every key the templates reference", () => {
    const used = new Set<string>();
    const record: EmailTranslator = (key) => {
      used.add(key);
      return key;
    };
    travellerCancelledEmail(record, {
      ...data,
      refund: { kind: "partial", amount: "x", percent: 50 },
    });
    travellerCancelledEmail(record, { ...data, refund: { kind: "full", amount: "x" } });
    travellerCancelledEmail(record, { ...data, refund: { kind: "none", days: 1 } });
    travellerCancelledEmail(record, { ...data, refund: { kind: "unpaid" } });
    travellerRescheduledEmail(record, { ...data, previousDate: "x" });
    adminTravellerCancelledEmail(record, { ...adminData, refund: { kind: "unpaid" } });
    adminTravellerCancelledEmail(record, { ...adminData, refund: { kind: "full", amount: "x" } });
    adminRescheduledEmail(record, { ...adminData, previousDate: "x" });
    const all = new Set(keys(enEmails));
    for (const key of used) expect(all.has(key), key).toBe(true);
  });
});
