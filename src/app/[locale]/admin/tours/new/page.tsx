import { ArrowLeft, Copy } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/i18n-text";
import { copySlug } from "@/server/services/catalogue.rules";
import { destinationService } from "@/server/services/destination.service";
import { isDomainError } from "@/server/services/errors";
import { tourService } from "@/server/services/tour.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  emptyTourDefaults,
  TourForm,
  type TourFormDefaults,
} from "@/features/admin/components/tour-form";
import { toTourFormDefaults } from "@/features/admin/components/tour-form/from-tour";
import { requireAdmin } from "@/server/auth/guards";

/** `?from=<id>`: the tour to copy, or null when missing or invalid (empty form then). */
async function loadSource(raw: string | string[] | undefined) {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id < 1) return null;
  try {
    return await tourService.getForEdit(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") return null;
    throw error;
  }
}

export default async function NewTourPage({
  searchParams,
}: PageProps<"/[locale]/admin/tours/new">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("catalogue.manage");
  const [source, destinations, t, locale] = await Promise.all([
    searchParams.then((search) => loadSource(search.from)),
    destinationService.list(),
    getTranslations("admin.form"),
    getLocale(),
  ]);

  // A copy keeps everything except the address and visibility: it starts as a
  // hidden draft, and its slug follows the new title once that is edited.
  const defaults: TourFormDefaults = source
    ? {
        ...toTourFormDefaults(source),
        slug: copySlug(source.slug),
        isPublished: false,
        isFeatured: false,
      }
    : emptyTourDefaults;
  const sourceTitle = source ? localize(source.title, locale) : null;

  return (
    <>
      <Link
        href="/admin/tours"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader
        eyebrow={t("newEyebrow")}
        title={sourceTitle ? t("copyTitle", { title: sourceTitle }) : t("newTitle")}
      />
      {sourceTitle && (
        <p className="bg-sand-100 text-ink-soft mb-8 flex items-start gap-3 rounded-xl px-4 py-3 text-sm">
          <Copy className="text-terracotta mt-0.5 size-4 shrink-0" aria-hidden />
          {t("copyNotice", { title: sourceTitle })}
        </p>
      )}
      {/* A different source is a different form: start from fresh state. */}
      <TourForm
        key={source?.id ?? "new"}
        mode="create"
        defaults={defaults}
        destinations={destinations.map(({ id, name, province }) => ({ id, name, province }))}
      />
    </>
  );
}
