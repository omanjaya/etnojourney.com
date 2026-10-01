import { useTranslations } from "next-intl";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { tourCategories } from "@/components/shared/category-icon";
import type { TourCategory } from "@/server/db/schema";
import { Section } from "../form-parts/section";
import type { TourSectionProps } from "./defaults";

const numberValue = (raw: string) => (raw === "" ? "" : Number(raw));

/** Destination, category, duration, price, capacity and meeting point. */
export function DetailsSection({
  values,
  set,
  err,
  destinations,
}: TourSectionProps & { destinations: { id: number; name: string; province: string }[] }) {
  const t = useTranslations("admin.form");
  const tc = useTranslations("common.categories");

  return (
    <Section title={t("sections.details")} hint={t("sections.detailsHint")}>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label={t("fields.destination")} htmlFor="destinationId" error={err("destinationId")}>
          <Select
            id="destinationId"
            value={values.destinationId}
            onChange={(e) => set("destinationId", numberValue(e.target.value))}
            aria-invalid={err("destinationId") ? true : undefined}
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
            aria-invalid={err("category") ? true : undefined}
          >
            <option value="">-</option>
            {tourCategories.map((c) => (
              <option key={c} value={c}>
                {tc(c)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Field label={t("fields.durationDays")} htmlFor="durationDays" error={err("durationDays")}>
          <Input
            id="durationDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={values.durationDays}
            onChange={(e) => set("durationDays", numberValue(e.target.value))}
            aria-invalid={err("durationDays") ? true : undefined}
          />
        </Field>
        <Field
          label={t("fields.pricePerPerson")}
          htmlFor="pricePerPerson"
          error={err("pricePerPerson")}
        >
          <Input
            id="pricePerPerson"
            type="number"
            inputMode="numeric"
            min={1}
            step={1000}
            value={values.pricePerPerson}
            onChange={(e) => set("pricePerPerson", numberValue(e.target.value))}
            aria-invalid={err("pricePerPerson") ? true : undefined}
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
            aria-invalid={err("maxParticipants") ? true : undefined}
          />
        </Field>
      </div>
      <Field label={t("fields.meetingPoint")} htmlFor="meetingPoint" error={err("meetingPoint")}>
        <Input
          id="meetingPoint"
          value={values.meetingPoint}
          onChange={(e) => set("meetingPoint", e.target.value)}
          aria-invalid={err("meetingPoint") ? true : undefined}
        />
      </Field>
    </Section>
  );
}
