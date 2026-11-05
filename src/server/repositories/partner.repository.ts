import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, departureAssignments, guides, tours } from "@/server/db/schema";

/**
 * Reads for the partner portal. Every query takes the partner's own guide id
 * and filters on it in SQL, so a partner can never read another guide's
 * departures, and only columns that are safe to share are selected (no
 * prices, payments, emails or internal notes).
 */

/**
 * Bookings on the guest list: every one that is not cancelled, like the
 * emailed manifest and the WhatsApp summary. Pending ones are still unpaid
 * and are flagged (`status`), never shown with payment details.
 */
const ON_MANIFEST = ["pending", "confirmed", "completed"] as const;

// Qualified by hand: drizzle renders columns unqualified inside a correlated subquery.
const destinationNames = sql<string[]>`coalesce((
  select array_agg("destinations"."name" order by "destinations"."name")
  from "guide_destinations"
  join "destinations" on "destinations"."id" = "guide_destinations"."destination_id"
  where "guide_destinations"."guide_id" = "guides"."id"
), '{}')`;

const departureBookings = sql`
  from "bookings"
  where "bookings"."tour_id" = "departure_assignments"."tour_id"
    and "bookings"."travel_date" = "departure_assignments"."date"`;
const onManifestFilter = sql`${departureBookings}
    and "bookings"."status" in ('pending', 'confirmed', 'completed')`;
const bookingCount = sql<number>`(select count(*)::int ${onManifestFilter})`.mapWith(Number);
const participantCount = sql<number>`(
  select coalesce(sum("bookings"."participants"), 0)::int ${onManifestFilter}
)`.mapWith(Number);
const pendingParticipants = sql<number>`(
  select coalesce(sum("bookings"."participants"), 0)::int ${departureBookings}
    and "bookings"."status" = 'pending'
)`.mapWith(Number);

/**
 * Only departures that still have a guest: when every booking is cancelled
 * (or moved), the leftover assignment disappears from the portal just as the
 * departure disappears from the admin agenda.
 */
const hasGuests = sql`exists (select 1 ${onManifestFilter})`;

const departureColumns = {
  tourId: departureAssignments.tourId,
  date: departureAssignments.date,
  tourTitle: tours.title,
  meetingPoint: tours.meetingPoint,
  durationDays: tours.durationDays,
  durationHours: tours.durationHours,
  note: departureAssignments.note,
  bookingCount,
  participantCount,
  pendingParticipants,
};

export const partnerRepository = {
  /** The guide profile linked to a portal account (at most one, unique index). */
  findGuideByUserId(userId: string) {
    return db
      .select({
        id: guides.id,
        name: guides.name,
        organization: guides.organization,
        phone: guides.phone,
        email: guides.email,
        languages: guides.languages,
        isActive: guides.isActive,
        destinations: destinationNames,
      })
      .from(guides)
      .where(eq(guides.userId, userId))
      .then((rows) => rows[0]);
  },

  /** Departures (with guests) assigned to this guide on or after `from`, soonest first. */
  listUpcoming(guideId: number, from: string) {
    return db
      .select(departureColumns)
      .from(departureAssignments)
      .innerJoin(tours, eq(tours.id, departureAssignments.tourId))
      .where(
        and(
          eq(departureAssignments.guideId, guideId),
          gte(departureAssignments.date, from),
          hasGuests,
        ),
      )
      .orderBy(asc(departureAssignments.date), asc(departureAssignments.tourId));
  },

  /** Departures (with guests) assigned to this guide in [from, before), most recent first. */
  listPast(guideId: number, from: string, before: string) {
    return db
      .select(departureColumns)
      .from(departureAssignments)
      .innerJoin(tours, eq(tours.id, departureAssignments.tourId))
      .where(
        and(
          eq(departureAssignments.guideId, guideId),
          gte(departureAssignments.date, from),
          lt(departureAssignments.date, before),
          hasGuests,
        ),
      )
      .orderBy(desc(departureAssignments.date), asc(departureAssignments.tourId));
  },

  /** One departure, only when it is assigned to this guide and still has guests. */
  findDeparture(guideId: number, tourId: number, date: string) {
    return db
      .select(departureColumns)
      .from(departureAssignments)
      .innerJoin(tours, eq(tours.id, departureAssignments.tourId))
      .where(
        and(
          eq(departureAssignments.guideId, guideId),
          eq(departureAssignments.tourId, tourId),
          eq(departureAssignments.date, date),
          hasGuests,
        ),
      )
      .then((rows) => rows[0]);
  },

  /**
   * The partner-safe manifest. The join on the assignment repeats the guide
   * scope, so this returns nothing for a departure that isn't theirs even if
   * called on its own. `status` only marks pending (unconfirmed) guests.
   */
  listManifest(guideId: number, tourId: number, date: string) {
    return db
      .select({
        code: bookings.code,
        status: bookings.status,
        contactName: bookings.contactName,
        contactPhone: bookings.contactPhone,
        participants: bookings.participants,
        notes: bookings.notes,
      })
      .from(bookings)
      .innerJoin(
        departureAssignments,
        and(
          eq(departureAssignments.tourId, bookings.tourId),
          eq(departureAssignments.date, bookings.travelDate),
          eq(departureAssignments.guideId, guideId),
        ),
      )
      .where(
        and(
          eq(bookings.tourId, tourId),
          eq(bookings.travelDate, date),
          inArray(bookings.status, [...ON_MANIFEST]),
        ),
      )
      .orderBy(asc(bookings.contactName), asc(bookings.id));
  },
};
