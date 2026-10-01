import { CalendarCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { bookingStatus } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { BookingsTable } from "@/features/admin/components/bookings-table";
import { bookingFilterSchema } from "@/features/admin/schemas";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/[locale]/admin/bookings">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const status = bookingFilterSchema.parse(rawStatus);

  const [rows, t, ts] = await Promise.all([
    bookingService.listAll(status),
    getTranslations("admin.bookings"),
    getTranslations("common.bookingStatus"),
  ]);

  const filters = [
    { value: undefined, label: t("all") },
    ...bookingStatus.enumValues.map((value) => ({ value, label: ts(value) })),
  ];

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <nav
        aria-label={t("filterLabel")}
        className="mb-6 flex scrollbar-none gap-2 overflow-x-auto pb-1"
      >
        {filters.map((filter) => {
          const active = filter.value === status;
          return (
            <Link
              key={filter.value ?? "all"}
              href={
                filter.value
                  ? { pathname: "/admin/bookings", query: { status: filter.value } }
                  : "/admin/bookings"
              }
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
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

      {rows.length ? (
        <BookingsTable rows={rows} withActions />
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
