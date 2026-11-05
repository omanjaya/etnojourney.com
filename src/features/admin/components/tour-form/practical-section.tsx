import { useTranslations } from "next-intl";
import { Field, Select } from "@/components/ui/form-controls";
import type { TourDifficulty } from "@/server/db/schema";

// Mirrors the `tour_difficulty` enum; a value import of the schema would pull
// drizzle-orm into the client bundle. `satisfies` keeps the two in sync.
const difficulties = ["easy", "moderate", "challenging"] as const satisfies readonly TourDifficulty[];
import { Section } from "../form-parts/section";
import { ListField, type ListValue } from "./list-field";

/** What the public tour page lists when "not included" is left empty. */
const notIncludedDefaults = ["transport", "personal", "tips"] as const;

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
  const tTour = useTranslations("tours.detail.notIncludedDefault");

  return (
    <Section id="tour-practical" title={t("sections.practical")} hint={t("sections.practicalHint")}>
      <Field label={t("fields.difficulty")} htmlFor="difficulty" error={err("difficulty")}>
        <Select
          id="difficulty"
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value as TourDifficulty)}
          className="md:max-w-xs"
        >
          {difficulties.map((level) => (
            <option key={level} value={level}>
              {t(`difficulty.${level}`)}
            </option>
          ))}
        </Select>
      </Field>
      <ListField
        name="notIncluded"
        label={t("fields.notIncluded")}
        list={notIncluded}
        error={err("notIncluded")}
        hint={t("fields.notIncludedHint", {
          items: notIncludedDefaults.map((key) => tTour(key)).join("; "),
        })}
        maxLines={6}
        minRows={4}
      />
      <ListField
        name="whatToBring"
        label={t("fields.whatToBring")}
        list={whatToBring}
        error={err("whatToBring")}
        maxLines={8}
        minRows={4}
      />
      <ListField
        name="etiquette"
        label={t("fields.etiquette")}
        list={etiquette}
        error={err("etiquette")}
        maxLines={6}
        minRows={4}
      />
    </Section>
  );
}
