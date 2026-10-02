import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { paymentMethodLabel } from "@/lib/payment-method";
import { localizedUrl } from "@/lib/seo";
import type { TicketData } from "@/lib/pdf/ticket-pdf";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { accountService } from "./account.service";
import { DomainError } from "./errors";
import { buildTicketData, canIssueTicket, ticketFilename } from "./ticket.rules";

const asLocale = (value: string | null | undefined): Locale | undefined =>
  routing.locales.find((l) => l === value);

/** `public/` is copied next to the standalone server, so this resolves in Docker too. */
const LOGO_PATH = path.join(process.cwd(), "public", "brand", "logo-full-ink.png");
let logo: Promise<Uint8Array | null> | undefined;

function loadLogo(): Promise<Uint8Array | null> {
  logo ??= readFile(LOGO_PATH).then(
    (buffer) => new Uint8Array(buffer),
    (error) => {
      console.warn("[ticket] logo not found, falling back to text", error);
      logo = undefined;
      return null;
    },
  );
  return logo;
}

export const ticketService = {
  /**
   * E-ticket content for one of `userId`'s bookings. Throws `notFound` for
   * unknown codes and other users' bookings, `forbidden` while the booking is
   * not confirmed or completed. `preferredLocale` (e.g. from the link) wins
   * over the user's saved language.
   */
  async forOwner(
    userId: string,
    code: string,
    preferredLocale?: string | null,
  ): Promise<{ data: TicketData; filename: string; logo: Uint8Array | null }> {
    const booking = await accountService.bookingDetail(userId, code);
    if (!canIssueTicket(booking.status)) throw new DomainError("forbidden");

    const [profile, payment, logoPng] = await Promise.all([
      accountService.profile(userId),
      notificationRepository.latestPaidPayment(booking.id),
      loadLogo(),
    ]);
    const locale = asLocale(preferredLocale) ?? asLocale(profile.locale) ?? routing.defaultLocale;
    const [t, methods] = await Promise.all([
      getTranslations({ locale, namespace: "trip.ticket" }),
      getTranslations({ locale, namespace: "payment.methods" }),
    ]);

    const data = buildTicketData(
      {
        booking,
        tour: booking.tour,
        payment: payment
          ? {
              amount: payment.amount,
              methodLabel: paymentMethodLabel(payment.method, (m) => methods(m)),
            }
          : null,
      },
      {
        locale,
        t: (key, values) => t(key as never, values as never),
        bookingUrl: localizedUrl(`/account/bookings/${booking.code}`, locale),
        policyUrl: localizedUrl("/cancellation-policy", locale),
      },
    );
    return { data, filename: ticketFilename(booking.code), logo: logoPng };
  },
};
