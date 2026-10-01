import { useTranslations } from "next-intl";
import { CheckboxCard } from "../form-parts/checkbox-card";
import { Section } from "../form-parts/section";
import type { TourSectionProps } from "./defaults";

/** Published and featured flags. */
export function VisibilitySection({ values, set }: Omit<TourSectionProps, "err">) {
  const t = useTranslations("admin.form");

  return (
    <Section title={t("sections.visibility")}>
      <div className="grid gap-3 md:grid-cols-2">
        <CheckboxCard
          id="isPublished"
          label={t("fields.isPublished")}
          hint={t("fields.isPublishedHint")}
          checked={values.isPublished}
          onChange={(v) => set("isPublished", v)}
        />
        <CheckboxCard
          id="isFeatured"
          label={t("fields.isFeatured")}
          hint={t("fields.isFeaturedHint")}
          checked={values.isFeatured}
          onChange={(v) => set("isFeatured", v)}
        />
      </div>
    </Section>
  );
}
