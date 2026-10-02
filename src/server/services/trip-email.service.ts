import "server-only";
import { getTranslations } from "next-intl/server";
import { siteContact } from "@/config/site";
import { routing, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { localizedUrl, siteUrl } from "@/lib/seo";
import { mailer } from "@/server/mail/mailer";
import type { Email, EmailTranslator } from "@/server/mail/templates";
import { reviewRequestEmail, tripReminderEmail } from "@/server/mail/templates/trip";
import { tripEmailRepository, type DateWindow } from "@/server/repositories/trip-email.repository";
import { daysUntil, TRIP_EMAIL_BATCH_LIMIT, tripEmailWindows } from "./trip-email.rules";

export type TripEmailCounts = { candidates: number; sent: number; skipped: number; failed: number };
export type TripEmailRun = {
  today: string;
  reminders: TripEmailCounts;
  reviewRequests: TripEmailCounts;
};

const asLocale = (value: string | null | undefined): Locale =>
  routing.locales.find((l) => l === value) ?? routing.defaultLocale;

async function translator(locale: Locale): Promise<EmailTranslator> {
  const t = await getTranslations({ locale, namespace: "emails" });
  return (key, values) => t(key as never, values as never);
}

const longDate = (date: string, locale: Locale) =>
  formatDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

type Context = NonNullable<Awaited<ReturnType<typeof tripEmailRepository.emailContext>>>;

async function buildReminder(context: Context, today: string): Promise<Email> {
  const { booking, tour, recipient } = context;
  const locale = asLocale(recipient.locale);
  const [t, common] = await Promise.all([
    translator(locale),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const contact = siteContact();
  const support = [contact.email, contact.phone].filter(Boolean).join(" / ") || null;
  return tripReminderEmail(t, {
    recipientName: recipient.name,
    code: booking.code,
    tourTitle: localize(tour.title, locale),
    destination: context.destination,
    travelDate: longDate(booking.travelDate, locale),
    daysUntil: daysUntil(booking.travelDate, today),
    participants: common("people", { count: booking.participants }),
    meetingPoint: tour.meetingPoint,
    contactName: booking.contactName,
    contactPhone: booking.contactPhone,
    whatToBring: tour.whatToBring.map((item) => localize(item, locale)),
    etiquette: tour.etiquette.map((item) => localize(item, locale)),
    bookingUrl: localizedUrl(`/account/bookings/${booking.code}`, locale),
    ticketUrl: `${siteUrl()}/api/bookings/${encodeURIComponent(booking.code)}/ticket?locale=${locale}`,
    support,
  });
}

async function buildReviewRequest(context: Context): Promise<Email> {
  const { booking, tour, recipient } = context;
  const locale = asLocale(recipient.locale);
  return reviewRequestEmail(await translator(locale), {
    recipientName: recipient.name,
    code: booking.code,
    tourTitle: localize(tour.title, locale),
    destination: context.destination,
    travelDate: longDate(booking.travelDate, locale),
    // The booking page is where the "Write a review" dialog lives.
    reviewUrl: localizedUrl(`/account/bookings/${booking.code}`, locale),
  });
}

/**
 * Claim, build, send; on a failed send the claim is released so the next
 * run retries. A row claimed by a concurrent run counts as skipped.
 */
async function sendBatch(
  label: string,
  ids: number[],
  steps: {
    claim: (id: number) => Promise<boolean>;
    release: (id: number) => Promise<void>;
    build: (context: Context) => Promise<Email>;
  },
): Promise<TripEmailCounts> {
  const counts: TripEmailCounts = { candidates: ids.length, sent: 0, skipped: 0, failed: 0 };
  // Sequential on purpose: keeps the mail provider's rate limit happy.
  for (const id of ids) {
    if (!(await steps.claim(id))) {
      counts.skipped++;
      continue;
    }
    try {
      const context = await tripEmailRepository.emailContext(id);
      if (!context) throw new Error(`Booking ${id} not found`);
      const email = await steps.build(context);
      await mailer.send({
        to: context.recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      counts.sent++;
    } catch (error) {
      counts.failed++;
      console.error(`[trip-email] ${label} for booking ${id} failed`, error);
      await steps.release(id).catch((releaseError) => {
        console.error(
          `[trip-email] could not release ${label} claim for booking ${id}`,
          releaseError,
        );
      });
    }
  }
  return counts;
}

export const tripEmailService = {
  /**
   * Sends the due pre-trip reminders and post-trip review requests. Safe to
   * run any number of times a day: each email is claimed atomically first.
   */
  async runScheduled(now: Date = new Date()): Promise<TripEmailRun> {
    const windows = tripEmailWindows(now);
    const reminderWindow: DateWindow = windows.reminder;
    const reviewWindow: DateWindow = windows.reviewRequest;

    const reminderIds = await tripEmailRepository.reminderCandidates(
      reminderWindow,
      TRIP_EMAIL_BATCH_LIMIT,
    );
    const reminders = await sendBatch("reminder", reminderIds, {
      claim: (id) => tripEmailRepository.claimReminder(id, reminderWindow),
      release: (id) => tripEmailRepository.releaseReminder(id),
      build: (context) => buildReminder(context, windows.today),
    });

    const reviewIds = await tripEmailRepository.reviewRequestCandidates(
      reviewWindow,
      TRIP_EMAIL_BATCH_LIMIT,
    );
    const reviewRequests = await sendBatch("reviewRequest", reviewIds, {
      claim: (id) => tripEmailRepository.claimReviewRequest(id, reviewWindow),
      release: (id) => tripEmailRepository.releaseReviewRequest(id),
      build: buildReviewRequest,
    });

    return { today: windows.today, reminders, reviewRequests };
  },
};
