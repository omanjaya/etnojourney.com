import { Pencil, Plus, SearchX, UserRoundCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import { isGuideLanguage } from "@/server/services/guide.rules";
import { guideService } from "@/server/services/guide.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { parseAdminListQuery } from "@/features/admin/schemas";

export default async function AdminGuidesPage({
  searchParams,
}: PageProps<"/[locale]/admin/guides">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("guides.manage");
  const raw = await searchParams;
  const { q } = parseAdminListQuery(raw);
  const [result, t, tl] = await Promise.all([
    guideService.listForAdmin(q, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("adminGuides.list"),
    getTranslations("adminGuides.languages"),
  ]);
  const rows = result.items;

  const newButton = (
    <Button asChild>
      <Link href="/admin/guides/new">
        <Plus aria-hidden />
        {t("new")}
      </Link>
    </Button>
  );

  const languages = (codes: string[]) =>
    codes.length ? codes.map((code) => (isGuideLanguage(code) ? tl(code) : code)).join(", ") : "-";
  const statusBadge = (active: boolean) => (
    <Badge tone={active ? "leaf" : "neutral"}>{active ? t("active") : t("inactive")}</Badge>
  );
  const accountCell = (email: string | null) =>
    email ? (
      <span className="inline-flex items-center gap-1.5 break-all">
        <UserRoundCheck className="text-leaf size-4 shrink-0" aria-hidden />
        {email}
      </span>
    ) : (
      <span className="text-muted">{t("noAccount")}</span>
    );

  return (
    <>
      <AdminPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={newButton}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBox
          pathname="/admin/guides"
          query={{ q }}
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          clearLabel={t("clear")}
        />
        <p className="text-muted text-sm" aria-live="polite">
          {t("summary", { total: result.total })}
        </p>
      </div>

      {rows.length === 0 && q ? (
        <EmptyState
          icon={SearchX}
          title={t("noMatch.title")}
          description={t("noMatch.description")}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title={t("empty.title")}
          description={t("empty.description")}
          action={newButton}
        />
      ) : (
        <>
          {/* Mobile: stacked cards. */}
          <ul className="admin-stagger flex flex-col gap-3 md:hidden">
            {rows.map((guide) => (
              <li
                key={guide.id}
                className="border-line rounded-(--radius-card) border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{guide.name}</p>
                    {guide.organization && (
                      <p className="text-muted mt-0.5 text-xs">{guide.organization}</p>
                    )}
                  </div>
                  {statusBadge(guide.isActive)}
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted text-xs">{t("columns.destinations")}</dt>
                    <dd>{guide.destinations.join(", ") || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted text-xs">{t("columns.languages")}</dt>
                    <dd>{languages(guide.languages)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted text-xs">{t("columns.account")}</dt>
                    <dd>{accountCell(guide.accountEmail)}</dd>
                  </div>
                </dl>
                <Button asChild variant="outline" size="sm" className="mt-3 h-10 w-full">
                  <Link href={`/admin/guides/${guide.id}/edit`}>
                    <Pencil aria-hidden />
                    {t("edit")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.guide")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.destinations")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.languages")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.status")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.account")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-medium">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
                {rows.map((guide) => (
                  <tr key={guide.id}>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/guides/${guide.id}/edit`}
                        className="hover:text-terracotta font-medium underline-offset-4 hover:underline"
                      >
                        {guide.name}
                      </Link>
                      {guide.organization && (
                        <p className="text-muted text-xs">{guide.organization}</p>
                      )}
                    </td>
                    <td className="text-ink-soft max-w-56 px-5 py-4">
                      {guide.destinations.join(", ") || "-"}
                    </td>
                    <td className="text-ink-soft px-5 py-4">{languages(guide.languages)}</td>
                    <td className="px-5 py-4">{statusBadge(guide.isActive)}</td>
                    <td className="max-w-60 px-5 py-4">{accountCell(guide.accountEmail)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/guides/${guide.id}/edit`}>
                            <Pencil aria-hidden />
                            {t("edit")}
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            className="mt-8"
            pathname="/admin/guides"
            query={{ q }}
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
      )}
    </>
  );
}
