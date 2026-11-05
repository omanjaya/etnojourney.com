"use client";

import { TriangleAlert, UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-controls";
import { assignGuideAction } from "../actions";

type GuideOption = {
  id: number;
  name: string;
  organization: string | null;
  isActive: boolean;
  /** Other departures this guide already works on overlapping days (a label), or null. */
  busy: string | null;
};

/**
 * Picks the departure's guide; suggested guides (covering the destination)
 * come first, guides already working on overlapping days last and marked.
 * A clash is a hint, not a block: two short tours can share a day.
 */
export function GuideAssignmentForm({
  tourId,
  date,
  currentGuideId,
  suggested,
  others,
}: {
  tourId: number;
  date: string;
  currentGuideId: number | null;
  suggested: GuideOption[];
  others: GuideOption[];
}) {
  const t = useTranslations("adminDepartures.guide");
  const [value, setValue] = useState(currentGuideId ? String(currentGuideId) : "");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (guideId: number | null) => {
    setMessage(null);
    startTransition(async () => {
      const result = await assignGuideAction({ tourId, date, guideId });
      if (result.ok) {
        setMessage({ tone: "success", text: guideId === null ? t("unassigned") : t("assigned") });
        if (guideId === null) setValue("");
      } else {
        setMessage({ tone: "danger", text: result.fieldErrors?.guideId?.[0] ?? result.error });
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value) run(Number(value));
  };

  const label = (guide: GuideOption) => {
    const name = guide.organization ? `${guide.name} (${guide.organization})` : guide.name;
    if (!guide.isActive) return t("inactiveOption", { name });
    return guide.busy ? t("busyOption", { name, tours: guide.busy }) : name;
  };
  const noGuides = suggested.length === 0 && others.length === 0;
  const selected = [...suggested, ...others].find((guide) => String(guide.id) === value);

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field
        label={t("select")}
        htmlFor="departure-guide"
        hint={noGuides ? t("noGuides") : suggested.length ? t("suggestedHint") : undefined}
      >
        <Select
          id="departure-guide"
          name="guideId"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={noGuides}
          className="short:h-10 h-11"
        >
          <option value="">{t("placeholder")}</option>
          {suggested.length > 0 && (
            <optgroup label={t("suggested")}>
              {suggested.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {label(guide)}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={suggested.length ? t("others") : t("all")}>
              {others.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {label(guide)}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>
      {selected?.busy && (
        <p className="flex items-start gap-2 text-xs text-[#8a6420]" aria-live="polite">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("busyHint", { name: selected.name, tours: selected.busy })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="dark"
          loading={pending}
          disabled={!value || value === String(currentGuideId ?? "")}
        >
          <UserCheck aria-hidden />
          {t("save")}
        </Button>
        {currentGuideId !== null && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(null)}
          >
            <UserMinus aria-hidden />
            {t("unassign")}
          </Button>
        )}
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </form>
  );
}
