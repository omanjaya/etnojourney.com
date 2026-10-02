import { bookingCalendarResponse } from "@/features/account/calendar";

/**
 * `/account/bookings/<code>/calendar.ics` (no locale prefix). The proxy skips
 * paths with a dot, so this un-prefixed URL needs its own route; the event is
 * written in the user's preferred language.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/account/bookings/[code]/calendar.ics">,
) {
  const { code } = await ctx.params;
  return bookingCalendarResponse(request, code);
}
