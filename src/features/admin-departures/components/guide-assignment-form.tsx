"use client";

import { UserCheck, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-controls";
import { assignGuideAction } from "../actions";

type GuideOption = { id: number; name: string; organization: string | null; isActive: boolean };

/** Picks the departure's guide; suggested guides (covering the destination) come first. */
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
    return guide.isActive ? name : t("inactiveOption", { name });
  };
  const noGuides = suggested.length === 0 && others.length === 0;

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
