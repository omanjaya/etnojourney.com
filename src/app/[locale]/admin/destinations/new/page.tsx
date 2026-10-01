import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  DestinationForm,
  emptyDestinationDefaults,
} from "@/features/admin/components/destination-form";

export default async function NewDestinationPage() {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin();
  const t = await getTranslations("admin.destinationForm");

  return (
    <>
      <Link
        href="/admin/destinations"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader eyebrow={t("newEyebrow")} title={t("newTitle")} />
      <DestinationForm mode="create" defaults={emptyDestinationDefaults} />
    </>
  );
}
