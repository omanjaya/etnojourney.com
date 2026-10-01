import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { mailer } from "@/server/mail/mailer";
import {
  bookingCreatedEmail,
  bookingStatusChangedEmail,
  passwordResetEmail,
  paymentSucceededEmail,
  type BookingEmailData,
  type Email,
  type EmailTranslator,
} from "@/server/mail/templates";
import { notificationRepository } from "@/server/repositories/notification.repository";

/**
 * Locale choice: booking and payment emails use the recipient's saved
 * `user.locale` (set from the sign-up page's locale and editable in account
 * settings). Password reset emails follow the locale of the page the request
 * came from, which Better Auth passes back via the callback URL.
 */
function asLocale(value: string | null | undefined): Locale {
  return routing.locales.find((l) => l === value) ?? routing.defaultLocale;
}

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function localizedUrl(path: string, locale: Locale): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${baseUrl()}${prefix}${path}`;
}

async function translator(locale: Locale): Promise<EmailTranslator> {
  const t = await getTranslations({ locale, namespace: "emails" });
  return (key, values) => t(key as never, values as never);
}

async function deliver(to: string, email: Email) {
  await mailer.send({ to, subject: email.subject, html: email.html, text: email.text });
}

/** Runs a notification and swallows failures so mail problems never break the caller. */
async function safely(label: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`[notification] ${label} failed`, error);
  }
}

async function loadBooking(bookingId: number) {
  const context = await notificationRepository.bookingContext(bookingId);
  if (!context) throw new Error(`Booking ${bookingId} not found`);
  const { booking, tour, recipient } = context;
  const locale = asLocale(recipient.locale);
  const common = await getTranslations({ locale, namespace: "common" });
  const data: BookingEmailData = {
    recipientName: recipient.name,
    code: booking.code,
    tourTitle: localize(tour.title, locale),
    travelDate: formatDate(booking.travelDate, locale),
    participants: common("people", { count: booking.participants }),
    total: formatCurrency(booking.totalPrice, locale),
    accountUrl: localizedUrl(`/account/bookings/${booking.code}`, locale),
  };
  return { booking, recipient, data, locale };
}

function humanizeMethod(method: string | null | undefined): string {
  if (!method) return "-";
  return method
    .split(/[_-]/)
    .map((part) => (part.length <= 4 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

export const notificationService = {
  async bookingCreated(bookingId: number): Promise<void> {
    await safely("bookingCreated", async () => {
      const { recipient, data, locale } = await loadBooking(bookingId);
      await deliver(recipient.email, bookingCreatedEmail(await translator(locale), data));
    });
  },

  async bookingStatusChanged(bookingId: number): Promise<void> {
    await safely("bookingStatusChanged", async () => {
      const { booking, recipient, data, locale } = await loadBooking(bookingId);
      await deliver(
        recipient.email,
        bookingStatusChangedEmail(await translator(locale), { ...data, status: booking.status }),
      );
    });
  },

  async paymentSucceeded(bookingId: number): Promise<void> {
    await safely("paymentSucceeded", async () => {
      const { booking, recipient, data, locale } = await loadBooking(bookingId);
      const payment = await notificationRepository.latestPaidPayment(bookingId);
      await deliver(
        recipient.email,
        paymentSucceededEmail(await translator(locale), {
          ...data,
          amount: formatCurrency(payment?.amount ?? booking.totalPrice, locale),
          method: humanizeMethod(payment?.method),
        }),
      );
    });
  },

  /** Used by Better Auth's `sendResetPassword` hook. */
  async passwordReset(params: {
    name: string;
    email: string;
    resetUrl: string;
    locale: Locale;
  }): Promise<void> {
    await safely("passwordReset", async () => {
      const email = passwordResetEmail(await translator(params.locale), {
        recipientName: params.name,
        resetUrl: params.resetUrl,
      });
      await deliver(params.email, email);
    });
  },
};
