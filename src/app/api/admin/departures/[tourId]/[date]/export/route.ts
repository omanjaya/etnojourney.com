import { getTranslations } from "next-intl/server";
import { pickLocale } from "@/i18n/pick-locale";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { localize } from "@/lib/i18n-text";
import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { paymentStatus, type PaymentStatus } from "@/server/db/schema";
import { departureService } from "@/server/services/departure.service";
import { isDomainError } from "@/server/services/errors";
import { parseDepartureParams } from "@/features/admin-departures/schemas";

// Reads the session and the database on every request.
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

const isPaymentStatus = (value: unknown): value is PaymentStatus =>
  (paymentStatus.enumValues as readonly unknown[]).includes(value);

/**
 * GET /api/admin/departures/:tourId/:date/export?locale=
 * The departure's manifest as CSV (`departures.manage`: staff and admins), with
 * the same columns and wording as the manifest on the page, in `locale` (else
 * the user's language). Travelling bookings only (confirmed first, then
 * pending); no prices and no internal notes. Cells are RFC 4180 quoted and
 * formula-neutralized.
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

  const locale = pickLocale(new URL(request.url).searchParams.get("locale"), session.user.locale);
  const [t, bookingStatus, payment] = await Promise.all([
    getTranslations({ locale, namespace: "adminDepartures" }),
    getTranslations({ locale, namespace: "common.bookingStatus" }),
    getTranslations({ locale, namespace: "payment.status" }),
  ]);
  const header = [
    t("manifest.columns.code"),
    t("manifest.columns.status"),
    t("manifest.columns.payment"),
    t("manifest.columns.name"),
    t("manifest.columns.phone"),
    t("manifest.columns.participants"),
    t("manifest.columns.notes"),
    t("filters.tour"),
    t("detail.date"),
  ];

  const { tour, rows } = manifest;
  const tourTitle = localize(tour.title, locale);
  const body =
    CSV_BOM +
    csvRow(header) +
    rows
      .map((row) =>
        csvRow([
          row.code,
          bookingStatus(row.status),
          isPaymentStatus(row.paymentStatus)
            ? payment(row.paymentStatus)
            : t("manifest.noPayment"),
          row.contactName,
          row.contactPhone,
          row.participants,
          row.notes ?? "",
          tourTitle,
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
