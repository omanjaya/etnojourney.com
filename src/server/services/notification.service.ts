import "server-only";
import { getTranslations } from "next-intl/server";
import { localizedUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { paymentMethodLabel } from "@/lib/payment-method";
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
import {
  adminBookingCreatedEmail,
  adminPaymentSucceededEmail,
  type AdminBookingEmailData,
} from "@/server/mail/templates/admin";
import { permissions } from "@/server/auth/permissions";
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

type BookingContext = NonNullable<
  Awaited<ReturnType<typeof notificationRepository.bookingContext>>
>;

/**
 * Emails every active back-office user (roles with `bookings.manage`, not
 * disabled) about a booking, each in their own saved locale. One failed
 * delivery doesn't stop the others.
 */
async function notifyBackoffice(
  label: string,
  bookingId: number,
  build: (
    t: EmailTranslator,
    data: AdminBookingEmailData,
    locale: Locale,
    context: BookingContext,
  ) => Promise<Email>,
): Promise<void> {
  const [context, recipients] = await Promise.all([
    notificationRepository.bookingContext(bookingId),
    notificationRepository.activeUsersWithRoles(permissions["bookings.manage"]),
  ]);
  if (!context) throw new Error(`Booking ${bookingId} not found`);
  const { booking, tour } = context;

  await Promise.all(
    recipients.map((recipient) =>
      safely(`${label} -> ${recipient.email}`, async () => {
        const locale = asLocale(recipient.locale);
        const common = await getTranslations({ locale, namespace: "common" });
        const data: AdminBookingEmailData = {
          recipientName: recipient.name,
          code: booking.code,
          tourTitle: localize(tour.title, locale),
          travelDate: formatDate(booking.travelDate, locale),
          participants: common("people", { count: booking.participants }),
          total: formatCurrency(booking.totalPrice, locale),
          contactName: booking.contactName,
          contactPhone: booking.contactPhone,
          adminUrl: localizedUrl(`/admin/bookings/${booking.code}`, locale),
        };
        await deliver(
          recipient.email,
          await build(await translator(locale), data, locale, context),
        );
      }),
    ),
  );
}

export const notificationService = {
  async bookingCreated(bookingId: number): Promise<void> {
    await safely("bookingCreated", async () => {
      const { recipient, data, locale } = await loadBooking(bookingId);
      await deliver(recipient.email, bookingCreatedEmail(await translator(locale), data));
    });
    await safely("bookingCreated.backoffice", () =>
      notifyBackoffice("bookingCreated.backoffice", bookingId, async (t, data) =>
        adminBookingCreatedEmail(t, data),
      ),
    );
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
      const methods = await getTranslations({ locale, namespace: "payment.methods" });
      await deliver(
        recipient.email,
        paymentSucceededEmail(await translator(locale), {
          ...data,
          amount: formatCurrency(payment?.amount ?? booking.totalPrice, locale),
          method: paymentMethodLabel(payment?.method, (code) => methods(code)),
        }),
      );
    });
    await safely("paymentSucceeded.backoffice", async () => {
      const payment = await notificationRepository.latestPaidPayment(bookingId);
      await notifyBackoffice(
        "paymentSucceeded.backoffice",
        bookingId,
        async (t, data, locale, { booking }) => {
          const methods = await getTranslations({ locale, namespace: "payment.methods" });
          return adminPaymentSucceededEmail(t, {
            ...data,
            amount: formatCurrency(payment?.amount ?? booking.totalPrice, locale),
            method: paymentMethodLabel(payment?.method, (code) => methods(code)),
          });
        },
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
