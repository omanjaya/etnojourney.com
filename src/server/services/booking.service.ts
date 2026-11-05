import "server-only";
import { db, type DbExecutor } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import type { Booking, BookingStatus, bookings, Payment } from "@/server/db/schema";
import {
  bookingRepository,
  type AdminBookingFilters,
  type ExportCursor,
} from "@/server/repositories/booking.repository";
import { bookingNoteRepository } from "@/server/repositories/booking-note.repository";
import { closureRepository } from "@/server/repositories/closure.repository";
import { departureRepository } from "@/server/repositories/departure.repository";
import { paymentRepository } from "@/server/repositories/payment.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { isoDateFromToday } from "@/lib/format";
import { paginate } from "@/lib/pagination";
import {
  assertCanComplete,
  assertCapacity,
  assertTransition,
  assertTravelDate,
  calculateTotal,
  generateBookingCode,
  isStaleHold,
  UNPAID_HOLD_HOURS,
  type RefundMode,
} from "./booking.rules";
import { manifestChangedBy } from "./departure.rules";
import { DomainError, type DomainErrorCode } from "./errors";
import { paymentService } from "./payment.service";
import { auditService } from "./audit.service";
import { buildBookingTimeline } from "./booking-timeline.rules";
import {
  businessToday,
  cancelOption,
  newDateIssue,
  refundQuote,
  rescheduleBlocker,
  type NewDateIssue,
  type RescheduleBlocker,
} from "./self-service.rules";

export type {
  AdminBookingFilters,
  AdminBookingSort,
} from "@/server/repositories/booking.repository";

export type CreateBookingInput = {
  tourId: number;
  travelDate: string;
  participants: number;
  contactName: string;
  contactPhone: string;
  notes?: string;
};

const CODE_ATTEMPTS = 3;

/** Outcome of a traveller cancellation, for the confirmation emails. */
export type TravellerCancellation = {
  booking: Booking;
  /** Whether money had been taken for the booking. */
  paid: boolean;
  daysBefore: number;
  /** Refund share under the policy (0 for unpaid bookings). */
  percent: number;
  /** Rupiah owed back in total (0 when nothing is refunded). */
  refundAmount: number;
};

const rescheduleErrors: Record<RescheduleBlocker, DomainErrorCode> = {
  status: "notReschedulable",
  limit: "rescheduleLimit",
  tooLate: "rescheduleTooLate",
};

const newDateErrors: Record<NewDateIssue, DomainErrorCode> = {
  sameDate: "sameDate",
  tooSoon: "dateTooSoon",
  tooFar: "notReschedulable",
};

/** Most pending bookings released per run of the daily job. */
const HOLD_RELEASE_BATCH = 200;

/**
 * Flags the paid payments of a booking being cancelled for a refund, inside
 * the cancelling transaction (payments locked by the caller). "policy" owes
 * back the cancellation-policy share for `today` and skips payments it gives
 * 0% for; "full" owes back everything. Returns the rupiah owed in total.
 */
async function flagCancelledPayments(
  tx: DbExecutor,
  payments: Payment[],
  travelDate: string,
  today: string,
  mode: RefundMode,
  actorId: string | null,
): Promise<number> {
  let owed = 0;
  for (const payment of payments) {
    const quote = refundQuote(payment.amount, travelDate, today);
    if (mode === "policy" && !quote.refundable) continue;
    owed += mode === "policy" ? quote.amount : payment.amount;
    await paymentService.flagForRefund(
      tx,
      payment,
      "cancelledAfterPayment",
      actorId,
      mode === "policy" ? quote.storedAmount : null,
    );
  }
  return owed;
}

/**
 * Inserts with a fresh booking code, retrying on the (rare) code collision.
 * Each attempt runs in a savepoint so a failed insert doesn't abort the transaction.
 */
async function insertWithUniqueCode(
  tx: DbExecutor,
  values: Omit<typeof bookings.$inferInsert, "code">,
): Promise<Booking> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await tx.transaction((sp) =>
        bookingRepository.insert(sp, { ...values, code: generateBookingCode() }),
      );
    } catch (error) {
      if (attempt >= CODE_ATTEMPTS || !isUniqueViolation(error, "bookings_code_unique"))
        throw error;
    }
  }
}

