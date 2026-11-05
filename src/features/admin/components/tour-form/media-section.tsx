import { useTranslations } from "next-intl";
import { Field, fieldDescribedBy } from "@/components/ui/form-controls";
import { ImageUploader, MultiImageUploader } from "@/features/media/components/image-uploader";
import { Section } from "../form-parts/section";
import type { TourSectionProps } from "./defaults";

/** Cover image and gallery uploaders. */
export function MediaSection({ values, set, err }: TourSectionProps) {
  const t = useTranslations("admin.form");
  const tm = useTranslations("media.form");
  const galleryHint = tm("galleryHint");

  return (
    <Section title={t("sections.media")} hint={tm("sectionHint")}>
      <Field label={t("fields.coverImage")} htmlFor="coverImage" error={err("coverImage")}>
        <ImageUploader
          id="coverImage"
          value={values.coverImage}
          onChange={(url) => set("coverImage", url)}
          invalid={Boolean(err("coverImage"))}
          describedBy={fieldDescribedBy("coverImage", { error: err("coverImage") })}
        />
      </Field>
      <Field
        label={t("fields.gallery")}
        htmlFor="gallery"
        error={err("gallery")}
        hint={galleryHint}
      >
        <MultiImageUploader
          id="gallery"
          value={values.gallery}
          onChange={(urls) => set("gallery", urls)}
          describedBy={fieldDescribedBy("gallery", { hint: galleryHint, error: err("gallery") })}
        />
      </Field>
    </Section>
  );
}
