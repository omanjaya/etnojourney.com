import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { isDomainError } from "@/server/services/errors";
import { guideService } from "@/server/services/guide.service";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { GuideAccountControl } from "@/features/admin-guides/components/guide-account-control";
import { GuideForm } from "@/features/admin-guides/components/guide-form";

// Cached so the page and its metadata read the guide once per request.
const loadGuide = cache(async (id: number) => {
  try {
    return await guideService.detailForAdmin(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/guides/[id]/edit">) {
  // Guarded too: the title carries the guide's name.
  await requireAdmin("guides.manage");
  const { id: rawId } = await params;
  if (!/^\d{1,9}$/.test(rawId) || Number(rawId) < 1) notFound();
  const [{ guide }, t] = await Promise.all([
    loadGuide(Number(rawId)),
    getTranslations("adminGuides.form"),
  ]);
  return { title: t("editMetaTitle", { name: guide.name }) };
}

export default async function EditGuidePage({
  params,
}: PageProps<"/[locale]/admin/guides/[id]/edit">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  const viewer = await requireAdmin("guides.manage");
  const { id: rawId } = await params;
  if (!/^\d{1,9}$/.test(rawId)) notFound();
  const id = Number(rawId);
  if (id < 1) notFound();

  const [{ guide, destinationIds, account }, destinations, t, ta] = await Promise.all([
    loadGuide(id),
    guideService.destinationOptions(),
    getTranslations("adminGuides.form"),
    getTranslations("adminGuides.account"),
  ]);
  const canLink = can(viewer.role, "users.manage");

  return (
    <>
      <Link
        href="/admin/guides"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>
      <AdminPageHeader
        eyebrow={t("editEyebrow")}
        title={guide.name}
        description={guide.organization ?? undefined}
        action={
          <Badge tone={guide.isActive ? "leaf" : "neutral"}>
            {guide.isActive ? t("statusActive") : t("statusInactive")}
          </Badge>
        }
      />

      {/* One column: the form needs the full width on laptops (a side panel squeezed its fields). */}
      <div className="grid gap-8">
        <GuideForm
          mode="edit"
          guideId={guide.id}
          destinations={destinations}
          defaults={{
            name: guide.name,
            organization: guide.organization ?? "",
            phone: guide.phone ?? "",
            email: guide.email ?? "",
            languages: guide.languages,
            destinationIds,
            notes: guide.notes ?? "",
            isActive: guide.isActive,
          }}
        />

        <aside className="max-w-2xl">
          <section className="border-line rounded-(--radius-card) border bg-white p-5 sm:p-6">
            <h2 className="mb-2 text-xl">{ta("title")}</h2>
            <p className="text-muted mb-4 text-sm">{ta("description")}</p>
            {canLink ? (
              <GuideAccountControl
                guideId={guide.id}
                account={
                  account
                    ? {
                        id: account.id,
                        name: account.name,
                        email: account.email,
                        isPartner: account.role === "partner",
                        disabled: account.disabledAt !== null,
                      }
                    : null
                }
              />
            ) : account ? (
              <p className="text-sm">
                <span className="text-muted block text-xs">{ta("linkedTo")}</span>
                <span className="break-all">{account.email}</span>
              </p>
            ) : (
              <p className="text-ink-soft text-sm">{ta("adminOnly")}</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