export const bookingService = {
  /**
   * Creates a pending booking. Price is always taken from the database. The tour
   * row is locked for the duration of the transaction so two concurrent bookings
   * for the same tour are serialised and cannot both pass the capacity check.
   */
  async create(userId: string, input: CreateBookingInput) {
    const tour = await tourRepository.findById(input.tourId);
    if (!tour || !tour.isPublished) throw new DomainError("notFound");

    assertTravelDate(input.travelDate, isoDateFromToday(0));

    return db.transaction(async (tx) => {
      await tourRepository.lockById(tx, tour.id);
      // A date an admin closed (for this tour or for all tours) takes no bookings.
      if (await closureRepository.isClosed(tour.id, input.travelDate, tx)) {
        throw new DomainError("dateClosed");
      }
      const alreadyBooked = await bookingRepository.countActiveSeats(tx, tour.id, input.travelDate);
      assertCapacity({
        requested: input.participants,
        alreadyBooked,
        maxParticipants: tour.maxParticipants,
      });

      const booking = await insertWithUniqueCode(tx, {
        userId,
        tourId: tour.id,
        travelDate: input.travelDate,
        participants: input.participants,
        unitPrice: tour.pricePerPerson,
        totalPrice: calculateTotal(tour.pricePerPerson, input.participants),
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        notes: input.notes || null,
      });
      // A new guest on the departure: the guide's copy of the manifest is out of date.
      await departureRepository.markManifestStale(tx, tour.id, [input.travelDate]);
      return booking;
    });
  },

  listForUser: (userId: string) => bookingRepository.listForUser(userId),

  /**
   * Traveller cancels their own booking. Unpaid pending bookings go for free;
   * paid ones (pending or confirmed, travel date not passed) are refunded
   * under the policy tiers: each paid payment is flagged with its refund
   * amount (null = full), or not flagged at all when the tier gives 0%.
   *
   * `expectedPercent` is the share the traveller saw in the dialog; if the
   * tier changed since (e.g. Jakarta midnight passed) nothing is cancelled.
   * Seats free up because capacity only counts pending and confirmed bookings.
   */
  /**
   * `expected` is what the traveller was shown: a free cancellation, or a paid
   * one at a given refund percent. If the booking changed since (paid in
   * another tab, tier rolled over at midnight) the request is refused with
   * `refundChanged` instead of applying terms they never saw.
   */
  cancelByTraveller(
    userId: string,
    bookingId: number,
    expected: { kind: "free" } | { kind: "paid"; percent: number },
    now: Date = new Date(),
  ): Promise<TravellerCancellation> {
    const today = businessToday(now);
    return db.transaction(async (tx) => {
      const booking = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!booking) throw new DomainError("notFound");
      if (booking.userId !== userId) throw new DomainError("forbidden");

      const paid = await paymentRepository.findPaidForBookingForUpdate(tx, booking.id);
      // Attempts already flagged (duplicate charges) are owed back in full anyway.
      const live = paid.filter((payment) => !payment.refundRequired);
      const paidAmount =
        paid.length > 0 ? live.reduce((total, payment) => total + payment.amount, 0) : null;

      const option = cancelOption(booking, paidAmount, today);
      if (!option) throw new DomainError("notCancellable");
      if (
        option.kind !== expected.kind ||
        (option.kind === "paid" &&
          expected.kind === "paid" &&
          option.quote.percent !== expected.percent)
      ) {
        throw new DomainError("refundChanged");
      }

      const updated = await bookingRepository.updateStatusWith(tx, booking.id, "cancelled");
      await departureRepository.markManifestStale(tx, booking.tourId, [booking.travelDate]);

      const refundAmount = await flagCancelledPayments(
        tx,
        live,
        booking.travelDate,
        today,
        "policy",
        userId,
      );

      const daysBefore = option.kind === "paid" ? option.quote.daysBefore : null;
      const percent = option.kind === "paid" ? option.quote.percent : 0;
      await auditService.record(
        {
          actorId: userId,
          action: "booking.cancelled_by_traveller",
          entityType: "booking",
          entityId: booking.id,
          details: {
            code: booking.code,
            from: booking.status,
            paid: option.kind === "paid",
            daysBefore,
            percent,
            refundAmount,
          },
        },
        tx,
      );

      return {
        booking: updated,
        paid: option.kind === "paid",
        daysBefore: daysBefore ?? 0,
        percent,
        refundAmount,
      };
    });
  },

  /**
   * Traveller moves their own booking to another date. The booking and then
   * the tour row are locked (the tour lock serialises with `create`, so two
   * travellers can't both take the last seats), availability is re-checked
   * (lead time, closures, seats excluding this booking), the reschedule count
   * goes up and the pre-trip reminder is re-armed. The price stays as booked.
   */
  reschedule(userId: string, bookingId: number, newDate: string, now: Date = new Date()) {
    const today = businessToday(now);
    return db.transaction(async (tx) => {
      const booking = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!booking) throw new DomainError("notFound");
      if (booking.userId !== userId) throw new DomainError("forbidden");

      const blocker = rescheduleBlocker(booking, today);
      if (blocker) throw new DomainError(rescheduleErrors[blocker]);
      const issue = newDateIssue(booking.travelDate, newDate, today);
      if (issue) throw new DomainError(newDateErrors[issue]);

      const tour = await tourRepository.findById(booking.tourId);
      if (!tour || !tour.isPublished) throw new DomainError("notReschedulable");
      await tourRepository.lockById(tx, tour.id);
      if (await closureRepository.isClosed(tour.id, newDate, tx)) {
        throw new DomainError("dateClosed");
      }
      const alreadyBooked = await bookingRepository.countActiveSeatsExcluding(
        tx,
        tour.id,
        newDate,
        booking.id,
      );
      assertCapacity({
        requested: booking.participants,
        alreadyBooked,
        maxParticipants: tour.maxParticipants,
      });

      const updated = await bookingRepository.reschedule(tx, booking.id, newDate);
      // Both departures' manifests changed: show them as "not sent" so staff resend.
      await departureRepository.markManifestStale(tx, booking.tourId, [booking.travelDate, newDate]);
      await auditService.record(
        {
          actorId: userId,
          action: "booking.rescheduled",
          entityType: "booking",
          entityId: booking.id,
          details: {
            code: booking.code,
            from: booking.travelDate,
            to: newDate,
            rescheduleCount: updated.rescheduleCount,
          },
        },
        tx,
      );
      return { booking: updated, from: booking.travelDate };
    });
  },

  /* -------------------------- admin -------------------------- */

  listAll: (status?: BookingStatus) => bookingRepository.listAll(status),

  /** Admin bookings page: filtered, sorted and paginated. */
  listForAdmin(filters: AdminBookingFilters, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => bookingRepository.countAdmin(filters),
      load: (limit, offset) => bookingRepository.listAdmin(filters, limit, offset),
    });
  },

  /**
   * Every booking matching the filters, yielded in batches so an export
   * never holds the whole table in memory.
   */
  async *exportRows(filters: AdminBookingFilters, batchSize = 500) {
    let after: ExportCursor | undefined;
    for (;;) {
      const batch = await bookingRepository.exportBatch(filters, batchSize, after);
      if (batch.length === 0) return;
      yield batch;
      if (batch.length < batchSize) return;
      const last = batch[batch.length - 1];
      after = { id: last.id, travelDate: last.travelDate };
    }
  },

  /**
   * Admin status change, validated against the current status under a row lock.
   * "completed" is only accepted from the travel date on (Asia/Jakarta).
   * Cancelling a paid booking flags its paid payment(s) for a refund in the
   * same transaction: the cancellation-policy share (`refund: "policy"`, when
   * the traveller asked to cancel) or everything (`"full"`, the default, when
   * the cancellation is ours). `actorId` is recorded on the audit entries.
   */
  changeStatus(
    bookingId: number,
    status: BookingStatus,
    actorId: string | null = null,
    options: { refund?: RefundMode; now?: Date } = {},
  ) {
    const today = businessToday(options.now);
    return db.transaction(async (tx) => {
      const booking = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!booking) throw new DomainError("notFound");
      assertTransition(booking.status, status);
      if (status === "completed") assertCanComplete(booking.travelDate, today);
      const updated = await bookingRepository.updateStatusWith(tx, booking.id, status);

      let refund: { mode: RefundMode; refundAmount: number } | null = null;
      if (status === "cancelled") {
        const paid = await paymentRepository.findPaidForBookingForUpdate(tx, booking.id);
        // Attempts already flagged (duplicate charges) are owed back in full anyway.
        const live = paid.filter((payment) => !payment.refundRequired);
        if (live.length > 0) {
          const mode = options.refund ?? "full";
          const refundAmount = await flagCancelledPayments(
            tx,
            live,
            booking.travelDate,
            today,
            mode,
            actorId,
          );
          refund = { mode, refundAmount };
        }
      }
      if (manifestChangedBy(booking.status, status)) {
        await departureRepository.markManifestStale(tx, booking.tourId, [booking.travelDate]);
      }
      // Same transaction: the change and its audit entry land together or not at all.
      await auditService.record(
        {
          actorId,
          action: "booking.status_changed",
          entityType: "booking",
          entityId: booking.id,
          details: {
            from: booking.status,
            status,
            code: booking.code,
            ...(refund ? { refund: refund.mode, refundAmount: refund.refundAmount } : {}),
          },
        },
        tx,
      );
      return updated;
    });
  },

  /**
   * Gives the seats of abandoned unpaid bookings back: every pending booking
   * that `isStaleHold` says can go (unpaid for `UNPAID_HOLD_HOURS`, or past
   * its travel date) is cancelled by the system. Each one is re-checked under
   * its row lock, so a payment that lands meanwhile keeps the booking. Run
   * daily from the cron job; returns the released booking ids for emails.
   */
  async releaseStaleHolds(now: Date = new Date()): Promise<{ checked: number; released: number[] }> {
    const createdBefore = new Date(now.getTime() - UNPAID_HOLD_HOURS * 3_600_000);
    const candidates = await bookingRepository.listHoldCandidates(
      createdBefore,
      businessToday(now),
      HOLD_RELEASE_BATCH,
    );
    const released: number[] = [];
    for (const candidate of candidates.filter((hold) => isStaleHold(hold, now))) {
      const done = await db.transaction(async (tx) => {
        const booking = await bookingRepository.findByIdForUpdate(tx, candidate.id);
        const hold = booking && (await bookingRepository.holdState(tx, booking.id));
        if (!booking || !hold || !isStaleHold(hold, now)) return false;
        await bookingRepository.updateStatusWith(tx, booking.id, "cancelled");
        // The emailed manifest lists pending guests too, so it is now out of date.
        await departureRepository.markManifestStale(tx, booking.tourId, [booking.travelDate]);
        await auditService.record(
          {
            actorId: null,
            action: "booking.expired",
            entityType: "booking",
            entityId: booking.id,
            details: { code: booking.code, from: booking.status, travelDate: booking.travelDate },
          },
          tx,
        );
        return true;
      });
      if (done) released.push(candidate.id);
    }
    return { checked: candidates.length, released };
  },

  /**
   * Everything the admin booking detail page shows: booking, tour, account,
   * every payment attempt, internal notes and a merged timeline.
   */
  async adminDetail(code: string) {
    const row = await bookingRepository.findAdminDetailByCode(code);
    if (!row) throw new DomainError("notFound");
    const { booking } = row;

    const [payments, notes, bookingHistory] = await Promise.all([
      bookingRepository.listPayments(booking.id),
      bookingNoteRepository.listForBooking(booking.id),
      auditService.historyOf("booking", booking.id),
    ]);
    const paymentHistory = (
      await Promise.all(payments.map((payment) => auditService.historyOf("payment", payment.id)))
    ).flat();

    const timeline = buildBookingTimeline({
      createdAt: booking.createdAt,
      createdBy: row.customer.name,
      payments,
      audit: [...bookingHistory, ...paymentHistory].map(({ log, actorName }) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        actorName,
      })),
    });

    return { ...row, payments, notes, timeline };
  },

  /** Adds an internal note and records it in the audit log, atomically. */
  async addNote(actorId: string, bookingId: number, body: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new DomainError("notFound");
    return db.transaction(async (tx) => {
      const note = await bookingNoteRepository.insert(
        { bookingId: booking.id, authorId: actorId, body },
        tx,
      );
      await auditService.record(
        {
          actorId,
          action: "booking.note_added",
          entityType: "booking",
          entityId: booking.id,
          details: { code: booking.code, noteId: note.id },
        },
        tx,
      );
      return { note, booking };
    });
  },

  stats: () => bookingRepository.stats(),
};
