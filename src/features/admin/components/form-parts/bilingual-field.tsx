import type { ReactNode } from "react";
import { Input, joinIds, Textarea } from "@/components/ui/form-controls";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/i18n-text";

const LOCALES: Locale[] = ["id", "en"];

function LangTag({ locale }: { locale: Locale }) {
  return (
    <span className="bg-sand-100 text-ink-soft rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider">
      {locale.toUpperCase()}
    </span>
  );
}

/**
 * Two side-by-side controls (ID, EN) for one localized value. Ids are
 * `${name}-${locale}`; the hint, status and error are `${name}-hint`,
 * `${name}-status` and `${name}-error`, all linked with aria-describedby.
 *
 * On an error, a side left empty is the one the error is about (for example a
 * missing English text), so only that side is marked invalid. When both sides
 * are filled, both are marked.
 */
export function BilingualField({
  name,
  label,
  value,
  onChange,
  error,
  multiline = false,
  rows,
  wrap,
  hint,
  status,
}: {
  name: string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  error?: string;
  multiline?: boolean;
  rows?: number;
  /** Textarea wrapping; "off" keeps one item per visual line in list fields. */
  wrap?: "soft" | "off";
  hint?: string;
  /** Live feedback under the controls, e.g. line counts. */
  status?: ReactNode;
}) {
  const describedBy = joinIds(
    hint && `${name}-hint`,
    status != null && `${name}-status`,
    error && `${name}-error`,
  );
  const empty = LOCALES.filter((locale) => !value[locale].trim());
  const invalid = (locale: Locale) =>
    Boolean(error) && (empty.length === 0 || empty.includes(locale));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-ink-soft mb-2 text-sm font-medium">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {LOCALES.map((locale) => {
          const id = `${name}-${locale}`;
          const common = {
            id,
            value: value[locale],
            "aria-invalid": invalid(locale) || undefined,
            "aria-describedby": describedBy,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, [locale]: e.target.value }),
          };
          return (
            <div key={locale} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-muted inline-flex items-center gap-2 text-xs">
                <LangTag locale={locale} />
                <span className="sr-only">{label}</span>
              </label>
              {multiline ? <Textarea rows={rows} wrap={wrap} {...common} /> : <Input {...common} />}
            </div>
          );
        })}
      </div>
      {hint && (
        <p id={`${name}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      )}
      {status != null && (
        <div id={`${name}-status`} className="text-muted text-xs">
          {status}
        </div>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </fieldset>
  );
}
