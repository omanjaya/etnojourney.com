import { useTranslations } from "next-intl";
import type { LocalizedText } from "@/lib/i18n-text";
import { BilingualField } from "../form-parts/bilingual-field";
import { Section } from "../form-parts/section";

type ListValue = { value: LocalizedText; onChange: (value: LocalizedText) => void };

/**
 * Highlights and "included" lists, edited as one line per item per locale.
 * The raw text lives in <TourForm> and is paired into items on submit.
 */
export function ListFieldsSection({
  highlights,
  included,
  err,
}: {
  highlights: ListValue;
  included: ListValue;
  err: (key: string) => string | undefined;
}) {
  const t = useTranslations("admin.form");

  return (
    <Section title={t("sections.lists")} hint={t("sections.listsHint")}>
      <BilingualField
        name="highlights"
        label={t("fields.highlights")}
        value={highlights.value}
        onChange={highlights.onChange}
        error={err("highlights")}
        multiline
        rows={5}
      />
      <BilingualField
        name="included"
        label={t("fields.included")}
        value={included.value}
        onChange={included.onChange}
        error={err("included")}
        multiline
        rows={5}
      />
    </Section>
  );
}
