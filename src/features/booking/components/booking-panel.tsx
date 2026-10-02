"use client";

import {
  ArrowRight,
  CalendarPlus,
  CircleCheck,
  LockKeyhole,
  Minus,
  Plus,
  ShieldCheck,
  Undo2,
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
import { formatCurrency, formatDate, isoDateFromToday } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { AvailabilityCalendar } from "@/features/availability/components/availability-calendar";
import { PayButton } from "@/features/payment/components/pay-button";
import {
  addMonths,
  MAX_MONTHS_AHEAD,
  monthOf,
  type DayAvailability,
} from "@/server/services/availability.rules";
import { MIN_LEAD_DAYS } from "@/server/services/booking.rules";
import { createBookingAction } from "../actions";

type BookingPanelTour = {
  id: number;
  slug: string;
  pricePerPerson: number;
  maxParticipants: number;
  durationDays: number;
};

/** Window event fired after a successful booking (the mobile bar listens to it). */
export const BOOKED_EVENT = "ej:booked";

/**
 * A date carried in the URL (e.g. back from sign-in) is only a hint: it must be
 * a well-formed date in the bookable window. The calendar then checks seats.
 */
function sanitizeInitialDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const firstMonth = monthOf(isoDateFromToday(0));
  const month = monthOf(value);
  return month >= firstMonth && month <= addMonths(firstMonth, MAX_MONTHS_AHEAD) ? value : null;
}

export function BookingPanel({
  tour,
  isAuthenticated,
  defaultContactName,
  initialDate,
  initialParticipants,
  contactEmail,
}: {
  tour: BookingPanelTour;
  isAuthenticated: boolean;
  /** Prefills "Nama kontak", typically the signed-in user's name. */
  defaultContactName?: string;
  /** Date to preselect (YYYY-MM-DD), e.g. carried through sign-in. */
  initialDate?: string;
  /** Travellers to preselect; clamped to the tour and date capacity. */
  initialParticipants?: number;
  /** Shown when online payment can't start, so the guest is never stuck. */
  contactEmail?: string | null;
}) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();

  return (
    <aside
      aria-label={t("panel.submit")}
      className="border-line short:p-5 rounded-(--radius-card) border bg-white p-6 shadow-[0_30px_60px_-30px_rgb(29_26_22/0.25)] md:p-8"
    >
      <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
        {t("panel.priceLabel")}
      </p>
      <p className="short:mt-1 mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display short:text-3xl text-4xl whitespace-nowrap">
          {formatCurrency(tour.pricePerPerson, locale)}
        </span>
        <span className="text-muted text-sm whitespace-nowrap">{tc("perPerson")}</span>
      </p>
      <div className="bg-line short:my-4 my-6 h-px" />

      <BookingForm
        tour={tour}
        isAuthenticated={isAuthenticated}
        defaultContactName={defaultContactName}
        initialDate={sanitizeInitialDate(initialDate)}
        initialParticipants={initialParticipants}
        contactEmail={contactEmail}
      />
    </aside>
  );
}

