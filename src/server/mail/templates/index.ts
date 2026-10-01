import type { BookingStatus } from "@/server/db/schema";
import { renderEmail, type RenderedEmail } from "./layout";

/** Translator for the `emails` namespace (loosely typed so templates stay testable). */
export type EmailTranslator = (key: string, values?: Record<string, string | number>) => string;

export type Email = RenderedEmail & { subject: string };

/** Values arrive pre-formatted (currency, dates) in the recipient's locale. */
export type BookingEmailData = {
  recipientName: string;
  code: string;
  tourTitle: string;
  travelDate: string;
  participants: string;
  total: string;
  accountUrl: string;
};

function bookingDetails(t: EmailTranslator, data: BookingEmailData) {
  return [
    { label: t("details.code"), value: data.code },
    { label: t("details.tour"), value: data.tourTitle },
    { label: t("details.date"), value: data.travelDate },
    { label: t("details.participants"), value: data.participants },
    { label: t("details.total"), value: data.total },
  ];
}

export function bookingCreatedEmail(t: EmailTranslator, data: BookingEmailData): Email {
  return {
    subject: t("bookingCreated.subject", { code: data.code }),
    ...renderEmail({
      preheader: t("bookingCreated.preheader", { tour: data.tourTitle }),
      heading: t("bookingCreated.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t("bookingCreated.intro"), t("bookingCreated.next")],
      details: bookingDetails(t, data),
      button: { label: t("viewBooking"), url: data.accountUrl },
      footer: t("footer"),
    }),
  };
}

export function bookingStatusChangedEmail(
  t: EmailTranslator,
  data: BookingEmailData & { status: BookingStatus },
): Email {
  const status = t(`status.${data.status}.label`);
  return {
    subject: t("statusChanged.subject", { code: data.code, status }),
    ...renderEmail({
      preheader: t("statusChanged.preheader", { status }),
      heading: t("statusChanged.heading", { status }),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t(`status.${data.status}.explanation`)],
      details: bookingDetails(t, data),
      button: { label: t("viewBooking"), url: data.accountUrl },
      footer: t("footer"),
    }),
  };
}

export function paymentSucceededEmail(
  t: EmailTranslator,
  data: BookingEmailData & { amount: string; method: string },
): Email {
  return {
    subject: t("paymentSucceeded.subject", { code: data.code }),
    ...renderEmail({
      preheader: t("paymentSucceeded.preheader", { amount: data.amount }),
      heading: t("paymentSucceeded.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t("paymentSucceeded.intro", { tour: data.tourTitle })],
      details: [
        { label: t("details.code"), value: data.code },
        { label: t("details.amount"), value: data.amount },
        { label: t("details.method"), value: data.method },
        { label: t("details.date"), value: data.travelDate },
      ],
      button: { label: t("viewBooking"), url: data.accountUrl },
      footer: t("footer"),
    }),
  };
}

export function passwordResetEmail(
  t: EmailTranslator,
  data: { recipientName: string; resetUrl: string },
): Email {
  return {
    subject: t("passwordReset.subject"),
    ...renderEmail({
      preheader: t("passwordReset.preheader"),
      heading: t("passwordReset.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [t("passwordReset.intro")],
      button: { label: t("passwordReset.button"), url: data.resetUrl },
      linkFallback: { label: t("passwordReset.fallback"), url: data.resetUrl },
      footnotes: [t("passwordReset.expires"), t("passwordReset.ignore")],
      footer: t("footer"),
    }),
  };
}
