import { useLocale, useTranslations } from "next-intl";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { tourCategories } from "@/components/shared/category-icon";
import { formatCurrency } from "@/lib/format";
import type { TourCategory } from "@/server/db/schema";
import { Section } from "../form-parts/section";
import type { TourSectionProps } from "./defaults";
import { caretAfterDigits, countDigits, formatPriceInput, parsePrice, stripCents } from "./price";

const numberValue = (raw: string) => (raw === "" ? "" : Number(raw));

/** Scrolling the page over a focused number input would silently change its value. */
const blurOnWheel = (event: React.WheelEvent<HTMLInputElement>) => event.currentTarget.blur();

/**
 * Destination, category, duration, price, capacity and meeting point.
 * Field wires each control's hint and error for screen readers.
 */
export function DetailsSection({
  values,
  set,
  err,
  destinations,
}: TourSectionProps & { destinations: { id: number; name: string; province: string }[] }) {
  const t = useTranslations("admin.form");
  const tc = useTranslations("common.categories");
  const locale = useLocale();
  const price = values.pricePerPerson;

  // The price is a text field so "450.000" (the Indonesian way) means 450000,
  // and it is shown grouped while typing. Regrouping would move the caret to
  // the end, so it is put back after the same digit.
  const onPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const digitsBeforeCaret = countDigits(
      input.value.slice(0, input.selectionStart ?? input.value.length),
    );
    set("pricePerPerson", parsePrice(input.value));
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      const caret = caretAfterDigits(input.value, digitsBeforeCaret);
      input.setSelectionRange(caret, caret);
    });
  };

  // A pasted "Rp 350.000,00" must not turn its cents into extra digits.
  const onPricePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    const cleaned = stripCents(pasted);
    if (cleaned === pasted) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    set(
      "pricePerPerson",
      parsePrice(input.value.slice(0, start) + cleaned + input.value.slice(end)),
    );
  };

  return (
    <Section title={t("sections.details")} hint={t("sections.detailsHint")}>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label={t("fields.destination")} htmlFor="destinationId" error={err("destinationId")}>
          <Select
            id="destinationId"
            value={values.destinationId}
            onChange={(e) => set("destinationId", numberValue(e.target.value))}
          >
            <option value="">{t("fields.selectDestination")}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}, {d.province}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("fields.category")} htmlFor="category" error={err("category")}>
          <Select
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value as TourCategory | "")}
          >
            <option value="">{t("fields.selectCategory")}</option>
            {tourCategories.map((c) => (
              <option key={c} value={c}>
                {tc(c)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("fields.durationDays")} htmlFor="durationDays" error={err("durationDays")}>
          <Input
            id="durationDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={values.durationDays}
            onChange={(e) => set("durationDays", numberValue(e.target.value))}
            onWheel={blurOnWheel}
          />
        </Field>
        <Field
          label={t("fields.durationHours")}
          htmlFor="durationHours"
          error={err("durationHours")}
          hint={t("fields.durationHoursHint")}
        >
          <Input
            id="durationHours"
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={values.durationHours}
            onChange={(e) => set("durationHours", numberValue(e.target.value))}
            onWheel={blurOnWheel}
          />
        </Field>
        <Field
          label={t("fields.pricePerPerson")}
          htmlFor="pricePerPerson"
          error={err("pricePerPerson")}
          hint={
            price === ""
              ? undefined
              : t("fields.pricePreview", { price: formatCurrency(price, locale) })
          }
        >
          <Input
            id="pricePerPerson"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatPriceInput(price, locale)}
            onChange={onPriceChange}
            onPaste={onPricePaste}
          />
        </Field>
        <Field
          label={t("fields.maxParticipants")}
          htmlFor="maxParticipants"
          error={err("maxParticipants")}
        >
          <Input
            id="maxParticipants"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={values.maxParticipants}
            onChange={(e) => set("maxParticipants", numberValue(e.target.value))}
            onWheel={blurOnWheel}
          />
        </Field>
      </div>
      <Field label={t("fields.meetingPoint")} htmlFor="meetingPoint" error={err("meetingPoint")}>
        <Input
          id="meetingPoint"
          value={values.meetingPoint}
          onChange={(e) => set("meetingPoint", e.target.value)}
        />
      </Field>
    </Section>
  );
}
