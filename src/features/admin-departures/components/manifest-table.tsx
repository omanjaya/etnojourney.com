import { ChevronRight, MessageSquareText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TableScroll } from "@/components/ui/table-scroll";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import type { BookingStatus, PaymentStatus } from "@/server/db/schema";
import type { ManifestTotals } from "@/server/services/departure.rules";

export type ManifestRow = {
  id: number;
  code: string;
  status: BookingStatus;
  contactName: string;
  contactPhone: string;
  participants: number;
  notes: string | null;
  paymentStatus: string | null;
  notesCount: number;
};

const cell = "px-3 py-3 align-top print:px-2 print:py-1.5";

/**
 * Laptop layout: five compact columns, with status and payment (what the team
 * checks on the day) right after the contact, so they stay in view next to
 * the guide panel at 1280-1366px without side-scrolling. The phone sits under
 * the name and the internal-notes count under the code.
 */
function Rows({ rows }: { rows: ManifestRow[] }) {
  const t = useTranslations("adminDepartures.manifest");
  return rows.map((row) => (
    <tr key={row.id} data-testid="manifest-row" className="hover:bg-sand-50/60 transition-colors">
      <td className={`${cell} font-mono text-xs font-semibold tracking-wide whitespace-nowrap`}>
        <Link
          href={`/admin/bookings/${row.code}`}
          className="hover:text-terracotta inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {row.code}
          <ChevronRight className="size-3.5 print:hidden" aria-hidden />
        </Link>
        {row.notesCount > 0 && (
          <span
            className="text-ink-soft mt-1 flex items-center gap-1 font-sans font-normal tracking-normal tabular-nums"
            title={t("internalNotes", { count: row.notesCount })}
          >
            <MessageSquareText className="size-3.5" aria-hidden />
            {row.notesCount}
            <span className="sr-only">{t("internalNotes", { count: row.notesCount })}</span>
          </span>
        )}
      </td>
      <td className={`${cell} min-w-28`}>
        <p className="font-medium">{row.contactName}</p>
        <a
          href={`tel:${row.contactPhone}`}
          className="text-ink-soft hover:text-terracotta text-xs whitespace-nowrap tabular-nums"
        >
          {row.contactPhone}
        </a>
      </td>
      <td className={cell}>
        <div className="flex flex-col items-start gap-1">
          <BookingStatusBadge status={row.status} />
          {row.paymentStatus ? (
            <PaymentStatusBadge status={row.paymentStatus as PaymentStatus} />
          ) : (
            <span className="text-muted text-xs">{t("noPayment")}</span>
          )}
        </div>
      </td>
      <td className={`${cell} text-right tabular-nums`}>{row.participants}</td>
      <td className={`${cell} max-w-72 min-w-32`}>
        {row.notes ? (
          <span className="text-ink-soft text-xs leading-relaxed whitespace-pre-line">
            {row.notes}
          </span>
        ) : (
          <span className="text-muted text-xs">-</span>
        )}
      </td>
    </tr>
  ));
}

