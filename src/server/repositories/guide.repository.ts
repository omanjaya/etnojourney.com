import "server-only";
import { asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { destinations, guideDestinations, guides, user } from "@/server/db/schema";

export type GuideValues = {
  name: string;
  organization: string | null;
  phone: string | null;
  email: string | null;
  languages: string[];
  notes: string | null;
  isActive: boolean;
};

function adminSearch(query: string | undefined): SQL | undefined {
  if (!query) return undefined;
  const pattern = likePattern(query);
  return or(
    ilike(guides.name, pattern),
    ilike(guides.organization, pattern),
    ilike(guides.email, pattern),
    ilike(guides.phone, pattern),
  );
}

// Qualified by hand: drizzle renders columns unqualified inside a correlated subquery.
const destinationNames = sql<string[]>`coalesce((
  select array_agg("destinations"."name" order by "destinations"."name")
  from "guide_destinations"
  join "destinations" on "destinations"."id" = "guide_destinations"."destination_id"
  where "guide_destinations"."guide_id" = "guides"."id"
), '{}')`;

export const guideRepository = {
  /** Admin list: guide, destination names and the linked account (if any). */
  listAdmin(query: string | undefined, limit: number, offset: number) {
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
        accountEmail: user.email,
      })
      .from(guides)
      .leftJoin(user, eq(user.id, guides.userId))
      .where(adminSearch(query))
      .orderBy(desc(guides.isActive), asc(guides.name), asc(guides.id))
      .limit(limit)
      .offset(offset);
  },

  countAdmin(query: string | undefined): Promise<number> {
    return db
      .select({ total: count() })
      .from(guides)
      .where(adminSearch(query))
      .then((rows) => rows[0]?.total ?? 0);
  },

  findById(id: number) {
    return db
      .select()
      .from(guides)
      .where(eq(guides.id, id))
      .then((rows) => rows[0]);
  },

  destinationIdsOf(guideId: number): Promise<number[]> {
    return db
      .select({ id: guideDestinations.destinationId })
      .from(guideDestinations)
      .where(eq(guideDestinations.guideId, guideId))
      .then((rows) => rows.map((row) => row.id));
  },

  /** The account linked to a guide, for the admin edit page. */
  findAccount(userId: string) {
    return db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .then((rows) => rows[0]);
  },

  /** Destination options for the form. */
  destinationOptions() {
    return db
      .select({ id: destinations.id, name: destinations.name, province: destinations.province })
      .from(destinations)
      .orderBy(asc(destinations.name));
  },

  /** How many of `ids` exist (to reject unknown destination ids with a clear error). */
  countDestinations(tx: DbExecutor, ids: number[]): Promise<number> {
    if (ids.length === 0) return Promise.resolve(0);
    return tx
      .select({ total: count() })
      .from(destinations)
      .where(inArray(destinations.id, ids))
      .then((rows) => rows[0]?.total ?? 0);
  },

  insert(tx: DbExecutor, values: GuideValues) {
    return tx
      .insert(guides)
      .values(values)
      .returning({ id: guides.id, name: guides.name })
      .then((rows) => rows[0]);
  },

  update(tx: DbExecutor, id: number, values: GuideValues) {
    return tx.update(guides).set(values).where(eq(guides.id, id));
  },

  replaceDestinations(tx: DbExecutor, guideId: number, destinationIds: number[]) {
    return tx
      .delete(guideDestinations)
      .where(eq(guideDestinations.guideId, guideId))
      .then(() =>
        destinationIds.length
          ? tx
              .insert(guideDestinations)
              .values(destinationIds.map((destinationId) => ({ guideId, destinationId })))
          : undefined,
      );
  },

  /** Locks one guide row for an update or an account (un)link. */
  lockById(tx: DbExecutor, id: number) {
    return tx
      .select({ id: guides.id, name: guides.name, userId: guides.userId })
      .from(guides)
      .where(eq(guides.id, id))
      .for("update")
      .then((rows) => rows[0]);
  },

  /** The guide an account is linked to (the unique index allows at most one). */
  lockByUserId(tx: DbExecutor, userId: string) {
    return tx
      .select({ id: guides.id })
      .from(guides)
      .where(eq(guides.userId, userId))
      .for("update")
      .then((rows) => rows[0]);
  },

  setUserId(tx: DbExecutor, guideId: number, userId: string | null) {
    return tx.update(guides).set({ userId }).where(eq(guides.id, guideId));
  },
};
