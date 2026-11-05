import { useEffect, type RefObject } from "react";

/**
 * After a failed save, brings the problem into view instead of jumping to the
 * top: focuses the topmost field with an error in `form`, or else the error
 * banner (the first `[role=alert]` in the form, made focusable).
 * Runs whenever `failure` changes to a new truthy value, so pass something
 * that is new for every failed attempt (e.g. a counter or the result object).
 * Scrolls without animation when the user prefers reduced motion.
 */
export function useFocusError(form: RefObject<HTMLFormElement | null>, failure: unknown) {
  useEffect(() => {
    if (!failure || !form.current) return;
    const target = firstErrorTarget(form.current);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.focus({ preventScroll: true });
    // Centre it, so neither the sticky section bar nor the save bar covers it.
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [form, failure]);
}

/** Controls a person can reach (skips hidden and programmatic-only file inputs). */
const CONTROLS = [
  'input:not([type="hidden"]):not([tabindex="-1"]):not(:disabled)',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  'button:not([tabindex="-1"]):not(:disabled)',
].join(", ");

/**
 * The topmost problem in page order: an invalid control, or a field or
 * section message (some fields show `<id>-error` without marking their
 * control; a section can say "add at least one itinerary day"), whose first
 * control then gets the focus.
 */
function firstErrorTarget(form: HTMLFormElement): HTMLElement | null {
  const first = form.querySelector<HTMLElement>(
    '[aria-invalid="true"], [id$="-error"], section [role="alert"]',
  );
  if (first?.matches('[aria-invalid="true"]')) return first;
  const control = first?.parentElement?.querySelector<HTMLElement>(CONTROLS);
  if (control) return control;

  const banner = form.querySelector<HTMLElement>('[role="alert"]');
  if (banner && !banner.hasAttribute("tabindex")) banner.tabIndex = -1;
  return banner;
}