/** Phones: one card per booking, so every field is readable without side-scrolling. */
function Cards({ rows }: { rows: ManifestRow[] }) {
  const t = useTranslations("adminDepartures.manifest");
  const tc = useTranslations("adminDepartures.manifest.columns");
  return (
    <ul className="flex flex-col gap-3 md:hidden print:hidden">
      {rows.map((row) => (
        <li key={row.id} className="border-line rounded-(--radius-card) border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/admin/bookings/${row.code}`}
              className="hover:text-terracotta inline-flex min-h-11 items-center gap-1 font-mono text-sm font-semibold tracking-wide"
            >
              {row.code}
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
            <BookingStatusBadge status={row.status} />
          </div>
          <p className="font-medium">{row.contactName}</p>
          <a
            href={`tel:${row.contactPhone}`}
            className="text-ink-soft hover:text-terracotta inline-flex min-h-11 items-center text-sm tabular-nums"
          >
            {row.contactPhone}
          </a>
          <dl className="border-line mt-1 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div>
              <dt className="text-muted text-xs">{tc("participants")}</dt>
              <dd className="font-medium tabular-nums">{row.participants}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">{tc("payment")}</dt>
              <dd>
                {row.paymentStatus ? (
                  <PaymentStatusBadge status={row.paymentStatus as PaymentStatus} />
                ) : (
                  <span className="text-muted text-xs">{t("noPayment")}</span>
                )}
              </dd>
            </div>
            {row.notes && (
              <div className="col-span-2">
                <dt className="text-muted text-xs">{tc("notes")}</dt>
                <dd className="text-ink-soft text-xs leading-relaxed whitespace-pre-line">
                  {row.notes}
                </dd>
              </div>
            )}
            {row.notesCount > 0 && (
              <div className="col-span-2">
                <dd className="text-ink-soft inline-flex items-center gap-1 text-xs">
                  <MessageSquareText className="size-3.5" aria-hidden />
                  {t("internalNotes", { count: row.notesCount })}
                </dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Head() {
  const t = useTranslations("adminDepartures.manifest.columns");
  const th = "px-3 py-3 font-medium print:px-2";
  return (
    <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
      <tr>
        <th scope="col" className={th}>
          {t("code")}
        </th>
        <th scope="col" className={th}>
          {t("contact")}
        </th>
        <th scope="col" className={th}>
          {t("statusPayment")}
        </th>
        <th scope="col" className={`${th} text-right`}>
          {t("participants")}
        </th>
        <th scope="col" className={th}>
          {t("notes")}
        </th>
      </tr>
    </thead>
  );
}

const tableClass = "w-full min-w-[32rem] text-left text-sm print:min-w-0 print:text-xs";

/**
 * Bookings travelling on the departure (confirmed first, then pending) with
 * totals; cancelled bookings sit behind a disclosure and are left out of print.
 */
export function ManifestTable({ rows, totals }: { rows: ManifestRow[]; totals: ManifestTotals }) {
  const t = useTranslations("adminDepartures.manifest");
  const active = rows.filter((row) => row.status !== "cancelled");
  const cancelled = rows.filter((row) => row.status === "cancelled");

  return (
    <div className="flex flex-col gap-4">
      {active.length === 0 ? (
        <p className="border-line text-muted rounded-(--radius-card) border bg-white p-6 text-sm">
          {t("empty")}
        </p>
      ) : (
        <>
          <Cards rows={active} />
          <p className="text-ink-soft text-sm font-medium md:hidden print:hidden">
            {t("totals", { count: totals.bookings })}: {totals.participants}
          </p>
          <TableScroll
            label={t("tableLabel")}
            className="hidden md:block print:block print:overflow-visible print:rounded-none print:border-0"
          >
            <table className={tableClass}>
              <Head />
              <tbody className="divide-line divide-y">
                <Rows rows={active} />
              </tbody>
              <tfoot className="border-line bg-sand-50 border-t text-sm font-medium">
                <tr>
                  <th scope="row" colSpan={3} className={`${cell} text-left`}>
                    {t("totals", { count: totals.bookings })}
                  </th>
                  <td className={`${cell} text-right tabular-nums`} data-testid="manifest-total">
                    {totals.participants}
                  </td>
                  <td className={`${cell} text-muted text-xs font-normal`}>
                    {t("totalsBreakdown", {
                      confirmed: totals.confirmedParticipants,
                      pending: totals.pendingParticipants,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        </>
      )}

      {cancelled.length > 0 && (
        <details className="group border-line rounded-(--radius-card) border bg-white print:hidden">
          <summary className="text-ink-soft hover:text-ink flex min-h-11 cursor-pointer items-center gap-2 px-5 text-sm font-medium">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90"
              aria-hidden
            />
            {t("showCancelled", { count: cancelled.length })}
          </summary>
          <div className="border-line overflow-x-auto border-t">
            <table className={tableClass}>
              <Head />
              <tbody className="divide-line text-muted divide-y">
                <Rows rows={cancelled} />
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
