import { CSV_BOM, csvRow } from "@/lib/csv";
import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { reportService } from "@/server/services/report.service";
import { parseReportQuery } from "@/features/admin-insights/schemas";

// Reads the session and the database on every request.
export const dynamic = "force-dynamic";

const HEADER = [
  "tour_slug",
  "tour_title_id",
  "tour_title_en",
  "bookings",
  "participants",
  "gross_idr",
  "refunds_idr",
  "net_idr",
];

/**
 * GET /api/admin/reports/export?period=&from=&to=
 * Admin-only CSV of the per-tour report table for the same period as the page
 * (revenue by paid date net of refunds; bookings by creation date, Asia/Jakarta).
 */
export async function GET(request: Request) {
  // activeSession: a disabled account is treated as signed out.
  const session = activeSession(await auth.api.getSession({ headers: request.headers }));
  if (!session) return new Response("Unauthorized", { status: 401, headers: noStore });
  if (!can(session.user.role, "reports.view")) {
    return new Response("Forbidden", { status: 403, headers: noStore });
  }

  const url = new URL(request.url);
  const period = parseReportQuery(Object.fromEntries(url.searchParams));
  const rows = await reportService.tourRows(period);

  const body =
    CSV_BOM +
    csvRow(HEADER) +
    rows
      .map((row) =>
        csvRow([
          row.title.slug,
          row.title.title.id,
          row.title.title.en,
          row.bookings,
          row.participants,
          row.gross,
          row.refunds,
          row.net,
        ]),
      )
      .join("");

  return new Response(body, {
    headers: {
      ...noStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-tours-${period.from}-${period.to}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const noStore = { "Cache-Control": "no-store" };
