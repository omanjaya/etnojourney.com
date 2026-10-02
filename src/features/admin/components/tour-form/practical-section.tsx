import { useTranslations } from "next-intl";
import { Field, Select } from "@/components/ui/form-controls";
import type { LocalizedText } from "@/lib/i18n-text";
import { tourDifficulty, type TourDifficulty } from "@/server/db/schema";
import { BilingualField } from "../form-parts/bilingual-field";
import { Section } from "../form-parts/section";

type ListValue = { value: LocalizedText; onChange: (value: LocalizedText) => void };

/**
 * "Before you go" info: difficulty plus three bilingual lists edited one item
 * per line (paired into items on submit, like highlights and included).
 */
export function PracticalSection({
  difficulty,
  onDifficultyChange,
  notIncluded,
  whatToBring,
  etiquette,
  err,
}: {
  difficulty: TourDifficulty;
  onDifficultyChange: (value: TourDifficulty) => void;
  notIncluded: ListValue;
  whatToBring: ListValue;
  etiquette: ListValue;
  err: (key: string) => string | undefined;
}) {
  const t = useTranslations("admin.form");

  return (
    <Section title={t("sections.practical")} hint={t("sections.practicalHint")}>
      <Field label={t("fields.difficulty")} htmlFor="difficulty" error={err("difficulty")}>
        <Select
          id="difficulty"
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value as TourDifficulty)}
          aria-invalid={err("difficulty") ? true : undefined}
          className="md:max-w-xs"
        >
          {tourDifficulty.enumValues.map((level) => (
            <option key={level} value={level}>
              {t(`difficulty.${level}`)}
            </option>
          ))}
        </Select>
      </Field>
      <BilingualField
        name="notIncluded"
        label={t("fields.notIncluded")}
        value={notIncluded.value}
        onChange={notIncluded.onChange}
        error={err("notIncluded")}
        multiline
        rows={4}
      />
      <BilingualField
        name="whatToBring"
        label={t("fields.whatToBring")}
        value={whatToBring.value}
        onChange={whatToBring.onChange}
        error={err("whatToBring")}
        multiline
        rows={4}
      />
      <BilingualField
        name="etiquette"
        label={t("fields.etiquette")}
        value={etiquette.value}
        onChange={etiquette.onChange}
        error={err("etiquette")}
        multiline
        rows={4}
      />
    </Section>
  );
}
