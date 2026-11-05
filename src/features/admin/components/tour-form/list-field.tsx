import { useTranslations } from "next-intl";
import type { LocalizedText } from "@/lib/i18n-text";
import { BilingualField } from "../form-parts/bilingual-field";
import { lineCounts, listRows } from "./lines";

export type ListValue = { value: LocalizedText; onChange: (value: LocalizedText) => void };

/**
 * A bilingual list typed as one item per line in each language. Lines don't
 * wrap and both columns are sized to fit every line, so each item is exactly
 * one row and line N of the Indonesian column sits next to line N of the
 * English one. A live count shows the limit and flags differing line counts.
 */
export function ListField({
  name,
  label,
  list,
  maxLines,
  minRows,
  error,
  hint,
}: {
  name: string;
  label: string;
  list: ListValue;
  /** Same limit as the list in tourFormSchema. */
  maxLines: number;
  minRows: number;
  error?: string;
  hint?: string;
}) {
  const t = useTranslations("admin.form.listLines");
  const counts = lineCounts(list.value);
  const mismatch = counts.id !== counts.en;
  const tooMany = Math.max(counts.id, counts.en) > maxLines;

  return (
    <BilingualField
      name={name}
      label={label}
      value={list.value}
      onChange={list.onChange}
      error={error}
      hint={hint}
      multiline
      rows={listRows(list.value, minRows)}
      wrap="off"
      status={
        <>
          {t("count", { id: counts.id, en: counts.en, max: maxLines })}
          {mismatch && <span className="text-danger font-medium"> {t("mismatch")}</span>}
          {tooMany && (
            <span className="text-danger font-medium"> {t("tooMany", { max: maxLines })}</span>
          )}
        </>
      }
    />
  );
}
