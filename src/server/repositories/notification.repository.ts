import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { bookings, payments, tours, user } from "@/server/db/schema";

/** Read-only queries that gather everything a transactional email needs. */
export const notificationRepository = {
  bookingContext(bookingId: number) {
    return db
      .select({
        booking: bookings,
        tour: { title: tours.title, slug: tours.slug },
        recipient: { name: user.name, email: user.email, locale: user.locale },
      })
      .from(bookings)
      .innerJoin(tours, eq(bookings.tourId, tours.id))
      .innerJoin(user, eq(bookings.userId, user.id))
      .where(eq(bookings.id, bookingId))
      .limit(1)
      .then((rows) => rows[0]);
  },

  latestPaidPayment(bookingId: number) {
    return db.query.payments.findFirst({
      where: and(eq(payments.bookingId, bookingId), eq(payments.status, "paid")),
      orderBy: desc(payments.paidAt),
    });
  },
};
