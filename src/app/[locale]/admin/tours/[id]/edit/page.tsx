import { ArrowLeft, Copy, Eye, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/i18n-text";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { photoCreditService } from "@/server/services/photo-credit.service";
import { tourService } from "@/server/services/tour.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DeleteTour } from "@/features/admin/components/delete-tour";
import { TourForm } from "@/features/admin/components/tour-form";
import { toTourFormDefaults } from "@/features/admin/components/tour-form/from-tour";
import { requireAdmin } from "@/server/auth/guards";

// Cached so the page and its metadata read the tour once per request.
const loadTour = cache(async (id: number) => {
  try {
    return await tourService.getForEdit(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/tours/[id]/edit">) {
  await requireAdmin("catalogue.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [tour, t, locale] = await Promise.all([
    loadTour(id),
    getTranslations("admin.form"),
    getLocale(),
  ]);
  // Names the tour, so several edit tabs can be told apart.
  return { title: t("editMetaTitle", { title: localize(tour.title, locale) }) };
}

export default async function EditTourPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/tours/[id]/edit">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("catalogue.manage");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const created = (await searchParams).created === "1";

  const [tour, destinations, upcoming, t, tt, locale] = await Promise.all([
    loadTour(id),
    destinationService.list(),
    tourService.upcomingBookingCounts([id]),
    getTranslations("admin.form"),
    getTranslations("admin.tours"),
    getLocale(),
  ]);
  const [removalBlocker, placeholderImages] = await Promise.all([
    tourService.removalBlocker(tour),
    photoCreditService.placeholdersAmong([tour.coverImage, ...tour.gallery]),
  ]);
  const title = localize(tour.title, locale);
  const upcomingBookings = upcoming.get(tour.id) ?? 0;

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        {/* Drafts open as a preview only staff can see. */}
        <Link href={`/tours/${tour.slug}`} target="_blank">
          {tour.isPublished ? <ExternalLink aria-hidden /> : <Eye aria-hidden />}
          {tour.isPublished ? tt("view") : tt("preview")}
        </Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={{ pathname: "/admin/tours/new", query: { from: String(tour.id) } }}>
          <Copy aria-hidden />
          {tt("copy")}
        </Link>
      </Button>
    </div>
  );

  return (
    <>
      <Link
        href="/admin/tours"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("editTitle")} title={title} action={actions} />
      {created && (
        <Alert tone="success" className="mb-8">
          {tour.isPublished ? t("createdLive") : t("createdDraft")}
        </Alert>
      )}
      <TourForm
        mode="edit"
        tourId={tour.id}
        defaults={toTourFormDefaults(tour)}
        version={tour.version}
        publishing={{
          title,
          isPublished: tour.isPublished,
          isFeatured: tour.isFeatured,
          confirmUnpublish:
            upcomingBookings > 0
              ? tt("confirmUnpublish", { count: upcomingBookings, title })
              : undefined,
        }}
        destinations={destinations.map(({ id, name, province }) => ({ id, name, province }))}
        placeholderImages={placeholderImages}
      />
      <DeleteTour tourId={tour.id} title={title} blocker={removalBlocker} />
    </>
  );
}
