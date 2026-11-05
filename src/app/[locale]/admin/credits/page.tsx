import Image from "next/image";
import { Camera, ExternalLink, SearchX } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n-text";
import { requireAdmin } from "@/server/auth/guards";
import { photoCreditService, type ImageOwner } from "@/server/services/photo-credit.service";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { AddCredit } from "@/features/admin-insights/components/add-credit";
import { CreditEditor } from "@/features/admin-insights/components/credit-editor";
import { DeleteCredit } from "@/features/admin-insights/components/delete-credit";
import { PlaceholderUsage } from "@/features/admin-insights/components/placeholder-usage";
import { parseCreditQuery } from "@/features/admin-insights/schemas";

export async function generateMetadata() {
  const t = await getTranslations("adminInsights.credits");
  return { title: t("title") };
}

/** Display name and edit page of a tour or destination that shows a photo. */
function ownerLink(owner: ImageOwner, locale: Locale) {
  return owner.kind === "tour"
    ? {
        key: `tour:${owner.id}`,
        label: localize(owner.title, locale),
        href: `/admin/tours/${owner.id}/edit`,
      }
    : {
        key: `destination:${owner.id}`,
        label: owner.name,
        href: `/admin/destinations/${owner.id}/edit`,
      };
}

export default async function AdminCreditsPage({
  searchParams,
}: PageProps<"/[locale]/admin/credits">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("credits.manage");
  const raw = await searchParams;
  const { q } = parseCreditQuery(raw);

  const [result, uncredited, placeholders, t, tl, locale] = await Promise.all([
    photoCreditService.listForAdmin(q, parsePage(raw.page), PAGE_SIZE.admin),
    photoCreditService.uncreditedUploads(),
    photoCreditService.placeholderUsage(),
    getTranslations("adminInsights.credits"),
    getTranslations("admin.lists"),
    getLocale() as Promise<Locale>,
  ]);

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <PlaceholderUsage
        rows={placeholders.map(({ owner, images }) => ({
          ...ownerLink(owner, locale),
          kind: owner.kind,
          images,
          draft: owner.kind === "tour" && !owner.isPublished,
        }))}
      />

      <AddCredit
        uploads={uncredited.map(({ path, usedIn }) => ({
          path,
          usedIn: usedIn.map((owner) => ownerLink(owner, locale)),
        }))}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBox
          pathname="/admin/credits"
          query={{ q }}
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          clearLabel={tl("clear")}
        />
        <p className="text-muted text-sm" aria-live="polite">
          {t("summary", { total: result.total })}
        </p>
      </div>

      {result.items.length ? (
        <>
          <ul className="admin-stagger flex flex-col gap-3">
            {result.items.map((credit) => (
              <li
                key={credit.path}
                className="border-line flex flex-wrap items-start gap-4 rounded-(--radius-card) border bg-white p-4"
              >
                <div className="bg-sand-200 relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image src={credit.path} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium break-words">{credit.title}</p>
                    {credit.path.startsWith("/media/") && (
                      <Badge tone="terracotta">{t("uploaded")}</Badge>
                    )}
                    {!credit.inUse && <Badge>{t("unused")}</Badge>}
                  </div>
                  <p className="text-ink-soft">{credit.author}</p>
                  <p className="text-muted flex flex-wrap items-center gap-x-2">
                    <span>{credit.license}</span>
                    <span aria-hidden>&middot;</span>
                    {credit.sourceUrl ? (
                      <a
                        href={credit.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-terracotta inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        {credit.source}
                        <ExternalLink className="size-3" aria-hidden />
                        <span className="sr-only">{t("opensNewTab")}</span>
                      </a>
                    ) : (
                      <span>{credit.source}</span>
                    )}
                  </p>
                  {!credit.inUse && <p className="text-muted mt-1 text-xs">{t("unusedHint")}</p>}
                  <p className="text-muted mt-1 font-mono text-xs break-all">{credit.path}</p>
                </div>
                {credit.deletable && <DeleteCredit path={credit.path} title={credit.title} />}
                <CreditEditor
                  credit={{
                    path: credit.path,
                    title: credit.title,
                    author: credit.author,
                    license: credit.license,
                    licenseUrl: credit.licenseUrl ?? "",
                    sourceUrl: credit.sourceUrl ?? "",
                    source: credit.source,
                  }}
                />
              </li>
            ))}
          </ul>
          <Pagination
            className="mt-8"
            pathname="/admin/credits"
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
      ) : q ? (
        <EmptyState
          icon={SearchX}
          title={tl("noMatchTitle")}
          description={tl("noMatchDescription")}
        />
      ) : (
        <EmptyState icon={Camera} title={t("empty.title")} description={t("empty.description")} />
      )}
    </>
  );
}
