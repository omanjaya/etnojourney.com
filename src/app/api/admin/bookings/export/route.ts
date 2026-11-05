import { getTranslations } from "next-intl/server";
import { pickLocale } from "@/i18n/pick-locale";
import { formatBusinessDateTime, isoDateFromToday } from "@/lib/format";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { localize } from "@/lib/i18n-text";
import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { bookingService } from "@/server/services/booking.service";
import { parseAdminBookingQuery } from "@/features/admin/schemas";

// Reads the session and the database on every request.
export const dynamic = "force-dynamic";

const COLUMNS = [
  "code",
  "status",
  "paymentStatus",
  "customerName",
  "customerEmail",
  "contactName",
  "contactPhone",
  "tour",
  "travelDate",
  "participants",
  "totalIdr",
  "createdAt",
] as const;

/**
 * GET /api/admin/bookings/export?q=&status=&from=&to=&sort=&locale=
 * Back-office CSV (`bookings.manage`: staff and admins, who see the same contact
 * details in the booking pages) of every booking matching the same filters and
 * sort as the admin list. Headers, statuses and tour titles are in `locale`
 * (else the user's language); booking times are Asia/Jakarta. Streams in
 * batches; cells are RFC 4180 quoted and formula-neutralized.
 */
export async function GET(request: Request) {
  // activeSession: a disabled account is treated as signed out.
  const session = activeSession(await auth.api.getSession({ headers: request.headers }));
  if (!session) return new Response("Unauthorized", { status: 401, headers: noStore });
  if (!can(session.user.role, "bookings.manage")) {
    return new Response("Forbidden", { status: 403, headers: noStore });
  }

  const url = new URL(request.url);
  const filters = parseAdminBookingQuery(Object.fromEntries(url.searchParams));
  const locale = pickLocale(url.searchParams.get("locale"), session.user.locale);
  const [columns, bookingStatus, paymentStatus] = await Promise.all([
    getTranslations({ locale, namespace: "admin.bookings.exportColumns" }),
    getTranslations({ locale, namespace: "common.bookingStatus" }),
    getTranslations({ locale, namespace: "adminPayments.status" }),
  ]);
  const batches = bookingService.exportRows(filters);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvRow(COLUMNS.map((key) => columns(key)))));
    },
    async pull(controller) {
      try {
        const { value: batch, done } = await batches.next();
        if (done) return controller.close();
        const chunk = batch
          .map((row) =>
            csvRow([
              row.code,
              bookingStatus(row.status),
              row.paymentStatus ? paymentStatus(row.paymentStatus) : "",
              row.customerName,
              row.customerEmail,
              row.contactName,
              row.contactPhone,
              localize(row.tourTitle, locale),
              row.travelDate,
              row.participants,
              row.totalPrice,
              formatBusinessDateTime(row.createdAt),
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
