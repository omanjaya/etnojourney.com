import "server-only";
import { and, asc, count, eq, gte, inArray, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import {
  bookingNotes,
  bookings,
  departureAssignments,
  destinations,
  guideDestinations,
  guides,
  payments,
  tours,
  type BookingStatus,
  type DepartureAssignment,
} from "@/server/db/schema";
import type { LocalizedText } from "@/lib/i18n-text";
import { DEPARTURE_STATUSES } from "@/server/services/departure.rules";

export type DepartureFilters = {
  /** Travel date range, inclusive, YYYY-MM-DD. */
  from: string;
  to: string;
  tourId?: number;
  /** Only departures nobody (active) is assigned to. */
  withoutGuide?: boolean;
};

/** Hard cap on agenda rows; a 120-day range across every tour stays well below it. */
const AGENDA_LIMIT = 1000;

/** Cancelled bookings never make a departure; completed ones keep past trips listed. */
const departureBooking = inArray(bookings.status, [...DEPARTURE_STATUSES]);

/** Joins a booking row to its departure's assignment (if any). */
const assignmentJoin = and(
  eq(departureAssignments.tourId, bookings.tourId),
  eq(departureAssignments.date, bookings.travelDate),
);

/** No assignment row, no guide on it, or a guide who has been deactivated. */
const withoutGuideCondition = or(
  isNull(departureAssignments.guideId),
  eq(guides.isActive, false),
) as SQL;

function agendaConditions(filters: DepartureFilters): SQL | undefined {
  return and(
    departureBooking,
    gte(bookings.travelDate, filters.from),
    lte(bookings.travelDate, filters.to),
    filters.tourId ? eq(bookings.tourId, filters.tourId) : undefined,
    filters.withoutGuide ? withoutGuideCondition : undefined,
  );
}

/** Seats of bookings in `statuses` (completed trips count with the confirmed ones). */
const sumWhere = (statuses: readonly BookingStatus[]) =>
  sql<number>`coalesce(sum(${bookings.participants}) filter (where ${inArray(bookings.status, [...statuses])}), 0)::int`;

/** Another departure this guide is assigned to whose days overlap the one being staffed. */
export type BusyDeparture = { tourId: number; tourTitle: LocalizedText; date: string };

/** Paid attempt first, otherwise the most recent one. */
const latestPaymentStatus = sql<string | null>`(
  select ${payments.status} from ${payments}
  where ${payments.bookingId} = ${bookings.id}
  order by (${payments.status} = 'paid') desc, ${payments.createdAt} desc
  limit 1
)`;

const notesCount = sql<number>`(
  select count(*)::int from ${bookingNotes} where ${bookingNotes.bookingId} = ${bookings.id}
)`;

export const departureRepository = {
  /**
   * Marks the manifest of these departures as not sent (the guide's copy is
   * out of date), e.g. after a booking moved between them.
   */
  markManifestStale(tx: DbExecutor, tourId: number, dates: string[]) {
    return tx
      .update(departureAssignments)
      .set({ notifiedAt: null })
      .where(
        and(
          eq(departureAssignments.tourId, tourId),
          inArray(departureAssignments.date, dates),
          isNotNull(departureAssignments.notifiedAt),
        ),
      );
  },

  /**
   * The agenda in one aggregate query: bookings that are not cancelled, grouped
   * per tour and date, joined to the tour, destination, assignment and guide. Grouping by
   * the joined tables' primary keys lets Postgres select their other columns.
   */
  agenda(filters: DepartureFilters) {
    return db
      .select({
        tourId: bookings.tourId,
        date: bookings.travelDate,
        tourSlug: tours.slug,
        tourTitle: tours.title,
        capacity: tours.maxParticipants,
        destinationName: destinations.name,
        confirmed: sumWhere(["confirmed", "completed"]),
        pending: sumWhere(["pending"]),
        bookings: sql<number>`count(${bookings.id})::int`,
        durationDays: tours.durationDays,
        guideId: departureAssignments.guideId,
        guideName: guides.name,
        guideActive: guides.isActive,
        hasNote: sql<boolean>`coalesce(char_length(${departureAssignments.note}) > 0, false)`,
        notifiedAt: departureAssignments.notifiedAt,
      })
      .from(bookings)
      .innerJoin(tours, eq(tours.id, bookings.tourId))
      .innerJoin(destinations, eq(destinations.id, tours.destinationId))
      .leftJoin(departureAssignments, assignmentJoin)
      .leftJoin(guides, eq(guides.id, departureAssignments.guideId))
      .where(agendaConditions(filters))
      .groupBy(
        bookings.tourId,
        bookings.travelDate,
        tours.id,
        destinations.id,
        departureAssignments.id,
        guides.id,
      )
      .orderBy(asc(bookings.travelDate), asc(tours.slug))
      .limit(AGENDA_LIMIT);
  },

  /** Number of departures (tour + date) matching the filters. */
  countDepartures(filters: DepartureFilters): Promise<number> {
    const departures = db
      .select({ tourId: bookings.tourId, date: bookings.travelDate })
      .from(bookings)
      .leftJoin(departureAssignments, assignmentJoin)
      .leftJoin(guides, eq(guides.id, departureAssignments.guideId))
      .where(agendaConditions(filters))
      .groupBy(bookings.tourId, bookings.travelDate)
      .as("departures");
    return db
      .select({ total: count() })
      .from(departures)
      .then((rows) => rows[0]?.total ?? 0);
  },

  /** Tours for the agenda filter. */
  listTourOptions() {
    return db
      .select({ id: tours.id, title: tours.title, isPublished: tours.isPublished })
      .from(tours)
      .orderBy(asc(tours.slug));
  },

  /** Header of the detail page: the tour with its destination. */
  findTour(tourId: number) {
    return db
      .select({
        id: tours.id,
        slug: tours.slug,
        title: tours.title,
        meetingPoint: tours.meetingPoint,
        capacity: tours.maxParticipants,
        durationDays: tours.durationDays,
        destinationId: destinations.id,
        destinationName: destinations.name,
      })
      .from(tours)
      .innerJoin(destinations, eq(destinations.id, tours.destinationId))
      .where(eq(tours.id, tourId))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /** The departure's assignment with its guide. */
  findAssignment(tourId: number, date: string) {
    return db
      .select({
        assignment: departureAssignments,
        guide: {
          id: guides.id,
          name: guides.name,
          organization: guides.organization,
          phone: guides.phone,
          email: guides.email,
          isActive: guides.isActive,
        },
      })
      .from(departureAssignments)
      .leftJoin(guides, eq(guides.id, departureAssignments.guideId))
      .where(and(eq(departureAssignments.tourId, tourId), eq(departureAssignments.date, date)))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /** Locks the assignment row (if it exists) before changing it. */
  findAssignmentForUpdate(
    tx: DbExecutor,
    tourId: number,
    date: string,
  ): Promise<DepartureAssignment | undefined> {
    return tx
      .select()
      .from(departureAssignments)
      .where(and(eq(departureAssignments.tourId, tourId), eq(departureAssignments.date, date)))
      .for("update")
      .then((rows) => rows[0]);
  },

  /** Every booking on the departure (all statuses), with payment state and note count. */
  listManifest(tourId: number, date: string) {
    return db
      .select({
        id: bookings.id,
        code: bookings.code,
        status: bookings.status,
        contactName: bookings.contactName,
        contactPhone: bookings.contactPhone,
        participants: bookings.participants,
        notes: bookings.notes,
        paymentStatus: latestPaymentStatus,
        notesCount,
      })
      .from(bookings)
      .where(and(eq(bookings.tourId, tourId), eq(bookings.travelDate, date)))
      .orderBy(asc(bookings.id));
  },

  /**
   * Guides that can be assigned: every active guide (plus `includeId`, the
   * current one, even if deactivated), flagged when they cover `destinationId`.
   * `busyWith` lists the guide's other departures whose days overlap
   * `departure` (from its start to `end`, the trip's last day), counting
   * only departures that still have a booking that is not cancelled.
   */
  listGuideOptions(
    destinationId: number,
    includeId: number | null,
    departure: { tourId: number; date: string; end: string },
  ) {
    // Qualified by hand: the subquery aliases a second copy of the assignments.
    const busyWith = sql<BusyDeparture[]>`coalesce((
      select json_agg(
        json_build_object('tourId', "other"."tour_id", 'tourTitle', "other_tour"."title", 'date', "other"."date")
        order by "other"."date", "other"."tour_id"
      )
      from "departure_assignments" as "other"
      join "tours" as "other_tour" on "other_tour"."id" = "other"."tour_id"
      where "other"."guide_id" = "guides"."id"
        and not ("other"."tour_id" = ${departure.tourId} and "other"."date" = ${departure.date}::date)
        and "other"."date" <= ${departure.end}::date
        and "other"."date" + (greatest("other_tour"."duration_days", 1) - 1) >= ${departure.date}::date
        and exists (
          select 1 from "bookings"
          where "bookings"."tour_id" = "other"."tour_id"
            and "bookings"."travel_date" = "other"."date"
            and "bookings"."status" <> 'cancelled'
        )
    ), '[]'::json)`;
    return db
      .select({
        id: guides.id,
        name: guides.name,
        organization: guides.organization,
        isActive: guides.isActive,
        coversDestination: sql<boolean>`exists (
          select 1 from ${guideDestinations}
          where ${guideDestinations.guideId} = ${guides.id}
            and ${guideDestinations.destinationId} = ${destinationId}
        )`,
        busyWith,
      })
      .from(guides)
      .where(
        includeId === null
          ? eq(guides.isActive, true)
          : or(eq(guides.isActive, true), eq(guides.id, includeId)),
      )
      .orderBy(asc(guides.name));
  },

  /** Names of these guides (deactivated ones included), for the departure history. */
  async guideNames(ids: readonly number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    const rows = await db
      .select({ id: guides.id, name: guides.name })
      .from(guides)
      .where(inArray(guides.id, [...ids]));
    return new Map(rows.map((row) => [row.id, row.name]));
  },

  findGuide(id: number, tx: DbExecutor = db) {
    return tx
      .select({ id: guides.id, name: guides.name, isActive: guides.isActive })
      .from(guides)
      .where(eq(guides.id, id))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /** Creates or updates the departure's row (unique on tour + date). */
  upsert(
    tx: DbExecutor,
    key: { tourId: number; date: string },
    values: Partial<
      Pick<
        typeof departureAssignments.$inferInsert,
        "guideId" | "note" | "assignedBy" | "notifiedAt"
      >
    >,
  ): Promise<DepartureAssignment> {
    return tx
      .insert(departureAssignments)
      .values({ ...key, ...values })
      .onConflictDoUpdate({
        target: [departureAssignments.tourId, departureAssignments.date],
        set: { ...values, updatedAt: new Date() },
      })
      .returning()
      .then((rows) => rows[0]);
  },
};
