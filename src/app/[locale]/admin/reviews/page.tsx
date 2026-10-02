import { MessageSquareText, SearchX } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import { reviewService } from "@/server/services/review.service";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Stars } from "@/components/ui/stars";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ReviewPublishToggle } from "@/features/reviews/components/review-publish-toggle";
import { ReviewReplyEditor } from "@/features/reviews/components/review-reply-editor";
import { reviewFilterSchema } from "@/features/reviews/schemas";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { parseAdminListQuery } from "@/features/admin/schemas";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata() {
  const t = await getTranslations("reviews.admin");
  return { title: t("title") };
}

export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/[locale]/admin/reviews">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("reviews.manage");
  const raw = await searchParams;
  const filter = reviewFilterSchema.parse(Array.isArray(raw.filter) ? raw.filter[0] : raw.filter);
  const { q } = parseAdminListQuery(raw);

  const [result, t, tl, locale] = await Promise.all([
    reviewService.listForAdmin({ source: filter, q }, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("reviews.admin"),
    getTranslations("admin.lists"),
    getLocale(),
  ]);
  const rows = result.items;
  const current = { filter, q };

  const filters = [
    { value: undefined, label: t("filters.all") },
    { value: "traveller", label: t("filters.traveller") },
    { value: "curated", label: t("filters.curated") },
    { value: "hidden", label: t("filters.hidden") },
  ] as const;

  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBox
          pathname="/admin/reviews"
          query={current}
          label={tl("searchLabel")}
          placeholder={tl("placeholders.reviews")}
          clearLabel={tl("clear")}
        />
        <p className="text-muted text-sm" aria-live="polite">
          {tl("summary", { total: result.total })}
        </p>
      </div>

      <nav
        aria-label={t("filterLabel")}
        className="mb-6 flex scrollbar-none gap-2 overflow-x-auto pb-1"
      >
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <Link
              key={item.value ?? "all"}
              href={{
                pathname: "/admin/reviews",
                query: Object.fromEntries(
                  Object.entries({ filter: item.value, q }).filter(([, v]) => v),
                ) as Record<string, string>,
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-sand-50"
                  : "border-line text-ink-soft hover:border-sand-300 bg-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {rows.length ? (
        <>
          {/* Mobile: stacked cards keep the publish toggle reachable. */}
          <ul className="admin-stagger flex flex-col gap-3 md:hidden">
            {rows.map(({ review, tour }) => {
              const fromTraveller = review.userId !== null || review.bookingId !== null;
              return (
                <li
                  key={review.id}
                  className={cn(
                    "border-line rounded-(--radius-card) border bg-white p-4",
                    !review.isPublished && "bg-sand-50/80 text-muted",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{review.authorName}</p>
                      <p className="text-muted text-xs">
                        {review.country} &middot; {formatDate(review.createdAt, locale, short)}
                      </p>
                    </div>
                    <Badge tone={fromTraveller ? "terracotta" : "neutral"}>
                      {fromTraveller ? t("source.traveller") : t("source.curated")}
                    </Badge>
                  </div>
                  <Link
                    href={`/tours/${tour.slug}`}
                    className="hover:text-terracotta mt-3 block text-sm font-medium"
                  >
                    {localize(tour.title, locale)}
                  </Link>
                  <span className="sr-only">{t("ratingLabel", { rating: review.rating })}</span>
                  <Stars value={review.rating} className="mt-2" />
                  <p className="text-ink-soft mt-2 line-clamp-4 text-sm leading-relaxed">
                    {localize(review.body, locale)}
                  </p>
                  <ReviewReplyEditor
                    reviewId={review.id}
                    author={review.authorName}
                    initialReply={review.reply}
                    initialRepliedAt={review.repliedAt?.toISOString() ?? null}
                  />
                  <div className="border-line mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-muted text-xs">{t("columns.published")}</span>
                    <ReviewPublishToggle
                      reviewId={review.id}
                      initial={review.isPublished}
                      label={t("toggle", { author: review.authorName })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.tour")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.author")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.rating")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.review")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.date")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.source")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.published")}
                  </th>
                </tr>
              </thead>
              <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
                {rows.map(({ review, tour }) => {
                  const fromTraveller = review.userId !== null || review.bookingId !== null;
                  return (
                    <tr
                      key={review.id}
                      className={cn(
                        "hover:bg-sand-50/60 align-top transition-colors",
                        !review.isPublished && "bg-sand-50/80 text-muted",
                      )}
                    >
                      <td className="max-w-52 px-5 py-4">
                        <Link
                          href={`/tours/${tour.slug}`}
                          className="hover:text-terracotta line-clamp-2"
                        >
                          {localize(tour.title, locale)}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{review.authorName}</p>
                        <p className="text-muted text-xs">{review.country}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="sr-only">
                          {t("ratingLabel", { rating: review.rating })}
                        </span>
                        <Stars value={review.rating} />
                      </td>
                      <td className="max-w-md px-5 py-4">
                        <p className="text-ink-soft line-clamp-3 leading-relaxed">
                          {localize(review.body, locale)}
                        </p>
                        <ReviewReplyEditor
                          reviewId={review.id}
                          author={review.authorName}
                          initialReply={review.reply}
                          initialRepliedAt={review.repliedAt?.toISOString() ?? null}
                        />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {formatDate(review.createdAt, locale, short)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={fromTraveller ? "terracotta" : "neutral"}>
                          {fromTraveller ? t("source.traveller") : t("source.curated")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <ReviewPublishToggle
                          reviewId={review.id}
                          initial={review.isPublished}
                          label={t("toggle", { author: review.authorName })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            className="mt-8"
            pathname="/admin/reviews"
            query={current}
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
      ) : q ? (
        <EmptyState
          icon={SearchX}
          title={tl("noMatchTitle")}
          description={tl("noMatchDescription")}
        />
      ) : (
        <EmptyState
          icon={MessageSquareText}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      )}
    </>
  );
}
