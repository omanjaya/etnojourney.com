import { useTranslations } from "next-intl";
import { Section } from "../form-parts/section";
import { ListField, type ListValue } from "./list-field";

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
      <ListField
        name="highlights"
        label={t("fields.highlights")}
        list={highlights}
        error={err("highlights")}
        maxLines={12}
        minRows={5}
      />
      <ListField
        name="included"
        label={t("fields.included")}
        list={included}
        error={err("included")}
        maxLines={20}
        minRows={5}
      />
    </Section>
  );
}
