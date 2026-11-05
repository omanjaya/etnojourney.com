import Image from "next/image";
import { Camera, ExternalLink, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/server/auth/guards";
import { photoCreditService } from "@/server/services/photo-credit.service";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { AddCredit } from "@/features/admin-insights/components/add-credit";
import { CreditEditor } from "@/features/admin-insights/components/credit-editor";
import { parseCreditQuery } from "@/features/admin-insights/schemas";

export async function generateMetadata() {
  const t = await getTranslations("adminInsights.credits");
  return { title: t("title") };
}

export default async function AdminCreditsPage({
  searchParams,
}: PageProps<"/[locale]/admin/credits">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("credits.manage");
  const raw = await searchParams;
  const { q } = parseCreditQuery(raw);

  const [result, suggestions, t, tl] = await Promise.all([
    photoCreditService.listForAdmin(q, parsePage(raw.page), PAGE_SIZE.admin),
    photoCreditService.uncreditedUploads(),
    getTranslations("adminInsights.credits"),
    getTranslations("admin.lists"),
  ]);

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <AddCredit suggestions={suggestions} />

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
                  </div>
                  <p className="text-ink-soft">{credit.author}</p>
                  <p className="text-muted flex flex-wrap items-center gap-x-2">
                    <span>{credit.license}</span>
                    <span aria-hidden>&middot;</span>
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
                  </p>
                  <p className="text-muted mt-1 font-mono text-xs break-all">{credit.path}</p>
                </div>
                <CreditEditor
                  credit={{
                    path: credit.path,
                    title: credit.title,
                    author: credit.author,
                    license: credit.license,
                    licenseUrl: credit.licenseUrl ?? "",
                    sourceUrl: credit.sourceUrl,
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
