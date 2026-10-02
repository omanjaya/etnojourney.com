import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "@/server/db";
import { bookingNotes, user, type BookingNote } from "@/server/db/schema";

/** Internal (staff-only) notes attached to a booking. */
export const bookingNoteRepository = {
  insert(
    values: typeof bookingNotes.$inferInsert,
    executor: DbExecutor = db,
  ): Promise<BookingNote> {
    return executor
      .insert(bookingNotes)
      .values(values)
      .returning()
      .then((rows) => rows[0]);
  },

  /** Newest first, with the author's name (null when the author was deleted). */
  listForBooking(bookingId: number) {
    return db
      .select({ note: bookingNotes, authorName: user.name })
      .from(bookingNotes)
      .leftJoin(user, eq(user.id, bookingNotes.authorId))
      .where(eq(bookingNotes.bookingId, bookingId))
      .orderBy(desc(bookingNotes.createdAt), desc(bookingNotes.id));
  },
};
