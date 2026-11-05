import type { BookingStatus } from "@/server/db/schema";
import { DomainError } from "./errors";

/** Bookings must be made at least this many days ahead. */
export const MIN_LEAD_DAYS = 3;

/** Statuses that hold seats on a departure date. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

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
