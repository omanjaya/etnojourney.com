import { bookingCalendarResponse } from "@/features/account/calendar";

/** Locale-prefixed variant, e.g. `/en/account/bookings/<code>/calendar.ics`. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/[locale]/account/bookings/[code]/calendar.ics">,
) {
  const { locale, code } = await ctx.params;
  return bookingCalendarResponse(request, code, locale);
}
