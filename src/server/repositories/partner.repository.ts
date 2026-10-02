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

/** Bookings that actually travel: unpaid and cancelled ones are not on a manifest. */
const TRAVELLING = ["confirmed", "completed"] as const;

// Qualified by hand: drizzle renders columns unqualified inside a correlated subquery.
const destinationNames = sql<string[]>`coalesce((
  select array_agg("destinations"."name" order by "destinations"."name")
  from "guide_destinations"
  join "destinations" on "destinations"."id" = "guide_destinations"."destination_id"
  where "guide_destinations"."guide_id" = "guides"."id"
), '{}')`;

const travellingFilter = sql`
  from "bookings"
  where "bookings"."tour_id" = "departure_assignments"."tour_id"
    and "bookings"."travel_date" = "departure_assignments"."date"
    and "bookings"."status" in ('confirmed', 'completed')`;
const bookingCount = sql<number>`(select count(*)::int ${travellingFilter})`.mapWith(Number);
const participantCount = sql<number>`(
  select coalesce(sum("bookings"."participants"), 0)::int ${travellingFilter}
)`.mapWith(Number);

const departureColumns = {
  tourId: departureAssignments.tourId,
  date: departureAssignments.date,
  tourTitle: tours.title,
  meetingPoint: tours.meetingPoint,
  durationDays: tours.durationDays,
  note: departureAssignments.note,
  bookingCount,
  participantCount,
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

  /** Departures assigned to this guide on or after `from`, soonest first. */
  listUpcoming(guideId: number, from: string) {
    return db
      .select(departureColumns)
      .from(departureAssignments)
      .innerJoin(tours, eq(tours.id, departureAssignments.tourId))
      .where(and(eq(departureAssignments.guideId, guideId), gte(departureAssignments.date, from)))
      .orderBy(asc(departureAssignments.date), asc(departureAssignments.tourId));
  },

  /** Departures assigned to this guide in [from, before), most recent first. */
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
        ),
      )
      .orderBy(desc(departureAssignments.date), asc(departureAssignments.tourId));
  },

  /** One departure, only when it is assigned to this guide. */
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
        ),
      )
      .then((rows) => rows[0]);
  },

  /**
   * The partner-safe manifest. The join on the assignment repeats the guide
   * scope, so this returns nothing for a departure that isn't theirs even if
   * called on its own.
   */
  listManifest(guideId: number, tourId: number, date: string) {
    return db
      .select({
        code: bookings.code,
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
          inArray(bookings.status, [...TRAVELLING]),
        ),
      )
      .orderBy(asc(bookings.contactName), asc(bookings.id));
  },
};
