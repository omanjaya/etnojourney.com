import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { guideService } from "@/server/services/guide.service";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { emptyGuideDefaults, GuideForm } from "@/features/admin-guides/components/guide-form";

export default async function NewGuidePage() {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("guides.manage");
  const [destinations, t] = await Promise.all([
    guideService.destinationOptions(),
    getTranslations("adminGuides.form"),
  ]);

  return (
    <>
      <Link
        href="/admin/guides"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("newEyebrow")} title={t("newTitle")} />
      <GuideForm mode="create" defaults={emptyGuideDefaults} destinations={destinations} />
    </>
  );
}
