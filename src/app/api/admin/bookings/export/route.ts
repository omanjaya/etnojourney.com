import { isoDateFromToday } from "@/lib/format";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { auth } from "@/server/auth";
import { bookingService } from "@/server/services/booking.service";
import { parseAdminBookingQuery } from "@/features/admin/schemas";

// Reads the session and the database on every request.
export const dynamic = "force-dynamic";

const HEADER = [
  "code",
  "status",
  "payment_status",
  "customer_name",
  "customer_email",
  "contact_name",
  "contact_phone",
  "tour",
  "travel_date",
  "participants",
  "total_idr",
  "created_at",
];

/**
 * GET /api/admin/bookings/export?q=&status=&from=&to=&sort=
 * Admin-only CSV of every booking matching the same filters as the admin list.
 * Streams in batches; cells are RFC 4180 quoted and formula-neutralized.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401, headers: noStore });
  if (session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403, headers: noStore });
  }

  const url = new URL(request.url);
  const filters = parseAdminBookingQuery(Object.fromEntries(url.searchParams));
  const batches = bookingService.exportRows(filters);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvRow(HEADER)));
    },
    async pull(controller) {
      try {
        const { value: batch, done } = await batches.next();
        if (done) return controller.close();
        const chunk = batch
          .map((row) =>
            csvRow([
              row.code,
              row.status,
              row.paymentStatus ?? "",
              row.customerName,
              row.customerEmail,
              row.contactName,
              row.contactPhone,
              row.tourTitle.id,
              row.travelDate,
              row.participants,
              row.totalPrice,
              row.createdAt.toISOString(),
            ]),
          )
          .join("");
        controller.enqueue(encoder.encode(chunk));
      } catch (error) {
        console.error("[export] bookings", error);
        controller.error(error);
      }
    },
    async cancel() {
      await batches.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      ...noStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${isoDateFromToday(0)}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const noStore = { "Cache-Control": "no-store" };
