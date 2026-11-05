import type { BookingStatus } from "@/server/db/schema";
import { isoDateFromToday } from "@/lib/format";
import { DomainError } from "./errors";

/** Bookings must be made at least this many days ahead. */
export const MIN_LEAD_DAYS = 3;

/** Statuses that hold seats on a departure date. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

/** An unpaid pending booking gives its seats back after this many hours. */
export const UNPAID_HOLD_HOURS = 48;

/**
 * A payment still pending at the gateway (e.g. a bank transfer the traveller
 * has not finished) counts as in progress for this long; Midtrans transfers
 * expire after 24 hours.
 */
export const PAYMENT_IN_PROGRESS_HOURS = 24;

/** How to refund a paid booking that is cancelled. */
export const REFUND_MODES = ["policy", "full"] as const;
export type RefundMode = (typeof REFUND_MODES)[number];

const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new DomainError("invalidTransition");
}

/**
 * A booking can be marked completed once its trip has started (travel date
 * today or earlier, Asia/Jakarta). Completing releases the seats; the lead
 * time already keeps new bookings off dates that close, so this can never
 * overbook a departure.
 */
export function canComplete(travelDate: string, today: string): boolean {
  return travelDate <= today;
}

export function assertCanComplete(travelDate: string, today: string): void {
  if (!canComplete(travelDate, today)) throw new DomainError("tripNotStarted");
}

/** The statuses an admin can move a booking to today ("completed" only once the trip started). */
export function adminStatusOptions(
  booking: { status: BookingStatus; travelDate: string },
  today: string,
): readonly BookingStatus[] {
  return nextStatuses(booking.status).filter(
    (status) => status !== "completed" || canComplete(booking.travelDate, today),
  );
}

export type BookingHold = {
  status: BookingStatus;
  travelDate: string;
  createdAt: Date;
  /** Whether any payment for the booking is paid. */
  hasPaid: boolean;
  /** When the newest payment still pending at the gateway was started, or null. */
  pendingPaymentAt: Date | null;
};

/**
 * Whether an unpaid pending booking should give its seats back: it can no
 * longer be paid (the travel date has passed), or it is older than
 * `UNPAID_HOLD_HOURS` and no payment is in progress at the gateway.
 */
export function isStaleHold(hold: BookingHold, now: Date): boolean {
  if (hold.status !== "pending" || hold.hasPaid) return false;
  if (hold.travelDate < isoDateFromToday(0, now)) return true;
  const hoursSince = (instant: Date) => (now.getTime() - instant.getTime()) / 3_600_000;
  if (hold.pendingPaymentAt && hoursSince(hold.pendingPaymentAt) < PAYMENT_IN_PROGRESS_HOURS) {
    return false;
  }
  return hoursSince(hold.createdAt) >= UNPAID_HOLD_HOURS;
}

/**
 * Digits to look for in contact phone numbers when an admin searches the
 * bookings list, or null when the search isn't a phone number (letters, or
 * fewer than 6 digits). The leading "0" or "62" is dropped, so 0812...,
 * 62812... and +62 812... all find the same number.
 */
export function phoneSearchDigits(query: string): string | null {
  if (!/^[\d\s()+.-]+$/.test(query.trim())) return null;
  const digits = query.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.replace(/^(?:62|0)/, "");
}

/** Whole days between two YYYY-MM-DD dates, ignoring time zones. */
function daysBetween(fromIso: string, toIso: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}

export function assertTravelDate(travelDate: string, todayIso: string): void {
  if (daysBetween(todayIso, travelDate) < MIN_LEAD_DAYS) throw new DomainError("dateTooSoon");
}

export function assertCapacity(params: {
  requested: number;
  alreadyBooked: number;
  maxParticipants: number;
}): void {
  const { requested, alreadyBooked, maxParticipants } = params;
  if (!Number.isInteger(requested) || requested < 1 || requested > maxParticipants) {
    throw new DomainError("invalidParticipants");
  }
  if (alreadyBooked + requested > maxParticipants) throw new DomainError("capacityExceeded");
}

export function calculateTotal(unitPrice: number, participants: number): number {
  return unitPrice * participants;
}

/** 32 unambiguous characters (no 0/O, 1/I). Must stay a power of two, see below. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/**
 * Human-friendly booking reference, e.g. `EJ-7K2Q9A`, from the platform CSPRNG.
 * Each random byte is masked with `& 31`: because the alphabet has exactly 32
 * characters this is uniform (no modulo or float-rounding bias).
 */
export function generateBookingCode(
  randomBytes: (length: number) => Uint8Array = (length) =>
    crypto.getRandomValues(new Uint8Array(length)),
): string {
  let code = "";
  for (const byte of randomBytes(CODE_LENGTH)) code += CODE_ALPHABET[byte & 31];
  return `EJ-${code}`;
}
