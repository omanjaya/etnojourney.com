import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize, type LocalizedText } from "@/lib/i18n-text";
import type { TicketData } from "@/lib/pdf/ticket-pdf";
import { safeFilename } from "@/lib/pdf/text";
import type { BookingStatus } from "@/server/db/schema";

/** Only bookings that are going ahead (or went ahead) get an e-ticket. */
export const TICKET_STATUSES: readonly BookingStatus[] = ["confirmed", "completed"];

export const canIssueTicket = (status: BookingStatus) => TICKET_STATUSES.includes(status);

/** Translator scoped to `trip.ticket` (loosely typed so this stays testable). */
export type TicketTranslator = (key: string, values?: Record<string, string | number>) => string;

export type TicketSource = {
  booking: {
    code: string;
    status: BookingStatus;
    travelDate: string;
    participants: number;
    totalPrice: number;
    contactName: string;
    contactPhone: string;
  };
  tour: {
    title: LocalizedText;
    meetingPoint: string;
    whatToBring: LocalizedText[];
    etiquette: LocalizedText[];
    destination: { name: string; province: string };
  };
  /** The settled payment, if any; without it the ticket shows the booking total. */
  payment: { amount: number; methodLabel: string } | null;
};

/** Maps a booking to the localized, formatted e-ticket content. Pure. */
export function buildTicketData(
  source: TicketSource,
  options: { locale: Locale; t: TicketTranslator; bookingUrl: string; policyUrl: string },
): TicketData {
  const { booking, tour, payment } = source;
  const { locale, t } = options;
  const travelDate = formatDate(booking.travelDate, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    heading: t("heading"),
    documentTitle: t("documentTitle", { code: booking.code }),
    language: locale === "en" ? "en-US" : "id-ID",
    codeLabel: t("code"),
    code: booking.code,
    tourTitle: localize(tour.title, locale),
    destination: `${tour.destination.name}, ${tour.destination.province}`,
    statusLabel: t("status"),
    status: t(`statuses.${booking.status}`),
    details: [
      { label: t("travelDate"), value: travelDate },
      { label: t("participants"), value: t("people", { count: booking.participants }) },
      { label: t("contactName"), value: booking.contactName },
      { label: t("contactPhone"), value: booking.contactPhone },
      payment
        ? { label: t("totalPaid"), value: formatCurrency(payment.amount, locale) }
        : { label: t("total"), value: formatCurrency(booking.totalPrice, locale) },
      { label: t("paymentMethod"), value: payment?.methodLabel ?? "-" },
      { label: t("meetingPoint"), value: tour.meetingPoint },
    ],
    sections: [
      { title: t("bring"), items: tour.whatToBring.map((item) => localize(item, locale)) },
      { title: t("etiquette"), items: tour.etiquette.map((item) => localize(item, locale)) },
    ].filter((section) => section.items.length > 0),
    links: [
      { label: t("verify"), url: options.bookingUrl },
      { label: t("policy"), url: options.policyUrl },
    ],
    footer: t("footer"),
  };
}

export const ticketFilename = (code: string) =>
  `${safeFilename(`etnojourney-e-ticket-${code}`, "etnojourney-e-ticket")}.pdf`;
