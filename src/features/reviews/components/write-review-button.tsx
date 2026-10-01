"use client";

import { CircleCheck, PenLine, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import { REVIEW_BODY_MAX, REVIEW_BODY_MIN } from "@/server/services/review.rules";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { createReviewAction } from "../actions";

type State = ActionResult<{ tourSlug: string }> | null;

const RATINGS = [1, 2, 3, 4, 5] as const;

/** Radio-group star picker: arrow keys move, Space/Enter select (WAI-ARIA radio pattern). */
function StarRating({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const t = useTranslations("reviews.write");
  const labelId = useId();
  const [hover, setHover] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover || value;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, rating: number) => {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = Math.min(5, Math.max(1, rating + delta));
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-ink-soft text-sm font-medium">
        {t("ratingLabel")}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "rating-error" : undefined}
          className="flex gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {RATINGS.map((rating) => {
            const checked = value === rating;
            // Roving tabindex: only the selected star (or the first) is tabbable.
            const tabbable = checked || (value === 0 && rating === 1);
            return (
              <button
                key={rating}
                ref={(el) => {
                  refs.current[rating - 1] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={t("ratingOption", { count: rating })}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => onChange(rating)}
                onMouseEnter={() => setHover(rating)}
                onKeyDown={(event) => onKeyDown(event, rating)}
                className="grid size-10 place-items-center rounded-full transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    rating <= shown ? "fill-gold text-gold" : "text-sand-300",
                  )}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
        {shown > 0 && (
          <span className="text-muted text-sm" aria-hidden>
            {t(`ratingHints.${shown as 1 | 2 | 3 | 4 | 5}`)}
          </span>
        )}
      </div>
      <input type="hidden" name="rating" value={value || ""} />
      {error && (
        <p id="rating-error" role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewForm({
  bookingId,
  tourTitle,
  onClose,
  onSubmitted,
}: {
  bookingId: number;
  tourTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const t = useTranslations("reviews.write");
  const [state, action, pending] = useActionState<State, FormData>(createReviewAction, null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const error = (field: string) => fieldErrors?.[field]?.[0];

  useEffect(() => {
    if (state?.ok) onSubmitted();
  }, [state, onSubmitted]);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center px-2 py-6 text-center" role="status">
        <span className="bg-leaf-light text-leaf grid size-16 place-items-center rounded-full">
          <CircleCheck className="size-8" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-6 text-3xl">{t("thanksTitle")}</h2>
        <p className="text-ink-soft mt-3 max-w-sm">{t("thanksBody")}</p>
        <Button className="mt-8" onClick={onClose} autoFocus>
          {t("done")}
        </Button>
      </div>
    );
  }

  const length = body.trim().length;

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <h2 className="text-3xl leading-tight">{t("title")}</h2>
        <p className="text-muted mt-2 text-sm">{t("subtitle", { tour: tourTitle })}</p>
      </div>

      {state && !state.ok && <Alert>{state.error}</Alert>}

      <StarRating value={rating} onChange={setRating} error={error("rating")} />

      <Field label={t("body")} htmlFor="review-body" error={error("body")}>
        <Textarea
          id="review-body"
          name="body"
          rows={5}
          required
          minLength={REVIEW_BODY_MIN}
          maxLength={REVIEW_BODY_MAX}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("bodyPlaceholder")}
          aria-invalid={error("body") ? true : undefined}
          aria-describedby={error("body") ? "review-body-error" : "review-body-counter"}
        />
        <p
          id="review-body-counter"
          className={cn(
            "-mt-1 text-right text-xs",
            length > 0 && length < REVIEW_BODY_MIN ? "text-gold" : "text-muted",
          )}
          aria-live="polite"
        >
          {t("counter", { count: length, max: REVIEW_BODY_MAX })}
        </p>
      </Field>

      <Field label={t("country")} htmlFor="review-country" error={error("country")}>
        <Input
          id="review-country"
          name="country"
          maxLength={56}
          autoComplete="country-name"
          placeholder={t("countryPlaceholder")}
          aria-invalid={error("country") ? true : undefined}
          aria-describedby={error("country") ? "review-country-error" : undefined}
        />
      </Field>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}

/**
 * Opens a modal review form for a completed booking. Uses the native
 * `<dialog>` element for focus trapping, Esc to close and inert background.
 */
export function WriteReviewButton({
  bookingId,
  tourTitle,
  alreadyReviewed = false,
}: {
  bookingId: number;
  tourTitle: string;
  /**
   * Server-known state. Keep the component mounted after submitting so the
   * thank-you dialog survives the page revalidation that flips this to true.
   */
  alreadyReviewed?: boolean;
}) {
  const t = useTranslations("reviews.write");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Remount the form on every open so a previous error doesn't linger.
  const [formKey, setFormKey] = useState(0);

  const show = () => {
    setFormKey((key) => key + 1);
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  if ((submitted || alreadyReviewed) && !open) {
    return (
      <span className="text-leaf inline-flex items-center gap-2 text-sm">
        <CircleCheck className="size-4" aria-hidden />
        {t("reviewed")}
      </span>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={show}>
        <PenLine aria-hidden />
        {t("trigger")}
      </Button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === event.currentTarget) close();
        }}
        aria-label={t("title")}
        className="bg-sand-50 text-ink backdrop:bg-ink/50 m-auto w-[calc(100%-2rem)] max-w-lg rounded-(--radius-card) p-0 shadow-2xl backdrop:backdrop-blur-sm"
      >
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="text-muted hover:bg-ink/5 hover:text-ink absolute top-4 right-4 grid size-10 place-items-center rounded-full"
          >
            <X className="size-5" aria-hidden />
          </button>
          {open && (
            <ReviewForm
              key={formKey}
              bookingId={bookingId}
              tourTitle={tourTitle}
              onClose={close}
              onSubmitted={() => setSubmitted(true)}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
