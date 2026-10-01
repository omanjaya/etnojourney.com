"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  LockKeyhole,
  Minus,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "@/i18n/navigation";
import { formatCurrency, isoDateFromToday } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { PayButton } from "@/features/payment/components/pay-button";
import { MIN_LEAD_DAYS } from "@/server/services/booking.rules";
import { createBookingAction } from "../actions";

type BookingPanelTour = {
  id: number;
  slug: string;
  pricePerPerson: number;
  maxParticipants: number;
  durationDays: number;
};

export function BookingPanel({
  tour,
  isAuthenticated,
}: {
  tour: BookingPanelTour;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();

  return (
    <aside
      aria-label={t("panel.submit")}
      className="border-line rounded-(--radius-card) border bg-white p-6 shadow-[0_30px_60px_-30px_rgb(29_26_22/0.25)] md:p-8 lg:sticky lg:top-28"
    >
      <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
        {t("panel.priceLabel")}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-4xl whitespace-nowrap">
          {formatCurrency(tour.pricePerPerson, locale)}
        </span>
        <span className="text-muted text-sm whitespace-nowrap">{tc("perPerson")}</span>
      </p>
      <div className="bg-line my-6 h-px" />

      {isAuthenticated ? (
        <BookingForm tour={tour} />
      ) : (
        <div className="text-center">
          <span className="bg-terracotta-light text-terracotta mx-auto grid size-12 place-items-center rounded-full">
            <LockKeyhole className="size-5" aria-hidden />
          </span>
          <h3 className="mt-4 text-2xl">{t("panel.loginTitle")}</h3>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            {t("panel.loginDescription")}
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={{ pathname: "/login", query: { next: `/tours/${tour.slug}` } }}>
              {t("panel.loginCta")}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Link
            href={{ pathname: "/register", query: { next: `/tours/${tour.slug}` } }}
            className="text-terracotta mt-2 inline-block py-2 text-sm font-medium hover:underline"
          >
            {t("panel.registerCta")}
          </Link>
        </div>
      )}
    </aside>
  );
}

function BookingForm({ tour }: { tour: BookingPanelTour }) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [state, action, pending] = useActionState(createBookingAction, null);
  const [participants, setParticipants] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const minDate = isoDateFromToday(MIN_LEAD_DAYS);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const total = tour.pricePerPerson * participants;
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // After a failed submit, move focus to the first invalid field (or the error
  // summary) so keyboard and screen-reader users land on what needs fixing.
  useEffect(() => {
    if (!state || state.ok) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? alertRef.current)?.focus();
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDismissed(false);
    startTransition(() => action(data));
  };

  if (state?.ok && !dismissed) {
    return (
      <div className="text-center" role="status">
        <span className="bg-leaf-light text-leaf mx-auto grid size-14 place-items-center rounded-full">
          <CircleCheck className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
        <h3 className="mt-5 text-2xl">{t("success.title")}</h3>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">{t("success.description")}</p>
        <div className="border-sand-300 bg-sand-50 mt-6 rounded-xl border border-dashed px-4 py-4">
          <p className="text-muted text-xs tracking-[0.2em] uppercase">{t("success.codeLabel")}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">{state.data.code}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <PayButton bookingId={state.data.bookingId} size="lg" block />
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/account">{t("success.viewBookings")}</Link>
          </Button>
        </div>
        <p className="text-muted mt-4 flex justify-center gap-2 text-xs leading-relaxed">
          <ShieldCheck className="text-leaf mt-0.5 size-4 shrink-0" aria-hidden />
          {t("success.payHint")}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-terracotta mt-2 py-2 text-sm font-medium hover:underline"
        >
          {t("success.bookAnother")}
        </button>
      </div>
    );
  }

  const describedBy = (name: string) =>
    errors?.[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && (
        <div ref={alertRef} tabIndex={-1} className="outline-none">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <input type="hidden" name="tourId" value={tour.id} />

      <Field
        label={t("panel.date")}
        htmlFor="travelDate"
        error={errors?.travelDate?.[0]}
        hint={t("panel.dateHint", { days: MIN_LEAD_DAYS })}
      >
        <div className="relative">
          <CalendarDays
            className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="travelDate"
            name="travelDate"
            type="date"
            min={minDate}
            defaultValue={minDate}
            required
            className="pl-11"
            {...describedBy("travelDate")}
          />
        </div>
      </Field>

      <Field
        label={t("panel.participants")}
        htmlFor="participants"
        error={errors?.participants?.[0]}
        hint={t("panel.maxHint", { count: tour.maxParticipants })}
      >
        <div className="border-line flex h-12 items-center justify-between rounded-xl border bg-white px-2">
          <button
            type="button"
            onClick={() => setParticipants((n) => Math.max(1, n - 1))}
            disabled={participants <= 1}
            aria-label={t("panel.decrease")}
            className="hover:bg-sand-100 grid size-10 place-items-center rounded-full transition-colors disabled:opacity-30"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <output id="participants" aria-live="polite" className="font-semibold">
            {participants}
          </output>
          <input type="hidden" name="participants" value={participants} />
          <button
            type="button"
            onClick={() => setParticipants((n) => Math.min(tour.maxParticipants, n + 1))}
            disabled={participants >= tour.maxParticipants}
            aria-label={t("panel.increase")}
            className="hover:bg-sand-100 grid size-10 place-items-center rounded-full transition-colors disabled:opacity-30"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field
          label={t("panel.contactName")}
          htmlFor="contactName"
          error={errors?.contactName?.[0]}
        >
          <Input
            id="contactName"
            name="contactName"
            autoComplete="name"
            required
            {...describedBy("contactName")}
          />
        </Field>
        <Field
          label={t("panel.contactPhone")}
          htmlFor="contactPhone"
          error={errors?.contactPhone?.[0]}
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("panel.phonePlaceholder")}
            required
            {...describedBy("contactPhone")}
          />
        </Field>
      </div>

      <Field label={t("panel.notes")} htmlFor="notes" error={errors?.notes?.[0]}>
        <Textarea
          id="notes"
          name="notes"
          maxLength={500}
          rows={3}
          placeholder={t("panel.notesPlaceholder")}
          className="min-h-20"
          {...describedBy("notes")}
        />
      </Field>

      <dl className="bg-sand-50 space-y-2 rounded-xl p-4 text-sm">
        <div className="text-ink-soft flex justify-between">
          <dt>
            {t("panel.subtotal", {
              price: formatCurrency(tour.pricePerPerson, locale),
              count: participants,
            })}
          </dt>
          <dd>{formatCurrency(total, locale)}</dd>
        </div>
        <div className="border-line flex items-baseline justify-between border-t pt-2">
          <dt className="font-semibold">{t("panel.total")}</dt>
          <dd className="font-display text-2xl">{formatCurrency(total, locale)}</dd>
        </div>
      </dl>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {t("panel.submit")}
        {!pending && <ArrowRight aria-hidden />}
      </Button>

      <p className="text-muted flex gap-2 text-xs leading-relaxed">
        <ShieldCheck className="text-leaf mt-0.5 size-4 shrink-0" aria-hidden />
        {t("panel.paymentNote")}
      </p>
    </form>
  );
}
