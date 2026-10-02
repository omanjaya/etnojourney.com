import type { Email, EmailTranslator } from "./index";
import { renderEmail } from "./layout";

/** Values arrive pre-formatted and localized for the recipient. */
export type TripReminderEmailData = {
  recipientName: string;
  code: string;
  tourTitle: string;
  destination: string;
  travelDate: string;
  /** Days from today (Asia/Jakarta) to the travel date; 0 means today. */
  daysUntil: number;
  participants: string;
  meetingPoint: string;
  contactName: string;
  contactPhone: string;
  whatToBring: string[];
  etiquette: string[];
  bookingUrl: string;
  ticketUrl: string;
  /** Our support contact line (email and/or phone), when configured. */
  support: string | null;
};

export type ReviewRequestEmailData = {
  recipientName: string;
  code: string;
  tourTitle: string;
  destination: string;
  travelDate: string;
  reviewUrl: string;
};

export function tripReminderEmail(t: EmailTranslator, data: TripReminderEmailData): Email {
  const paragraphs = [
    t("trip.reminder.intro", { days: Math.max(0, data.daysUntil), tour: data.tourTitle }),
    t("trip.reminder.meet"),
  ];
  if (data.whatToBring.length) {
    paragraphs.push(t("trip.reminder.bring", { items: data.whatToBring.join("; ") }));
  }
  if (data.etiquette.length) {
    paragraphs.push(t("trip.reminder.etiquette", { items: data.etiquette.join("; ") }));
  }

  return {
    subject: t("trip.reminder.subject", { destination: data.destination, code: data.code }),
    ...renderEmail({
      preheader: t("trip.reminder.preheader", { date: data.travelDate, place: data.meetingPoint }),
      heading: t("trip.reminder.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs,
      details: [
        { label: t("details.code"), value: data.code },
        { label: t("details.tour"), value: data.tourTitle },
        { label: t("details.date"), value: data.travelDate },
        { label: t("details.participants"), value: data.participants },
        { label: t("trip.details.meetingPoint"), value: data.meetingPoint },
        { label: t("trip.details.contactName"), value: data.contactName },
        { label: t("trip.details.contactPhone"), value: data.contactPhone },
      ],
      button: { label: t("viewBooking"), url: data.bookingUrl },
      linkFallback: { label: t("trip.reminder.ticket"), url: data.ticketUrl },
      footnotes: data.support ? [t("trip.reminder.support", { contact: data.support })] : [],
      footer: t("footer"),
    }),
  };
}

export function reviewRequestEmail(t: EmailTranslator, data: ReviewRequestEmailData): Email {
  return {
    subject: t("trip.reviewRequest.subject", { tour: data.tourTitle }),
    ...renderEmail({
      preheader: t("trip.reviewRequest.preheader"),
      heading: t("trip.reviewRequest.heading"),
      greeting: t("greeting", { name: data.recipientName }),
      paragraphs: [
        t("trip.reviewRequest.intro", { tour: data.tourTitle, destination: data.destination }),
        t("trip.reviewRequest.ask"),
      ],
      details: [
        { label: t("details.code"), value: data.code },
        { label: t("details.date"), value: data.travelDate },
      ],
      button: { label: t("trip.reviewRequest.button"), url: data.reviewUrl },
      linkFallback: { label: t("trip.reviewRequest.fallback"), url: data.reviewUrl },
      footnotes: [t("trip.reviewRequest.once")],
      footer: t("footer"),
    }),
  };
}
