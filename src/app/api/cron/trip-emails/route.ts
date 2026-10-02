import { isCronAuthorized } from "@/server/cron-auth";
import { getEnv } from "@/server/env";
import { tripEmailService } from "@/server/services/trip-email.service";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Daily job: pre-trip reminders and post-trip review requests. Call with
 * `Authorization: Bearer $CRON_SECRET` (see README, "Email terjadwal").
 * 404 while CRON_SECRET is unset (the endpoint is off), 401 on a wrong secret.
 */
export async function POST(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return json({ error: "not found" }, 404);
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const result = await tripEmailService.runScheduled();
    return json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron] trip-emails failed", error);
    return json({ error: "internal" }, 500);
  }
}
