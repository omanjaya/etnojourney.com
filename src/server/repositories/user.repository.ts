import "server-only";
import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { bookings, session, tours, user, wishlists, type UserRole } from "@/server/db/schema";

export type AdminUserFilters = {
  /** Matches name or email. */
  q?: string;
  role?: UserRole;
};

function adminConditions(filters: AdminUserFilters): SQL | undefined {
  const pattern = filters.q ? likePattern(filters.q) : undefined;
  return and(
    filters.role ? eq(user.role, filters.role) : undefined,
    pattern ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
  );
}

// Qualified by hand: drizzle renders columns unqualified inside a correlated
// subquery, which would compare bookings.user_id with bookings.id.
const bookingCount = sql<number>`(
  select count(*)::int from "bookings" where "bookings"."user_id" = "user"."id"
)`;

const profileColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  locale: user.locale,
  emailVerified: user.emailVerified,
  disabledAt: user.disabledAt,
  createdAt: user.createdAt,
};

export const userRepository = {
  listAdmin(filters: AdminUserFilters, limit: number, offset: number) {
    return db
      .select({ ...profileColumns, bookingCount })
      .from(user)
      .where(adminConditions(filters))
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(limit)
      .offset(offset);
  },

  countAdmin(filters: AdminUserFilters): Promise<number> {
    return db
      .select({ total: count() })
      .from(user)
      .where(adminConditions(filters))
      .then((rows) => rows[0]?.total ?? 0);
  },

  findProfile(id: string) {
    return db
      .select(profileColumns)
      .from(user)
      .where(eq(user.id, id))
      .then((rows) => rows[0]);
  },

  findByEmail(email: string) {
    return db
      .select(profileColumns)
      .from(user)
      .where(eq(user.email, email))
      .then((rows) => rows[0]);
  },

  listBookings(userId: string) {
    return db
      .select({
        id: bookings.id,
        code: bookings.code,
        status: bookings.status,
        travelDate: bookings.travelDate,
        participants: bookings.participants,
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt,
        tourTitle: tours.title,
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt), desc(bookings.id));
  },

  countWishlist(userId: string): Promise<number> {
    return db.$count(wishlists, eq(wishlists.userId, userId));
  },

  /** Back-office accounts (staff and admin), for the activity log's actor filter. */
  listBackoffice() {
    return db
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      .where(or(eq(user.role, "staff"), eq(user.role, "admin")))
      .orderBy(user.name);
  },

  /** Locks one user row for a role or status change. */
  lockById(tx: DbExecutor, id: string) {
    return tx
      .select({ id: user.id, role: user.role, disabledAt: user.disabledAt })
      .from(user)
      .where(eq(user.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  /**
   * Locks every enabled admin and returns how many there are. Two admins
   * demoting each other at once serialize here, so one of them sees the other's
   * change and the last-admin rule still holds.
   */
  lockActiveAdmins(tx: DbExecutor): Promise<number> {
    return tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.role, "admin"), isNull(user.disabledAt)))
      .for("update")
      .then((rows) => rows.length);
  },

  setRole(tx: DbExecutor, id: string, role: UserRole) {
    return tx.update(user).set({ role }).where(eq(user.id, id));
  },

  setDisabledAt(tx: DbExecutor, id: string, disabledAt: Date | null) {
    return tx.update(user).set({ disabledAt }).where(eq(user.id, id));
  },

  /** Signs the user out everywhere (Better Auth sessions live only in this table). */
  deleteSessions(tx: DbExecutor, userId: string) {
    return tx.delete(session).where(eq(session.userId, userId));
  },
};
