import { isCronAuthorized } from "@/server/cron-auth";
import { getEnv } from "@/server/env";
import { mediaService } from "@/server/services/media.service";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Daily job: deletes uploaded tour and destination photos that nothing uses
 * any more (older than two days), with their credits. Call with
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
    const result = await mediaService.pruneOrphanUploads();
    return json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron] media-cleanup failed", error);
    return json({ error: "internal" }, 500);
  }
}
