import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Section } from "../form-parts/section";
import { TourToggle } from "../tour-toggle";

/** Current publish state of a saved tour, for the switches on its edit page. */
export type TourPublishing = {
  title: string;
  isPublished: boolean;
  isFeatured: boolean;
  /** Confirmation shown before unpublishing (set when upcoming bookings use the tour). */
  confirmUnpublish?: string;
};

function SwitchRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="border-line flex items-start justify-between gap-4 rounded-xl border bg-white p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted mt-1 text-xs">{hint}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

/**
 * Edit mode: publish and featured are the same instant switches as in the tour
 * list (with the same audit entries and booking warning), not part of Save.
 * So a form left open in another tab can never switch a tour off again.
 */
export function LiveVisibilitySection({
  tourId,
  publishing,
}: {
  tourId: number;
  publishing: TourPublishing;
}) {
  const t = useTranslations("admin.form");
  const tt = useTranslations("admin.tours");

  return (
    <Section
      id="tour-visibility"
      title={t("sections.visibility")}
      hint={t("sections.visibilityLiveHint")}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SwitchRow label={t("fields.isPublished")} hint={t("fields.isPublishedHint")}>
          <TourToggle
            tourId={tourId}
            field="published"
            initial={publishing.isPublished}
            label={tt("togglePublished", { title: publishing.title })}
            confirmOff={publishing.confirmUnpublish}
          />
        </SwitchRow>
        <SwitchRow label={t("fields.isFeatured")} hint={t("fields.isFeaturedHint")}>
          <TourToggle
            tourId={tourId}
            field="featured"
            initial={publishing.isFeatured}
            label={tt("toggleFeatured", { title: publishing.title })}
          />
        </SwitchRow>
      </div>
    </Section>
  );
}