function BookingForm({
  tour,
  isAuthenticated,
  defaultContactName,
  initialDate,
  initialParticipants,
  contactEmail,
}: {
  tour: BookingPanelTour;
  isAuthenticated: boolean;
  defaultContactName?: string;
  initialDate: string | null;
  initialParticipants?: number;
  contactEmail?: string | null;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [state, action, pending] = useActionState(createBookingAction, null);
  const [requested, setRequested] = useState(() =>
    Number.isInteger(initialParticipants) && initialParticipants! > 0 ? initialParticipants! : 1,
  );
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null);
  // The URL date stays "pending" until the calendar confirms it is bookable.
  const [pendingDate, setPendingDate] = useState<string | null>(initialDate);
  const [dismissed, setDismissed] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  // Never offer more seats than the chosen date still has.
  const maxForDate = Math.min(tour.maxParticipants, selectedDay?.seatsLeft ?? tour.maxParticipants);
  const participants = Math.max(1, Math.min(requested, maxForDate));
  const total = tour.pricePerPerson * participants;
  // A failed submit (e.g. the date filled up meanwhile) refreshes the calendar.
  const calendarRefreshKey = state && !state.ok ? state : null;
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const booked = Boolean(state?.ok && !dismissed);

  const chooseDay = (day: DayAvailability | null) => {
    setSelectedDay(day);
    setPendingDate(null);
  };

  // After a failed submit, move focus to the first invalid field (or the error
  // summary) so keyboard and screen-reader users land on what needs fixing.
  useEffect(() => {
    if (!state || state.ok) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? alertRef.current)?.focus();
  }, [state]);

  // The success card replaces a tall form, so on phones it can end up above the
  // viewport: bring it into view, focus its heading, and retire the mobile bar.
  useEffect(() => {
    if (!booked) return;
    const heading = successHeadingRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    heading?.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent(BOOKED_EVENT));
  }, [booked]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDismissed(false);
    startTransition(() => action(data));
  };

  if (state?.ok && !dismissed) {
    const code = state.data.code;
    return (
      <div className="text-center" role="status">
        <span className="bg-leaf-light text-leaf mx-auto grid size-14 place-items-center rounded-full">
          <CircleCheck className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
        <h3 ref={successHeadingRef} tabIndex={-1} className="mt-5 text-2xl outline-none">
          {t("success.title")}
        </h3>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">{t("success.description")}</p>
        <div className="border-sand-300 bg-sand-50 mt-6 rounded-xl border border-dashed px-4 py-4">
          <p className="text-muted text-xs tracking-[0.2em] uppercase">{t("success.codeLabel")}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-widest">{code}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <PayButton bookingId={state.data.bookingId} size="lg" block contactEmail={contactEmail} />
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/account">{t("success.viewBookings")}</Link>
          </Button>
        </div>
        <p className="text-muted mt-4 flex justify-center gap-2 text-xs leading-relaxed">
          <ShieldCheck className="text-leaf mt-0.5 size-4 shrink-0" aria-hidden />
          {t("success.payHint")}
        </p>

        <div className="border-line mt-6 border-t pt-6 text-left">
          <h4 className="font-sans text-sm font-semibold">{t("success.nextTitle")}</h4>
          <ol className="mt-3 space-y-3">
            {(["pay", "email", "host"] as const).map((step, i) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="bg-sand-100 text-terracotta grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-ink-soft">{t(`success.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
          {/* Route handler outside the locale segment (dotted paths skip the i18n proxy). */}
          <a
            href={`/account/bookings/${encodeURIComponent(code)}/calendar.ics`}
            download
            className="text-terracotta mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium hover:underline"
          >
            <CalendarPlus className="size-4" aria-hidden />
            {t("success.addToCalendar")}
          </a>
        </div>

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

  // Where to come back after signing in, with the current choices preserved.
  const resumeQuery = new URLSearchParams();
  const chosenDate = selectedDay?.date ?? pendingDate;
  if (chosenDate) resumeQuery.set("date", chosenDate);
  resumeQuery.set("people", String(participants));
  const resumePath = `/tours/${tour.slug}?${resumeQuery.toString()}#booking`;

  const cancellationNote = (
    <p className="text-muted flex gap-2 text-xs leading-relaxed">
      <Undo2 className="text-leaf mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {t("panel.cancellation")}{" "}
        <Link
          href="/cancellation-policy"
          className="text-ink-soft hover:text-terracotta font-medium underline underline-offset-2"
        >
          {t("panel.cancellationLink")}
        </Link>
      </span>
    </p>
  );

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      className="short:gap-3.5 flex flex-col gap-5"
      noValidate
    >
      {state && !state.ok && (
        <div ref={alertRef} tabIndex={-1} className="outline-none">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <input type="hidden" name="tourId" value={tour.id} />

      <fieldset className="flex flex-col gap-2">
        <legend id="travelDate-label" className="text-ink-soft short:mb-1 mb-2 text-sm font-medium">
          {t("panel.date")}
        </legend>
        <AvailabilityCalendar
          tourId={tour.id}
          value={selectedDay?.date ?? pendingDate}
          onChange={chooseDay}
          refreshKey={calendarRefreshKey}
          labelledBy="travelDate-label"
          invalid={Boolean(errors?.travelDate)}
          describedBy={errors?.travelDate ? "travelDate-error" : "travelDate-hint"}
        />
        <input type="hidden" name="travelDate" value={selectedDay?.date ?? ""} />
        {errors?.travelDate ? (
          <p id="travelDate-error" className="text-danger text-xs" role="alert">
            {errors.travelDate[0]}
          </p>
        ) : (
          <p id="travelDate-hint" className="text-muted text-xs" aria-live="polite">
            {selectedDay
              ? t("calendar.selected", {
                  date: formatDate(selectedDay.date, locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                })
              : `${t("calendar.noneSelected")} ${t("panel.dateHint", { days: MIN_LEAD_DAYS })}`}
          </p>
        )}
      </fieldset>

      <Field
        label={t("panel.participants")}
        htmlFor="participants"
        error={errors?.participants?.[0]}
        hint={
          selectedDay?.state === "limited"
            ? t("panel.seatsHint", { count: selectedDay.seatsLeft })
            : t("panel.maxHint", { count: tour.maxParticipants })
        }
      >
        <div className="border-line short:h-10 flex h-12 items-center justify-between rounded-xl border bg-white px-2">
          <button
            type="button"
            onClick={() => setRequested(Math.max(1, participants - 1))}
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
            onClick={() => setRequested(Math.min(maxForDate, participants + 1))}
            disabled={participants >= maxForDate}
            aria-label={t("panel.increase")}
            className="hover:bg-sand-100 grid size-10 place-items-center rounded-full transition-colors disabled:opacity-30"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </Field>

      {isAuthenticated && (
        <>
          <div className="short:gap-3.5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field
              label={t("panel.contactName")}
              htmlFor="contactName"
              error={errors?.contactName?.[0]}
            >
              <Input
                id="contactName"
                name="contactName"
                className="short:h-10"
                autoComplete="name"
                defaultValue={defaultContactName}
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
                className="short:h-10"
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
              className="short:min-h-14 min-h-20"
              {...describedBy("notes")}
            />
          </Field>
        </>
      )}

      <dl className="bg-sand-50 short:space-y-1 short:p-3 space-y-2 rounded-xl p-4 text-sm">
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
          <dd className="font-display short:text-xl text-2xl">{formatCurrency(total, locale)}</dd>
        </div>
      </dl>

      {isAuthenticated ? (
        <>
          <Button type="submit" size="lg" loading={pending} className="w-full">
            {t("panel.submit")}
            {!pending && <ArrowRight aria-hidden />}
          </Button>
          {cancellationNote}
          <p className="text-muted flex gap-2 text-xs leading-relaxed">
            <ShieldCheck className="text-leaf mt-0.5 size-4 shrink-0" aria-hidden />
            {t("panel.paymentNote")}
          </p>
        </>
      ) : (
        <>
          <Button asChild size="lg" className="w-full">
            <Link href={{ pathname: "/login", query: { next: resumePath } }}>
              <LockKeyhole aria-hidden />
              {t("panel.signInToContinue")}
            </Link>
          </Button>
          <p className="text-muted -mt-2 text-center text-xs leading-relaxed">
            {t("panel.signInHint")}{" "}
            <Link
              href={{ pathname: "/register", query: { next: resumePath } }}
              className="text-terracotta font-medium hover:underline"
            >
              {t("panel.registerShort")}
            </Link>
          </p>
          {cancellationNote}
        </>
      )}
    </form>
  );
}
