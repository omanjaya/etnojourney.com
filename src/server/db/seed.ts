/**
 * Idempotent seed: resets catalog and booking tables, then (re)creates demo accounts.
 * Run with `npm run db:seed`.
 */
import { eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { isoDateFromToday } from "@/lib/format";
import { generateBookingCode } from "@/server/services/booking.rules";
import { db } from "./index";
import {
  bookings,
  destinations,
  itineraryDays,
  payments,
  reviews,
  tours,
  user,
  wishlists,
  type UserRole,
} from "./schema";
import { destinationSeeds, tourSeeds } from "./seed-data";

async function ensureUser(name: string, email: string, password: string, role: UserRole) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  const id =
    existing?.id ?? (await auth.api.signUpEmail({ body: { name, email, password } })).user.id;
  await db.update(user).set({ role, emailVerified: true }).where(eq(user.id, id));
  return id;
}

async function main() {
  console.log("Resetting catalog tables...");
  await db.execute(
    sql`TRUNCATE ${payments}, ${bookings}, ${wishlists}, ${reviews}, ${itineraryDays}, ${tours}, ${destinations} RESTART IDENTITY CASCADE`,
  );

  const insertedDestinations = await db.insert(destinations).values(destinationSeeds).returning();
  const destinationIds = new Map(insertedDestinations.map((d) => [d.slug, d.id]));

  const tourIds = new Map<string, number>();
  for (const seed of tourSeeds) {
    const { destination, itinerary, reviews: tourReviews, ...values } = seed;
    const destinationId = destinationIds.get(destination);
    if (!destinationId) throw new Error(`Unknown destination ${destination}`);
    if (itinerary.length !== values.durationDays) {
      throw new Error(
        `${seed.slug}: itinerary has ${itinerary.length} days, expected ${values.durationDays}`,
      );
    }

    const [tour] = await db
      .insert(tours)
      .values({ ...values, destinationId })
      .returning();
    tourIds.set(tour.slug, tour.id);

    await db
      .insert(itineraryDays)
      .values(itinerary.map((day, i) => ({ ...day, tourId: tour.id, day: i + 1 })));

    await db.insert(reviews).values(
      tourReviews.map((review, i) => ({
        ...review,
        tourId: tour.id,
        createdAt: new Date(Date.now() - (i + 1) * 9 * 86_400_000),
      })),
    );
  }

  console.log("Ensuring demo accounts...");
  await ensureUser(
    "Admin EtnoJourney",
    process.env.SEED_ADMIN_EMAIL ?? "admin@etnojourney.id",
    process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!",
    "admin",
  );
  const travelerId = await ensureUser(
    "Nadia Putri",
    "traveler@etnojourney.id",
    "Traveler123!",
    "user",
  );

  const sample = [
    { slug: "kasada-dan-fajar-bromo", days: 21, participants: 2, status: "pending" as const },
    {
      slug: "borobudur-fajar-dan-batik-tulis",
      days: 45,
      participants: 3,
      status: "confirmed" as const,
    },
    { slug: "dapur-desa-keluarga-bali", days: 10, participants: 2, status: "cancelled" as const },
    // A past, completed trip so the traveller can try writing a review.
    {
      slug: "melukat-dan-jejak-subak-ubud",
      days: -30,
      participants: 2,
      status: "completed" as const,
    },
  ];
  for (const item of sample) {
    const tour = tourSeeds.find((t) => t.slug === item.slug)!;
    const [booking] = await db
      .insert(bookings)
      .values({
        code: generateBookingCode(),
        userId: travelerId,
        tourId: tourIds.get(item.slug)!,
        travelDate: isoDateFromToday(item.days),
        participants: item.participants,
        unitPrice: tour.pricePerPerson,
        totalPrice: tour.pricePerPerson * item.participants,
        status: item.status,
        contactName: "Nadia Putri",
        contactPhone: "081234567890",
      })
      .returning();

    // Confirmed and completed trips were paid online.
    if (item.status === "confirmed" || item.status === "completed") {
      await db.insert(payments).values({
        bookingId: booking.id,
        provider: "midtrans",
        orderId: `${booking.code}-seed`,
        amount: booking.totalPrice,
        status: "paid",
        method: "bank_transfer",
        paidAt: new Date(),
      });
    }
  }
  await db.insert(wishlists).values({
    userId: travelerId,
    tourId: tourIds.get("kampung-arborek-raja-ampat")!,
  });

  console.log(
    `Seeded ${insertedDestinations.length} destinations, ${tourSeeds.length} tours, ` +
      `${tourSeeds.reduce((n, t) => n + t.reviews.length, 0)} reviews, ${sample.length} bookings.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
