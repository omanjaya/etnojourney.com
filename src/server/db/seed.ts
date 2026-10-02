/**
 * Idempotent seed: resets catalog and booking tables from the reviewed JSON in
 * content/ (validated by loadContent), then (re)creates demo accounts.
 * Run with `npm run db:seed`.
 */
import { count, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { isoDateFromToday } from "@/lib/format";
import { generateBookingCode } from "@/server/services/booking.rules";
import { db } from "./index";
import {
  bookings,
  destinations,
  itineraryDays,
  payments,
  photoCredits,
  auditLogs,
  reviews,
  tours,
  user,
  wishlists,
  type UserRole,
} from "./schema";
import { loadContent } from "./content";

async function ensureUser(name: string, email: string, password: string, role: UserRole) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  const id =
    existing?.id ?? (await auth.api.signUpEmail({ body: { name, email, password } })).user.id;
  await db.update(user).set({ role, emailVerified: true }).where(eq(user.id, id));
  return id;
}

/**
 * `SEED_MODE=content` loads only the catalogue (destinations, tours, photo
 * credits, curated reviews) for a fresh production database: no demo
 * accounts, no sample bookings. It refuses to run once real bookings exist,
 * because the catalogue reset would cascade into them.
 */
const contentOnly = process.env.SEED_MODE === "content";

async function main() {
  // Validate everything before touching the database.
  const content = await loadContent();

  if (contentOnly) {
    const [{ total }] = await db.select({ total: count() }).from(bookings);
    if (total > 0) {
      throw new Error(`Refusing to reset the catalogue: ${total} bookings exist.`);
    }
  }

  console.log("Resetting catalog tables...");
  await db.execute(
    // The audit log points at catalogue ids by value; they restart here, so it goes too.
    sql`TRUNCATE ${payments}, ${bookings}, ${wishlists}, ${reviews}, ${itineraryDays}, ${tours}, ${destinations}, ${photoCredits}, ${auditLogs} RESTART IDENTITY CASCADE`,
  );

  await db.insert(photoCredits).values(
    Object.entries(content.credits).map(([path, c]) => ({
      path,
      title: c.title,
      author: c.author,
      license: c.license,
      licenseUrl: c.licenseUrl,
      sourceUrl: c.sourceUrl,
      source: c.source,
    })),
  );

  const insertedDestinations = await db
    .insert(destinations)
    .values(content.destinations)
    .returning();
  const destinationIds = new Map(insertedDestinations.map((d) => [d.slug, d.id]));

  const tourIds = new Map<string, number>();
  for (const seed of content.tours) {
    const { destination, itinerary, reviews: tourReviews = [], ...values } = seed;
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

    if (tourReviews.length) {
      await db.insert(reviews).values(
        tourReviews.map((review, i) => ({
          ...review,
          tourId: tour.id,
          createdAt: new Date(Date.now() - (i + 1) * 9 * 86_400_000),
        })),
      );
    }
  }

  if (contentOnly) {
    console.log(
      `Seeded ${content.destinations.length} destinations, ${content.tours.length} tours (content only).`,
    );
    return;
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
    const tour = content.tours.find((t) => t.slug === item.slug)!;
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
    `Seeded ${insertedDestinations.length} destinations, ${content.tours.length} tours, ` +
      `${content.tours.reduce((n, t) => n + (t.reviews?.length ?? 0), 0)} reviews, ` +
      `${Object.keys(content.credits).length} photo credits, ${sample.length} bookings.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
