import type { Email, EmailTranslator } from "./index";
import { renderEmail } from "./layout";

/**
 * Departure manifest sent to the assigned guide. Deliberately carries no
 * prices or payment details: only who travels, how to reach them, and the
 * operational note. Values arrive pre-formatted for the recipient.
 */
export type ManifestEmailData = {
  guideName: string;
  tourTitle: string;
  destination: string;
  travelDate: string;
  meetingPoint: string;
  /** Operational note from the team (meeting time, vehicle); null when empty. */
  note: string | null;
  /** e.g. "7 orang". */
  totalParticipants: string;
  bookingCount: number;
  rows: {
    code: string;
    contactName: string;
    contactPhone: string;
    /** e.g. "2 orang". */
    participants: string;
    notes: string | null;
    /** Not confirmed yet (still travelling unless cancelled). */
    pending: boolean;
  }[];
};

/** One line per booking, readable in plain text and HTML alike. */
function manifestLine(t: EmailTranslator, row: ManifestEmailData["rows"][number], index: number) {
  const parts = [
    `${index + 1}. ${row.code}`,
    row.contactName,
    row.participants,
    t("departure.manifest.phone", { phone: row.contactPhone }),
  ];
  if (row.pending) parts.push(t("departure.manifest.pending"));
  const line = parts.join(" - ");
  return row.notes ? `${line}. ${t("departure.manifest.notes", { notes: row.notes })}` : line;
}

export function departureManifestEmail(t: EmailTranslator, data: ManifestEmailData): Email {
  const paragraphs = [
    t("departure.manifest.intro", { tour: data.tourTitle, date: data.travelDate }),
  ];
  if (data.note) paragraphs.push(t("departure.manifest.note", { note: data.note }));
  paragraphs.push(t("departure.manifest.listHeading", { count: data.bookingCount }));
  paragraphs.push(...data.rows.map((row, index) => manifestLine(t, row, index)));

  return {
    subject: t("departure.manifest.subject", { tour: data.tourTitle, date: data.travelDate }),
    ...renderEmail({
      preheader: t("departure.manifest.preheader", {
        participants: data.totalParticipants,
        place: data.meetingPoint,
      }),
      heading: t("departure.manifest.heading"),
      greeting: t("greeting", { name: data.guideName }),
      paragraphs,
      details: [
        { label: t("details.tour"), value: data.tourTitle },
        { label: t("departure.details.destination"), value: data.destination },
        { label: t("details.date"), value: data.travelDate },
        { label: t("departure.details.meetingPoint"), value: data.meetingPoint },
        { label: t("departure.details.participants"), value: data.totalParticipants },
        { label: t("departure.details.bookings"), value: String(data.bookingCount) },
      ],
      footnotes: [t("departure.manifest.privacy")],
      footer: t("departure.manifest.footer"),
    }),
  };
}
