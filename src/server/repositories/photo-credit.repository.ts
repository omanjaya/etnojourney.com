import "server-only";
import {
  asc,
  count,
  eq,
  getTableColumns,
  ilike,
  inArray,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { LocalizedText } from "@/lib/i18n-text";
import { db } from "@/server/db";
import { likePattern } from "@/server/db/like";
import { destinations, photoCredits, tours, type PhotoCredit } from "@/server/db/schema";
import { usedImagesSql } from "./media.repository";

/** Curated content photos and admin uploads can both carry a credit. */
const CREDITABLE_PREFIXES = ["/images/content/", "/media/"];

export type PhotoCreditValues = Omit<typeof photoCredits.$inferInsert, "path">;

/** A tour or destination that shows an image. */
export type ImageOwner =
  | { kind: "tour"; id: number; title: LocalizedText; isPublished: boolean }
  | { kind: "destination"; id: number; name: string };

type OwnerRef = { kind: string; id: number | string };

/** True when a tour or destination uses the credit's image. */
const usedByCatalogue = sql`exists (
  select 1 from (${usedImagesSql}) as used where used.path = ${photoCredits.path})`;

/** Loads the tours and destinations behind (kind, id) rows from `usedImagesSql`. */
async function loadOwners(refs: OwnerRef[]): Promise<Map<string, ImageOwner>> {
  const idsOf = (kind: string) => [
    ...new Set(refs.filter((ref) => ref.kind === kind).map((ref) => Number(ref.id))),
  ];
  const tourIds = idsOf("tour");
  const destinationIds = idsOf("destination");
  const [tourRows, destinationRows] = await Promise.all([
    tourIds.length
      ? db
          .select({ id: tours.id, title: tours.title, isPublished: tours.isPublished })
          .from(tours)
          .where(inArray(tours.id, tourIds))
      : [],
    destinationIds.length
      ? db
          .select({ id: destinations.id, name: destinations.name })
          .from(destinations)
          .where(inArray(destinations.id, destinationIds))
      : [],
  ]);
  const owners = new Map<string, ImageOwner>();
  for (const row of tourRows) owners.set(`tour:${row.id}`, { kind: "tour", ...row });
  for (const row of destinationRows) {
    owners.set(`destination:${row.id}`, { kind: "destination", ...row });
  }
  return owners;
}

const ownerKey = (ref: OwnerRef) => `${ref.kind}:${Number(ref.id)}`;

export const photoCreditRepository = {
  async findByPaths(paths: string[]): Promise<Map<string, PhotoCredit>> {
    const unique = [...new Set(paths)].filter((p) =>
      CREDITABLE_PREFIXES.some((prefix) => p.startsWith(prefix)),
    );
    if (unique.length === 0) return new Map();
    const rows = await db.select().from(photoCredits).where(inArray(photoCredits.path, unique));
    return new Map(rows.map((row) => [row.path, row]));
  },

  /**
   * Credits of images the site still shows: used by a tour or destination, or
   * under `alwaysUsedPrefix` (photos referenced from code).
   */
  listInUse(alwaysUsedPrefix: string) {
    return db
      .select()
      .from(photoCredits)
      .where(or(like(photoCredits.path, `${alwaysUsedPrefix}%`), usedByCatalogue))
      .orderBy(asc(photoCredits.path));
  },

  findByPath(path: string) {
    return db
      .select()
      .from(photoCredits)
      .where(eq(photoCredits.path, path))
      .limit(1)
      .then((rows) => rows[0]);
  },

  /**
   * Admin list, searched across path, title, author, license and source.
   * `usedByCatalogue` tells whether a tour or destination still shows the image.
   */
  search(q: string | undefined, limit: number, offset: number) {
    return db
      .select({ ...getTableColumns(photoCredits), usedByCatalogue: sql<boolean>`${usedByCatalogue}` })
      .from(photoCredits)
      .where(searchCondition(q))
      .orderBy(asc(photoCredits.path))
      .limit(limit)
      .offset(offset);
  },

  count(q: string | undefined): Promise<number> {
    return db
      .select({ total: count() })
      .from(photoCredits)
      .where(searchCondition(q))
      .then((rows) => rows[0]?.total ?? 0);
  },

  /** Whether a tour or destination uses the image at `path`. */
  async isUsedByCatalogue(path: string): Promise<boolean> {
    const rows = await db.execute<{ used: boolean }>(sql`
      select exists (select 1 from (${usedImagesSql}) as used where used.path = ${path}) as used`);
    return Boolean([...rows][0]?.used);
  },

  update(path: string, values: PhotoCreditValues) {
    return db
      .update(photoCredits)
      .set(values)
      .where(eq(photoCredits.path, path))
      .returning()
      .then((rows) => rows[0]);
  },

  /** Inserts a credit; returns undefined when the path already has one. */
  insert(values: typeof photoCredits.$inferInsert) {
    return db
      .insert(photoCredits)
      .values(values)
      .onConflictDoNothing({ target: photoCredits.path })
      .returning()
      .then((rows) => rows[0]);
  },

  delete(path: string) {
    return db
      .delete(photoCredits)
      .where(eq(photoCredits.path, path))
      .returning()
      .then((rows) => rows[0]);
  },

  /** Removes the credits of deleted images; returns how many went. */
  async deleteByPaths(paths: string[]): Promise<number> {
    if (paths.length === 0) return 0;
    const rows = await db
      .delete(photoCredits)
      .where(inArray(photoCredits.path, paths))
      .returning({ path: photoCredits.path });
    return rows.length;
  },

  /**
   * Uploaded images (under /media/) used by tours or destinations that have no
   * credit yet, each with the tours and destinations that show it, so the
   * admin can tell which photo is which.
   */
  async uncreditedUploads(limit = 100): Promise<{ path: string; usedIn: ImageOwner[] }[]> {
    const rows = [
      ...(await db.execute<{ path: string; kind: string; id: number }>(sql`
        select used.path, used.kind, used.id from (${usedImagesSql}) as used
        where used.path in (
          select distinct pending.path from (${usedImagesSql}) as pending
          where pending.path like '/media/%'
            and not exists (select 1 from ${photoCredits} c where c.path = pending.path)
          order by pending.path
          limit ${limit})
        order by used.path, used.kind desc, used.id`)),
    ];
    const owners = await loadOwners(rows);
    const byPath = new Map<string, ImageOwner[]>();
    for (const row of rows) {
      const usedIn = byPath.get(row.path) ?? [];
      const owner = owners.get(ownerKey(row));
      if (owner && !usedIn.includes(owner)) usedIn.push(owner);
      byPath.set(row.path, usedIn);
    }
    return [...byPath].map(([path, usedIn]) => ({ path, usedIn }));
  },

  /**
   * Tours and destinations showing images whose credit license starts with
   * `licensePrefix` (the AI placeholder marker), with how many such images.
   */
  async usageByLicensePrefix(
    licensePrefix: string,
  ): Promise<{ owner: ImageOwner; images: number }[]> {
    const rows = [
      ...(await db.execute<{ kind: string; id: number; images: number }>(sql`
        select used.kind, used.id, count(distinct used.path)::int as images
        from (${usedImagesSql}) as used
        join ${photoCredits} c on c.path = used.path
        where c.license ilike ${`${licensePrefix}%`}
        group by used.kind, used.id`)),
    ];
    const owners = await loadOwners(rows);
    return rows.flatMap((row) => {
      const owner = owners.get(ownerKey(row));
      return owner ? [{ owner, images: Number(row.images) }] : [];
    });
  },
};

function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = likePattern(q);
  return or(
    ilike(photoCredits.path, pattern),
    ilike(photoCredits.title, pattern),
    ilike(photoCredits.author, pattern),
    ilike(photoCredits.license, pattern),
    ilike(photoCredits.source, pattern),
  );
}
