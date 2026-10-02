import Image from "next/image";
import { ExternalLink, MapIcon, Pencil, Plus, SearchX } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { tourService } from "@/server/services/tour.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { parseAdminListQuery } from "@/features/admin/schemas";
import { categoryIcons } from "@/components/shared/category-icon";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { TourToggle } from "@/features/admin/components/tour-toggle";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminToursPage({ searchParams }: PageProps<"/[locale]/admin/tours">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("catalogue.manage");
  const raw = await searchParams;
  const { q } = parseAdminListQuery(raw);
  const [result, t, tc, tl, locale] = await Promise.all([
    tourService.listForAdmin(q, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("admin.tours"),
    getTranslations("common.categories"),
    getTranslations("admin.lists"),
    getLocale(),
  ]);
  const rows = result.items;

  const newButton = (
    <Button asChild>
      <Link href="/admin/tours/new">
        <Plus aria-hidden />
        {t("new")}
      </Link>
    </Button>
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
          pathname="/admin/tours"
          query={{ q }}
          label={tl("searchLabel")}
          placeholder={tl("placeholders.tours")}
          clearLabel={tl("clear")}
        />
        <p className="text-muted text-sm" aria-live="polite">
          {tl("summary", { total: result.total })}
        </p>
      </div>

      {rows.length === 0 && q ? (
        <EmptyState
          icon={SearchX}
          title={tl("noMatchTitle")}
          description={tl("noMatchDescription")}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title={t("empty.title")}
          description={t("empty.description")}
          action={newButton}
        />
      ) : (
        <>
          {/* Mobile: stacked cards keep the publish and featured toggles reachable. */}
          <ul className="admin-stagger flex flex-col gap-3 md:hidden">
            {rows.map(({ tour, destination }) => {
              const title = localize(tour.title, locale);
              const CategoryIcon = categoryIcons[tour.category];
              return (
                <li
                  key={tour.id}
                  className="border-line rounded-(--radius-card) border bg-white p-4"
                >
                  <div className="flex gap-4">
                    <div className="bg-sand-200 relative size-16 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={tour.coverImage}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 leading-snug font-medium">{title}</p>
                      <p className="text-muted mt-0.5 text-xs">
                        {destination.name}, {destination.province}
                      </p>
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatCurrency(tour.pricePerPerson, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge>
                      <CategoryIcon aria-hidden />
                      {tc(tour.category)}
                    </Badge>
                  </div>
                  <div className="border-line mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">{t("columns.published")}</span>
                      <TourToggle
                        tourId={tour.id}
                        field="published"
                        initial={tour.isPublished}
                        label={t("togglePublished", { title })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">{t("columns.featured")}</span>
                      <TourToggle
                        tourId={tour.id}
                        field="featured"
                        initial={tour.isFeatured}
                        label={t("toggleFeatured", { title })}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="h-10 flex-1">
                      <Link href={`/admin/tours/${tour.id}/edit`}>
                        <Pencil aria-hidden />
                        {t("edit")}
                      </Link>
                    </Button>
                    {tour.isPublished && (
                      <Button asChild variant="ghost" size="icon" aria-label={t("view")}>
                        <Link href={`/tours/${tour.slug}`} target="_blank">
                          <ExternalLink aria-hidden />
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.tour")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.category")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-medium">
                    {t("columns.price")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">
                    {t("columns.published")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">
                    {t("columns.featured")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-medium">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
                {rows.map(({ tour, destination }) => {
                  const title = localize(tour.title, locale);
                  const CategoryIcon = categoryIcons[tour.category];
                  return (
                    <tr key={tour.id} className="hover:bg-sand-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-sand-200 relative size-14 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src={tour.coverImage}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{title}</p>
                            <p className="text-muted text-xs">
                              {destination.name}, {destination.province}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge>
                          <CategoryIcon aria-hidden />
                          {tc(tour.category)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-medium whitespace-nowrap tabular-nums">
                        {formatCurrency(tour.pricePerPerson, locale)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <TourToggle
                          tourId={tour.id}
                          field="published"
                          initial={tour.isPublished}
                          label={t("togglePublished", { title })}
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <TourToggle
                          tourId={tour.id}
                          field="featured"
                          initial={tour.isFeatured}
                          label={t("toggleFeatured", { title })}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {tour.isPublished && (
                            <Button asChild variant="ghost" size="icon" aria-label={t("view")}>
                              <Link href={`/tours/${tour.slug}`} target="_blank">
                                <ExternalLink aria-hidden />
                              </Link>
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/tours/${tour.id}/edit`}>
                              <Pencil aria-hidden />
                              {t("edit")}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            className="mt-8"
            pathname="/admin/tours"
            query={{ q }}
            page={result.page}
            pageCount={result.pageCount}
            labels={{
              nav: t("title"),
              previous: tl("previous"),
              next: tl("next"),
              page: (page) => tl("page", { page }),
            }}
          />
        </>
      )}
    </>
  );
}
