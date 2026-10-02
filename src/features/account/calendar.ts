import "server-only";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { buildIcs } from "@/lib/ics";
import { localize } from "@/lib/i18n-text";
import { localizedUrl } from "@/lib/seo";
import { auth } from "@/server/auth";
import { accountService } from "@/server/services/account.service";
import { isDomainError } from "@/server/services/errors";

const asLocale = (value: string | null | undefined): Locale | undefined =>
  routing.locales.find((l) => l === value);

/**
 * Builds the `.ics` download for one of the signed-in user's bookings.
 * 401 without a session, 404 for unknown codes and other users' bookings.
 * `urlLocale` is set when the request came through a locale-prefixed path.
 */
export async function bookingCalendarResponse(
  request: Request,
  code: string,
  urlLocale?: string,
): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  let booking;
  try {
    booking = await accountService.bookingDetail(session.user.id, code);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }

  const profile = await accountService.profile(session.user.id);
  const locale = asLocale(urlLocale) ?? asLocale(profile.locale) ?? routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "account.calendar" });
  const { tour } = booking;
  const detailUrl = localizedUrl(`/account/bookings/${booking.code}`, locale);
  const bring = tour.whatToBring.map((item) => `- ${localize(item, locale)}`);

  const ics = buildIcs({
    uid: `${booking.code}@etnojourney`,
    stamp: new Date(),
    startDate: booking.travelDate,
    days: tour.durationDays,
    summary: `${localize(tour.title, locale)} (EtnoJourney)`,
    location: tour.meetingPoint,
    description: [
      t("code", { code: booking.code }),
      t("meetingPoint", { place: tour.meetingPoint }),
      ...(bring.length ? ["", t("bring"), ...bring] : []),
      "",
      t("details", { url: detailUrl }),
    ].join("\n"),
    url: detailUrl,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="etnojourney-${booking.code}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
