import "server-only";
import { db, type DbExecutor } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import type { Booking, BookingStatus, bookings } from "@/server/db/schema";
import {
  bookingRepository,
  type AdminBookingFilters,
} from "@/server/repositories/booking.repository";
import { bookingNoteRepository } from "@/server/repositories/booking-note.repository";
import { closureRepository } from "@/server/repositories/closure.repository";
import { paymentRepository } from "@/server/repositories/payment.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { isoDateFromToday } from "@/lib/format";
import { paginate } from "@/lib/pagination";
import {
  assertCapacity,
  assertTransition,
  assertTravelDate,
  calculateTotal,
  generateBookingCode,
} from "./booking.rules";
import { DomainError } from "./errors";
import { paymentService } from "./payment.service";
import { auditService } from "./audit.service";
import { buildBookingTimeline } from "./booking-timeline.rules";

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

      return insertWithUniqueCode(tx, {
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
    });
  },

  listForUser: (userId: string) => bookingRepository.listForUser(userId),

  /**
   * Travellers may only cancel their own bookings while still pending and unpaid.
   * The booking row is locked so a payment webhook can't confirm it mid-way.
   */
  cancelByUser(userId: string, bookingId: number) {
    return db.transaction(async (tx) => {
      const booking = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!booking) throw new DomainError("notFound");
      if (booking.userId !== userId) throw new DomainError("forbidden");
      if (booking.status !== "pending") throw new DomainError("notCancellable");
      if (await paymentRepository.hasPaid(booking.id, tx)) throw new DomainError("notCancellable");
      return bookingRepository.updateStatusWith(tx, booking.id, "cancelled");
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
    let beforeId: number | undefined;
    for (;;) {
      const batch = await bookingRepository.exportBatch(filters, batchSize, beforeId);
      if (batch.length === 0) return;
      yield batch;
      if (batch.length < batchSize) return;
      beforeId = batch[batch.length - 1].id;
    }
  },

  /**
   * Admin status change, validated against the current status under a row lock.
   * Cancelling a paid booking flags its paid payment(s) for a refund in the
   * same transaction (`actorId` is recorded on that audit entry).
   */
  changeStatus(bookingId: number, status: BookingStatus, actorId: string | null = null) {
    return db.transaction(async (tx) => {
      const booking = await bookingRepository.findByIdForUpdate(tx, bookingId);
      if (!booking) throw new DomainError("notFound");
      assertTransition(booking.status, status);
      const updated = await bookingRepository.updateStatusWith(tx, booking.id, status);
      if (status === "cancelled") {
        await paymentService.flagPaidForRefund(tx, booking.id, "cancelledAfterPayment", actorId);
      }
      return updated;
    });
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
