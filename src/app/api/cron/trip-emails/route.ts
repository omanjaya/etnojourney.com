import { isCronAuthorized } from "@/server/cron-auth";
import { getEnv } from "@/server/env";
import { bookingService } from "@/server/services/booking.service";
import { notificationService } from "@/server/services/notification.service";
import { tripEmailService } from "@/server/services/trip-email.service";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Daily job: pre-trip reminders and post-trip review requests. With
 * RELEASE_UNPAID_HOLDS=true it also releases the seats of unpaid bookings
 * (`bookingService.releaseStaleHolds`; each traveller gets the usual "booking
 * cancelled" email). A failure there never stops the trip emails. Call with
 * `Authorization: Bearer $CRON_SECRET` (see README, "Email terjadwal").
 * 404 while CRON_SECRET is unset (the endpoint is off), 401 on a wrong secret.
 */
export async function POST(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return json({ error: "not found" }, 404);
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return json({ error: "unauthorized" }, 401);
  }

  let unpaidHolds: { checked: number; released: number } | "off" | "failed" = "off";
  if (getEnv().RELEASE_UNPAID_HOLDS === "true") {
    try {
      const holds = await bookingService.releaseStaleHolds();
      // One at a time: a slow mail server must not open many SMTP connections.
      for (const bookingId of holds.released) {
        await notificationService.bookingStatusChanged(bookingId);
      }
      unpaidHolds = { checked: holds.checked, released: holds.released.length };
    } catch (error) {
      console.error("[cron] releasing unpaid holds failed", error);
      unpaidHolds = "failed";
    }
  }

  try {
    const result = await tripEmailService.runScheduled();
    return json({ ok: true, ...result, unpaidHolds });
  } catch (error) {
    console.error("[cron] trip-emails failed", error);
    return json({ error: "internal" }, 500);
  }
}
