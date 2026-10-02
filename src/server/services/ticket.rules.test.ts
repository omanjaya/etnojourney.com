import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import enTrip from "../../../messages/en/trip.json";
import idTrip from "../../../messages/id/trip.json";
import { buildTicketData, canIssueTicket, ticketFilename, type TicketSource } from "./ticket.rules";

const source: TicketSource = {
  booking: {
    code: "EJ-ABC234",
    status: "confirmed",
    travelDate: "2026-11-15",
    participants: 3,
    totalPrice: 5_700_000,
    contactName: "Nadia Putri",
    contactPhone: "081234567890",
  },
  tour: {
    title: { id: "Fajar Borobudur", en: "Borobudur Sunrise" },
    meetingPoint: "Balai Desa Candirejo",
    whatToBring: [{ id: "Senter", en: "Torch" }],
    etiquette: [],
    destination: { name: "Borobudur", province: "Jawa Tengah" },
  },
  payment: { amount: 5_700_000, methodLabel: "GoPay" },
};

const translator = (locale: "id" | "en") => {
  const t = createTranslator({
    locale,
    messages: { trip: locale === "en" ? enTrip : idTrip },
    namespace: "trip.ticket",
  });
  return (key: string, values?: Record<string, string | number>) =>
    t(key as never, values as never);
};

const options = (locale: "id" | "en") => ({
  locale,
  t: translator(locale),
  bookingUrl: "https://etnojourney.id/account/bookings/EJ-ABC234",
  policyUrl: "https://etnojourney.id/cancellation-policy",
});

describe("canIssueTicket", () => {
  it("allows confirmed and completed bookings only", () => {
    expect(canIssueTicket("confirmed")).toBe(true);
    expect(canIssueTicket("completed")).toBe(true);
    expect(canIssueTicket("pending")).toBe(false);
    expect(canIssueTicket("cancelled")).toBe(false);
  });
});

describe("buildTicketData", () => {
  it("maps a booking to localized ticket content (en)", () => {
    const data = buildTicketData(source, options("en"));
    expect(data.tourTitle).toBe("Borobudur Sunrise");
    expect(data.destination).toBe("Borobudur, Jawa Tengah");
    expect(data.status).toBe("Confirmed");
    expect(data.language).toBe("en-US");
    expect(data.details).toContainEqual({
      label: "Travel date",
      value: "Sunday, November 15, 2026",
    });
    expect(data.details).toContainEqual({ label: "Travellers", value: "3 people" });
    expect(data.details).toContainEqual({ label: "Payment method", value: "GoPay" });
    expect(data.details).toContainEqual({ label: "Meeting point", value: "Balai Desa Candirejo" });
    expect(data.details.find((d) => d.label === "Total paid")?.value).toMatch(/5,700,000/);
    // Empty lists are left out.
    expect(data.sections).toEqual([{ title: "What to bring", items: ["Torch"] }]);
    expect(data.links.map((l) => l.url)).toEqual([
      "https://etnojourney.id/account/bookings/EJ-ABC234",
      "https://etnojourney.id/cancellation-policy",
    ]);
  });

  it("uses the Indonesian copy and the booking total when nothing was paid online", () => {
    const data = buildTicketData({ ...source, payment: null }, options("id"));
    expect(data.tourTitle).toBe("Fajar Borobudur");
    expect(data.status).toBe("Terkonfirmasi");
    expect(data.details).toContainEqual({
      label: "Tanggal perjalanan",
      value: "Minggu, 15 November 2026",
    });
    expect(data.details.find((d) => d.label === "Total")?.value).toMatch(/5\.700\.000/);
    expect(data.details).toContainEqual({ label: "Metode pembayaran", value: "-" });
  });
});

describe("ticketFilename", () => {
  it("builds a safe attachment name", () => {
    expect(ticketFilename("EJ-ABC234")).toBe("etnojourney-e-ticket-EJ-ABC234.pdf");
    expect(ticketFilename('x"\r\n')).toBe("etnojourney-e-ticket-x.pdf");
  });
});
