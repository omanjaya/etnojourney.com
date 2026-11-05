import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/form-controls";
import { swapCoverInGallery } from "@/features/media/gallery";
import { CreditsHint } from "@/features/media/components/credits-hint";
import { ImageUploader, MultiImageUploader } from "@/features/media/components/image-uploader";
import { Section } from "../form-parts/section";
import type { TourSectionProps } from "./defaults";

/** Cover image and gallery uploaders. */
export function MediaSection({
  values,
  set,
  err,
  placeholderImages,
  onUploadingChange,
}: TourSectionProps & {
  /** Images credited as temporary AI placeholders (marked for replacement). */
  placeholderImages?: readonly string[];
  /** Reports uploads in progress per field, so the form waits before saving. */
  onUploadingChange?: (field: string, pending: boolean) => void;
}) {
  const t = useTranslations("admin.form");
  const tm = useTranslations("media.form");

  // Uploads finish after the render that started them; read the newest values.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  }, [values]);

  // The old cover is usually also a gallery photo: replace that copy too, so
  // a swapped-out placeholder does not stay on the tour page.
  const setCover = (url: string) => {
    const { coverImage, gallery } = latest.current;
    set("coverImage", url);
    const nextGallery = swapCoverInGallery(gallery, coverImage, url);
    if (nextGallery !== gallery) set("gallery", nextGallery);
  };

  return (
    <Section title={t("sections.media")} hint={tm("sectionHint")}>
      <Field label={t("fields.coverImage")} htmlFor="coverImage" error={err("coverImage")}>
        <ImageUploader
          id="coverImage"
          value={values.coverImage}
          onChange={setCover}
          invalid={Boolean(err("coverImage"))}
          placeholderImages={placeholderImages}
          onPendingChange={(pending) => onUploadingChange?.("coverImage", pending)}
        />
      </Field>
      <Field
        label={t("fields.gallery")}
        htmlFor="gallery"
        error={err("gallery")}
        hint={tm("galleryHint")}
      >
        <MultiImageUploader
          id="gallery"
          value={values.gallery}
          onChange={(urls) => set("gallery", urls)}
          coverUrl={values.coverImage}
          onSetCover={(url) => set("coverImage", url)}
          placeholderImages={placeholderImages}
          onPendingChange={(pending) => onUploadingChange?.("gallery", pending)}
        />
      </Field>
      <CreditsHint />
    </Section>
  );
}
