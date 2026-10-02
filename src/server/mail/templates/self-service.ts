import { renderEmail } from "./layout";
import type { AdminBookingEmailData } from "./admin";
import type { BookingEmailData, Email, EmailTranslator } from "./index";

/**
 * Emails for traveller self-service: cancellation (with the refund that
 * applies) and date changes, to the traveller and to the back office.
 * Values arrive pre-formatted in the recipient's locale; copy lives under
 * `emails.selfService`.
 */

/** What the cancellation means for the money. */
export type RefundOutcome =
  /** Nothing had been paid. */
  | { kind: "unpaid" }
  | { kind: "full"; amount: string }
  | { kind: "partial"; amount: string; percent: number }
  /** Paid, but the cancellation fell inside the no-refund window. */
  | { kind: "none"; days: number };

const ns = (key: string) => `selfService.${key}`;

function refundLine(t: EmailTranslator, refund: RefundOutcome): string {
  switch (refund.kind) {
    case "unpaid":
      return t(ns("refund.unpaid"));
    case "full":
      return t(ns("refund.full"), { amount: refund.amount });
    case "partial":
      return t(ns("refund.partial"), { amount: refund.amount, percent: refund.percent });
    case "none":
      return t(ns("refund.none"), { days: refund.days });
  }
}

function refundValue(t: EmailTranslator, refund: RefundOutcome): string {
  switch (refund.kind) {
    case "unpaid":
      return t(ns("refundValue.unpaid"));
    case "full":
      return refund.amount;
    case "partial":
      return t(ns("refundValue.partial"), { amount: refund.amount, percent: refund.percent });
    case "none":
      return t(ns("refundValue.none"));
  }
}

const owesRefund = (refund: RefundOutcome) => refund.kind === "full" || refund.kind === "partial";

export function travellerCancelledEmail(
  t: EmailTranslator,
  data: BookingEmailData & { refund: RefundOutcome },
): Email {
  return {
    subject: t(ns("cancelled.subject"), { code: data.code }),
    ...renderEmail({
      preheader: t(ns("cancelled.preheader"), { tour: data.tourTitle }),
      heading: t(ns("cancelled.heading")),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [
        t(ns("cancelled.intro"), { tour: data.tourTitle, date: data.travelDate }),
        refundLine(t, data.refund),
        ...(owesRefund(data.refund) ? [t(ns("refund.processing"))] : []),
      ],
      details: [
        { label: t("details.code"), value: data.code },
        { label: t("details.tour"), value: data.tourTitle },
        { label: t("details.date"), value: data.travelDate },
        { label: t("details.total"), value: data.total },
        { label: t(ns("details.refund")), value: refundValue(t, data.refund) },
      ],
      button: { label: t("viewBooking"), url: data.accountUrl },
      footer: t("footer"),
    }),
  };
}

export function travellerRescheduledEmail(
  t: EmailTranslator,
  data: BookingEmailData & { previousDate: string },
): Email {
  return {
    subject: t(ns("rescheduled.subject"), { code: data.code, date: data.travelDate }),
    ...renderEmail({
      preheader: t(ns("rescheduled.preheader"), { date: data.travelDate }),
      heading: t(ns("rescheduled.heading")),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [
        t(ns("rescheduled.intro"), {
          tour: data.tourTitle,
          from: data.previousDate,
          to: data.travelDate,
        }),
        t(ns("rescheduled.next")),
      ],
      details: [
        { label: t("details.code"), value: data.code },
        { label: t("details.tour"), value: data.tourTitle },
        { label: t(ns("details.previousDate")), value: data.previousDate },
        { label: t(ns("details.newDate")), value: data.travelDate },
        { label: t("details.participants"), value: data.participants },
        { label: t("details.total"), value: data.total },
      ],
      button: { label: t("viewBooking"), url: data.accountUrl },
      footer: t("footer"),
    }),
  };
}

function adminContact(t: EmailTranslator, data: AdminBookingEmailData) {
  return [
    { label: t("details.code"), value: data.code },
    { label: t("details.tour"), value: data.tourTitle },
    { label: t("details.participants"), value: data.participants },
    { label: t("details.total"), value: data.total },
    { label: t("admin.details.contactName"), value: data.contactName },
    { label: t("admin.details.contactPhone"), value: data.contactPhone },
  ];
}

export function adminTravellerCancelledEmail(
  t: EmailTranslator,
  data: AdminBookingEmailData & { refund: RefundOutcome },
): Email {
  const admin = (key: string) => ns(`admin.cancelled.${key}`);
  return {
    subject: t(admin("subject"), { code: data.code, tour: data.tourTitle }),
    ...renderEmail({
      preheader: refundValue(t, data.refund),
      heading: t(admin("heading")),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [
        t(admin("intro"), { tour: data.tourTitle, date: data.travelDate }),
        owesRefund(data.refund) ? t(admin("refundQueued")) : t(admin("noRefund")),
      ],
      details: [
        { label: t(ns("details.refund")), value: refundValue(t, data.refund) },
        { label: t("details.date"), value: data.travelDate },
        ...adminContact(t, data),
      ],
      button: { label: t("admin.openBooking"), url: data.adminUrl },
      linkFallback: { label: t("admin.fallback"), url: data.adminUrl },
      footer: t("admin.footer"),
    }),
  };
}

export function adminRescheduledEmail(
  t: EmailTranslator,
  data: AdminBookingEmailData & { previousDate: string },
): Email {
  const admin = (key: string) => ns(`admin.rescheduled.${key}`);
  return {
    subject: t(admin("subject"), { code: data.code, date: data.travelDate }),
    ...renderEmail({
      preheader: t(admin("preheader"), { from: data.previousDate, to: data.travelDate }),
      heading: t(admin("heading")),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [
        t(admin("intro"), {
          tour: data.tourTitle,
          from: data.previousDate,
          to: data.travelDate,
        }),
      ],
      details: [
        { label: t(ns("details.previousDate")), value: data.previousDate },
        { label: t(ns("details.newDate")), value: data.travelDate },
        ...adminContact(t, data),
      ],
      button: { label: t("admin.openBooking"), url: data.adminUrl },
      linkFallback: { label: t("admin.fallback"), url: data.adminUrl },
      footer: t("admin.footer"),
    }),
  };
}
