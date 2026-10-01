import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { destinations, tours, wishlists } from "@/server/db/schema";

export const wishlistRepository = {
  async exists(userId: string, tourId: number): Promise<boolean> {
    const row = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.userId, userId), eq(wishlists.tourId, tourId)),
    });
    return Boolean(row);
  },

  async add(userId: string, tourId: number) {
    await db.insert(wishlists).values({ userId, tourId }).onConflictDoNothing();
  },

  async remove(userId: string, tourId: number) {
    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.tourId, tourId)));
  },

  tourIdsForUser(userId: string) {
    return db
      .select({ tourId: wishlists.tourId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId))
      .then((rows) => new Set(rows.map((r) => r.tourId)));
  },

  listForUser(userId: string) {
    return db
      .select({ tour: tours, destination: destinations })
      .from(wishlists)
      .innerJoin(tours, eq(wishlists.tourId, tours.id))
      .innerJoin(destinations, eq(tours.destinationId, destinations.id))
      .where(and(eq(wishlists.userId, userId), eq(tours.isPublished, true)))
      .orderBy(desc(wishlists.createdAt));
  },
};
