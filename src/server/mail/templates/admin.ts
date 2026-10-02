import { renderEmail } from "./layout";
import type { Email, EmailTranslator } from "./index";

/**
 * Back-office alerts (new booking, payment received). Values arrive
 * pre-formatted in the recipient admin's locale.
 */
export type AdminBookingEmailData = {
  recipientName: string;
  code: string;
  tourTitle: string;
  travelDate: string;
  participants: string;
  total: string;
  contactName: string;
  contactPhone: string;
  /** Absolute URL of `/admin/bookings/[code]`. */
  adminUrl: string;
};

function adminDetails(t: EmailTranslator, data: AdminBookingEmailData) {
  return [
    { label: t("details.code"), value: data.code },
    { label: t("details.tour"), value: data.tourTitle },
    { label: t("details.date"), value: data.travelDate },
    { label: t("details.participants"), value: data.participants },
    { label: t("details.total"), value: data.total },
    { label: t("admin.details.contactName"), value: data.contactName },
    { label: t("admin.details.contactPhone"), value: data.contactPhone },
  ];
}

export function adminBookingCreatedEmail(t: EmailTranslator, data: AdminBookingEmailData): Email {
  return {
    subject: t("admin.bookingCreated.subject", { code: data.code, tour: data.tourTitle }),
    ...renderEmail({
      preheader: t("admin.bookingCreated.preheader", {
        participants: data.participants,
        date: data.travelDate,
      }),
      heading: t("admin.bookingCreated.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t("admin.bookingCreated.intro", { tour: data.tourTitle })],
      details: adminDetails(t, data),
      button: { label: t("admin.openBooking"), url: data.adminUrl },
      linkFallback: { label: t("admin.fallback"), url: data.adminUrl },
      footer: t("admin.footer"),
    }),
  };
}

export function adminPaymentSucceededEmail(
  t: EmailTranslator,
  data: AdminBookingEmailData & { amount: string; method: string },
): Email {
  return {
    subject: t("admin.paymentSucceeded.subject", { code: data.code, amount: data.amount }),
    ...renderEmail({
      preheader: t("admin.paymentSucceeded.preheader", {
        amount: data.amount,
        method: data.method,
      }),
      heading: t("admin.paymentSucceeded.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t("admin.paymentSucceeded.intro", { tour: data.tourTitle })],
      details: [
        { label: t("details.amount"), value: data.amount },
        { label: t("details.method"), value: data.method },
        ...adminDetails(t, data),
      ],
      button: { label: t("admin.openBooking"), url: data.adminUrl },
      linkFallback: { label: t("admin.fallback"), url: data.adminUrl },
      footer: t("admin.footer"),
    }),
  };
}
