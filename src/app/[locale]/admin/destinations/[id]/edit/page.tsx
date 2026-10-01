import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DeleteDestination } from "@/features/admin/components/delete-destination";
import { DestinationForm } from "@/features/admin/components/destination-form";

async function loadDestination(id: number) {
  try {
    return await destinationService.getForEdit(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export default async function EditDestinationPage({
  params,
}: PageProps<"/[locale]/admin/destinations/[id]/edit">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const [destination, tourCount, t] = await Promise.all([
    loadDestination(id),
    destinationService.tourCount(id),
    getTranslations("admin.destinationForm"),
  ]);

  return (
    <>
      <Link
        href="/admin/destinations"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("editTitle")} title={destination.name} />
      <DestinationForm
        mode="edit"
        destinationId={destination.id}
        defaults={{
          slug: destination.slug,
          name: destination.name,
          province: destination.province,
          tagline: destination.tagline,
          description: destination.description,
          heroImage: destination.heroImage,
        }}
      />
      <DeleteDestination
        destinationId={destination.id}
        name={destination.name}
        tourCount={tourCount}
      />
    </>
  );
}
