import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/i18n-text";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { tourService } from "@/server/services/tour.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { TourForm, type TourFormDefaults } from "@/features/admin/components/tour-form";
import { requireAdmin } from "@/server/auth/guards";

async function loadTour(id: number) {
  try {
    return await tourService.getForEdit(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export default async function EditTourPage({
  params,
}: PageProps<"/[locale]/admin/tours/[id]/edit">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const [tour, destinations, t, locale] = await Promise.all([
    loadTour(id),
    destinationService.list(),
    getTranslations("admin.form"),
    getLocale(),
  ]);

  const defaults: TourFormDefaults = {
    slug: tour.slug,
    destinationId: tour.destinationId,
    title: tour.title,
    summary: tour.summary,
    description: tour.description,
    category: tour.category,
    durationDays: tour.durationDays,
    pricePerPerson: tour.pricePerPerson,
    maxParticipants: tour.maxParticipants,
    meetingPoint: tour.meetingPoint,
    coverImage: tour.coverImage,
    gallery: tour.gallery,
    highlights: tour.highlights,
    included: tour.included,
    isPublished: tour.isPublished,
    isFeatured: tour.isFeatured,
    itinerary: tour.itinerary.map(({ title, description }) => ({ title, description })),
  };

  return (
    <>
      <Link
        href="/admin/tours"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("editTitle")} title={localize(tour.title, locale)} />
      <TourForm
        mode="edit"
        tourId={tour.id}
        defaults={defaults}
        destinations={destinations.map(({ id, name, province }) => ({ id, name, province }))}
      />
    </>
  );
}
