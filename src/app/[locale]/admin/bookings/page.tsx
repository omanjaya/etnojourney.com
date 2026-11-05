import { CalendarCheck, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { bookingStatus } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminBookingFilters } from "@/features/admin/components/admin-booking-filters";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BookingsTable } from "@/features/admin/components/bookings-table";
import { parseAdminBookingQuery } from "@/features/admin/schemas";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/[locale]/admin/bookings">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("bookings.manage");
  const raw = await searchParams;
  const query = parseAdminBookingQuery(raw);

  const [result, t, ts] = await Promise.all([
    bookingService.listForAdmin(query, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("admin.bookings"),
    getTranslations("common.bookingStatus"),
  ]);

  // Plain strings for links and client components (status pills keep the other filters).
  const current: Record<string, string | undefined> = { ...query };
  const filtered = Boolean(query.q || query.from || query.to);
  const exportParams = new URLSearchParams(
    Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const exportHref = `/api/admin/bookings/export${exportParams.size ? `?${exportParams}` : ""}`;

  const statusFilters = [
    { value: undefined, label: t("all") },
    ...bookingStatus.enumValues.map((value) => ({ value, label: ts(value) })),
  ];
  const withStatus = (status: string | undefined) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(current)) {
      if (key !== "status" && value) next[key] = value;
    }
    if (status) next.status = status;
    return { pathname: "/admin/bookings", query: next };
  };

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <AdminBookingFilters query={current} exportHref={exportHref} />

      <nav
        aria-label={t("filterLabel")}
        className="mb-4 flex scrollbar-none gap-2 overflow-x-auto pb-1"
      >
        {statusFilters.map((filter) => {
          const active = filter.value === query.status;
          return (
            <Link
              key={filter.value ?? "all"}
              href={withStatus(filter.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-sand-50"
                  : "border-line text-ink-soft hover:border-sand-300 bg-white",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <p className="text-muted mb-4 text-sm" aria-live="polite">
        {t("summary", { total: result.total })}
      </p>

      {result.items.length ? (
        <>
          <BookingsTable rows={result.items} withActions />
          <Pagination
            className="mt-8"
            pathname="/admin/bookings"
            query={current}
            page={result.page}
            pageCount={result.pageCount}
            labels={{
              nav: t("pagination.label"),
              previous: t("pagination.previous"),
              next: t("pagination.next"),
              page: (page) => t("pagination.page", { page }),
            }}
          />
        </>
      ) : filtered ? (
        <EmptyState
          icon={SearchX}
          title={t("noMatch.title")}
          description={t("noMatch.description")}
        />
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      )}
    </>
  );
}
