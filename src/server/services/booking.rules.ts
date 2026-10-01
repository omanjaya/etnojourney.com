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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly booking reference, e.g. `EJ-7K2Q9A`. Avoids ambiguous characters. */
/** Uniform value in [0, 1) from the platform CSPRNG (Node 24 and browsers). */
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export function generateBookingCode(random: () => number = secureRandom): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `EJ-${code}`;
}
