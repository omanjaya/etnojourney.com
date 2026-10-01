import Image from "next/image";
import { ExternalLink, MapPin, Pencil, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";

export default async function AdminDestinationsPage() {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin();
  const [rows, t] = await Promise.all([
    destinationService.listForAdmin(),
    getTranslations("admin.destinations"),
  ]);

  const newButton = (
    <Button asChild>
      <Link href="/admin/destinations/new">
        <Plus aria-hidden />
        {t("new")}
      </Link>
    </Button>
  );

  const tourBadge = (published: number, total: number) => (
    <Badge tone={published > 0 ? "leaf" : "neutral"}>{t("tourCount", { published, total })}</Badge>
  );

  return (
    <>
      <AdminPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={newButton}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t("empty.title")}
          description={t("empty.description")}
          action={newButton}
        />
      ) : (
        <>
          {/* Mobile: stacked cards. */}
          <ul className="admin-stagger flex flex-col gap-3 md:hidden">
            {rows.map(({ destination, publishedTours, totalTours }) => (
              <li
                key={destination.id}
                className="border-line rounded-(--radius-card) border bg-white p-4"
              >
                <div className="flex gap-4">
                  <div className="bg-sand-200 relative size-16 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={destination.heroImage}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{destination.name}</p>
                    <p className="text-muted mt-0.5 text-xs">{destination.province}</p>
                    <div className="mt-2">{tourBadge(publishedTours, totalTours)}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="h-10 flex-1">
                    <Link href={`/admin/destinations/${destination.id}/edit`}>
                      <Pencil aria-hidden />
                      {t("edit")}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" aria-label={t("view")}>
                    <Link href={`/destinations/${destination.slug}`} target="_blank">
                      <ExternalLink aria-hidden />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.destination")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.province")}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t("columns.tours")}
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-medium">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="admin-stagger divide-line [&>tr:hover]:bg-sand-50/70 divide-y [&>tr]:transition-colors">
                {rows.map(({ destination, publishedTours, totalTours }) => (
                  <tr key={destination.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-sand-200 relative size-14 shrink-0 overflow-hidden rounded-xl">
                          <Image
                            src={destination.heroImage}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{destination.name}</p>
                          <p className="text-muted font-mono text-xs">/{destination.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-ink-soft px-5 py-4">{destination.province}</td>
                    <td className="px-5 py-4">{tourBadge(publishedTours, totalTours)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={t("view")}>
                          <Link href={`/destinations/${destination.slug}`} target="_blank">
                            <ExternalLink aria-hidden />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/destinations/${destination.id}/edit`}>
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
        </>
      )}
    </>
  );
}
