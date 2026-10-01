import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, user } from "@/server/db/schema";
import type { Locale } from "@/i18n/routing";

export const accountRepository = {
  findProfile(userId: string) {
    return db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true, name: true, email: true, locale: true },
    });
  },

  updateProfile(userId: string, values: { name: string; locale: Locale }) {
    return db
      .update(user)
      .set(values)
      .where(eq(user.id, userId))
      .returning({ id: user.id })
      .then((rows) => rows[0]);
  },

  /** A booking with its tour, destination and itinerary, scoped to its owner. */
  findBookingForUser(userId: string, code: string) {
    return db.query.bookings.findFirst({
      where: and(eq(bookings.code, code), eq(bookings.userId, userId)),
      with: {
        tour: {
          with: {
            destination: true,
            itinerary: { orderBy: (d, { asc }) => [asc(d.day)] },
          },
        },
      },
    });
  },
};
