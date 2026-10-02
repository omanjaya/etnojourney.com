import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { destinationService } from "@/server/services/destination.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { emptyTourDefaults, TourForm } from "@/features/admin/components/tour-form";
import { requireAdmin } from "@/server/auth/guards";

export default async function NewTourPage() {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("catalogue.manage");
  const [destinations, t] = await Promise.all([
    destinationService.list(),
    getTranslations("admin.form"),
  ]);

  return (
    <>
      <Link
        href="/admin/tours"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("newEyebrow")} title={t("newTitle")} />
      <TourForm
        mode="create"
        defaults={emptyTourDefaults}
        destinations={destinations.map(({ id, name, province }) => ({ id, name, province }))}
      />
    </>
  );
}
