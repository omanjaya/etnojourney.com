import { CSV_BOM, csvRow } from "@/lib/csv";
import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { departureService } from "@/server/services/departure.service";
import { isDomainError } from "@/server/services/errors";
import { parseDepartureParams } from "@/features/admin-departures/schemas";

// Reads the session and the database on every request.
export const dynamic = "force-dynamic";

const HEADER = [
  "code",
  "status",
  "payment_status",
  "contact_name",
  "contact_phone",
  "participants",
  "traveller_notes",
  "internal_notes",
  "tour",
  "travel_date",
];

const noStore = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/departures/:tourId/:date/export
 * The departure's manifest as CSV (`departures.manage`: staff and admins).
 * Travelling bookings only (confirmed first, then pending); no prices. Cells
 * are RFC 4180 quoted and formula-neutralized.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/departures/[tourId]/[date]/export">,
) {
  // activeSession: a disabled account is treated as signed out.
  const session = activeSession(await auth.api.getSession({ headers: request.headers }));
  if (!session) return new Response("Unauthorized", { status: 401, headers: noStore });
  if (!can(session.user.role, "departures.manage")) {
    return new Response("Forbidden", { status: 403, headers: noStore });
  }

  const key = parseDepartureParams(await ctx.params);
  if (!key) return new Response("Not found", { status: 404, headers: noStore });

  let manifest: Awaited<ReturnType<typeof departureService.exportManifest>>;
  try {
    manifest = await departureService.exportManifest(key);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") {
      return new Response("Not found", { status: 404, headers: noStore });
    }
    throw error;
  }

  const { tour, rows } = manifest;
  const body =
    CSV_BOM +
    csvRow(HEADER) +
    rows
      .map((row) =>
        csvRow([
          row.code,
          row.status,
          row.paymentStatus ?? "",
          row.contactName,
          row.contactPhone,
          row.participants,
          row.notes ?? "",
          row.notesCount,
          tour.title.id,
          key.date,
        ]),
      )
      .join("");

  return new Response(body, {
    headers: {
      ...noStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="manifest-${tour.slug}-${key.date}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
