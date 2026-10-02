import type { Metadata } from "next";
import { CreditCard, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/guards";
import { paymentStatus } from "@/server/db/schema";
import { paymentService } from "@/server/services/payment.service";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { PaymentsTable } from "@/features/admin-payments/components/payments-table";
import { RefundQueue } from "@/features/admin-payments/components/refund-queue";
import { parseAdminPaymentQuery } from "@/features/admin-payments/schemas";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPayments.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminPaymentsPage({
  searchParams,
}: PageProps<"/[locale]/admin/payments">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("payments.refund");
  const raw = await searchParams;
  const query = parseAdminPaymentQuery(raw);

  const [queue, result, t, ts] = await Promise.all([
    paymentService.refundQueue(),
    paymentService.listForAdmin(query, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("adminPayments"),
    getTranslations("adminPayments.status"),
  ]);

  // Plain strings for links and client components (status pills keep the search).
  const current: Record<string, string | undefined> = { ...query };
  const statusFilters = [
    { value: undefined, label: t("list.all") },
    ...paymentStatus.enumValues.map((value) => ({ value, label: ts(value) })),
  ];
  const withStatus = (status: string | undefined) => {
    const next: Record<string, string> = {};
    if (query.q) next.q = query.q;
    if (status) next.status = status;
    return { pathname: "/admin/payments", query: next };
  };

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <RefundQueue items={queue} />

      <section aria-labelledby="payments-list-title">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="payments-list-title" className="short:text-xl text-2xl">
            {t("list.title")}
          </h2>
          <AdminSearchBox
            pathname="/admin/payments"
            query={current}
            label={t("list.searchLabel")}
            placeholder={t("list.searchPlaceholder")}
            clearLabel={t("list.clear")}
          />
        </div>

        <nav
          aria-label={t("list.filterLabel")}
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
          {t("list.summary", { total: result.total })}
        </p>

        {result.items.length ? (
          <>
            <PaymentsTable rows={result.items} />
            <Pagination
              className="mt-8"
              pathname="/admin/payments"
              query={current}
              page={result.page}
              pageCount={result.pageCount}
              labels={{
                nav: t("list.pagination.label"),
                previous: t("list.pagination.previous"),
                next: t("list.pagination.next"),
                page: (page) => t("list.pagination.page", { page }),
              }}
            />
          </>
        ) : query.q || query.status ? (
          <EmptyState
            icon={SearchX}
            title={t("list.noMatch.title")}
            description={t("list.noMatch.description")}
          />
        ) : (
          <EmptyState
            icon={CreditCard}
            title={t("list.empty.title")}
            description={t("list.empty.description")}
          />
        )}
      </section>
    </>
  );
}
