import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/guards";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { photoCreditService } from "@/server/services/photo-credit.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DeleteDestination } from "@/features/admin/components/delete-destination";
import { DestinationForm } from "@/features/admin/components/destination-form";

// Cached so the page and its metadata read the destination once per request.
const loadDestination = cache(async (id: number) => {
  try {
    return await destinationService.getForEdit(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/destinations/[id]/edit">) {
  await requireAdmin("catalogue.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [destination, t] = await Promise.all([
    loadDestination(id),
    getTranslations("admin.destinationForm"),
  ]);
  return { title: t("editMetaTitle", { name: destination.name }) };
}

export default async function EditDestinationPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/destinations/[id]/edit">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("catalogue.manage");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const created = (await searchParams).created === "1";

  const [destination, tourCount, t, td] = await Promise.all([
    loadDestination(id),
    destinationService.tourCount(id),
    getTranslations("admin.destinationForm"),
    getTranslations("admin.destinations"),
  ]);
  const placeholderImages = await photoCreditService.placeholdersAmong([destination.heroImage]);

  return (
    <>
      <Link
        href="/admin/destinations"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader
        eyebrow={t("editTitle")}
        title={destination.name}
        action={
          <Button asChild variant="outline">
            <Link href={`/destinations/${destination.slug}`} target="_blank">
              <ExternalLink aria-hidden />
              {td("view")}
            </Link>
          </Button>
        }
      />
      {created && (
        <Alert tone="success" className="mb-8">
          {t("createdNotice")}
        </Alert>
      )}
      <DestinationForm
        mode="edit"
        destinationId={destination.id}
        version={destination.version}
        defaults={{
          slug: destination.slug,
          name: destination.name,
          province: destination.province,
          tagline: destination.tagline,
          description: destination.description,
          heroImage: destination.heroImage,
          gettingThere: destination.gettingThere ?? { id: "", en: "" },
        }}
        placeholderImages={placeholderImages}
      />
      <DeleteDestination
        destinationId={destination.id}
        name={destination.name}
        slug={destination.slug}
        tourCount={tourCount}
      />
    </>
  );
}
