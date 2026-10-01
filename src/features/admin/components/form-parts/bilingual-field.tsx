import { Input, Textarea } from "@/components/ui/form-controls";
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

/** Two side-by-side controls (ID, EN) for one localized value. Ids are `${name}-${locale}`. */
export function BilingualField({
  name,
  label,
  value,
  onChange,
  error,
  multiline = false,
  rows,
  hint,
}: {
  name: string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  error?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-ink-soft mb-2 text-sm font-medium">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {LOCALES.map((locale) => {
          const id = `${name}-${locale}`;
          const common = {
            id,
            value: value[locale],
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? `${name}-error` : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, [locale]: e.target.value }),
          };
          return (
            <div key={locale} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-muted inline-flex items-center gap-2 text-xs">
                <LangTag locale={locale} />
                <span className="sr-only">{label}</span>
              </label>
              {multiline ? <Textarea rows={rows} {...common} /> : <Input {...common} />}
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </fieldset>
  );
}
