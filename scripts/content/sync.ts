/**
 * Adds catalogue entries from content/ that the database does not have yet:
 * destinations and tours (matched by slug, with their itinerary) and photo
 * credits (matched by path). It never updates or deletes anything, so edits
 * made in the back office and live bookings are left alone; a tour slug the
 * back office renamed or deleted (per the activity log) is not added again,
 * and a renamed destination still matches its old slug. Use it to publish
 * new content on a database that already has bookings, where the seed refuses
 * to run.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/content/sync.ts           # dry run
 *   DATABASE_URL=postgres://... npx tsx scripts/content/sync.ts --apply   # write
 *
 * New tours and destinations are recorded in the activity log as system actions.
 * Run migrations first: a new deploy applies them when the container starts.
 */
import { asc, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, destinations, itineraryDays, photoCredits, tours } from "@/server/db/schema";
import { loadContent } from "@/server/db/content";

async function main() {
  const apply = process.argv.includes("--apply");
  const content = await loadContent();

  const result = await db.transaction(async (tx) => {
    const existingCredits = new Set(
      (await tx.select({ path: photoCredits.path }).from(photoCredits)).map((r) => r.path),
    );
    const existingDestinations = new Map(
      (await tx.select({ id: destinations.id, slug: destinations.slug }).from(destinations)).map(
        (r) => [r.slug, r.id],
      ),
    );
    const existingTours = new Set(
      (await tx.select({ slug: tours.slug }).from(tours)).map((r) => r.slug),
    );

    // Addresses the back office moved away from (renamed) or deleted on purpose
    // count as existing, so the sync never brings a duplicate or removed tour back.
    const catalogueHistory = await tx
      .select({
        action: auditLogs.action,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .where(inArray(auditLogs.action, ["tour.updated", "tour.deleted", "destination.updated"]))
      .orderBy(asc(auditLogs.id));
    const destinationIds = new Set(existingDestinations.values());
    for (const { action, entityId, details } of catalogueHistory) {
      const previous = details?.previousSlug;
      if (action === "tour.deleted" && typeof details?.slug === "string") {
        existingTours.add(details.slug);
      } else if (action === "tour.updated" && typeof previous === "string") {
        existingTours.add(previous);
      } else if (
        action === "destination.updated" &&
        typeof previous === "string" &&
        !existingDestinations.has(previous) &&
        destinationIds.has(Number(entityId))
      ) {
        // Content still names the old slug: attach its tours to the renamed destination.
        existingDestinations.set(previous, Number(entityId));
      }
    }

    const newCredits = Object.entries(content.credits).filter(
      ([path]) => !existingCredits.has(path),
    );
    const newDestinations = content.destinations.filter((d) => !existingDestinations.has(d.slug));
    const newTours = content.tours.filter((t) => !existingTours.has(t.slug));

    if (!apply) return { newCredits, newDestinations, newTours };

    if (newCredits.length) {
      await tx.insert(photoCredits).values(
        newCredits.map(([path, c]) => ({
          path,
          title: c.title,
          author: c.author,
          license: c.license,
          licenseUrl: c.licenseUrl,
          sourceUrl: c.sourceUrl,
          source: c.source,
        })),
      );
    }

    for (const destination of newDestinations) {
      const [row] = await tx.insert(destinations).values(destination).returning();
      existingDestinations.set(row.slug, row.id);
      await tx.insert(auditLogs).values({
        actorId: null,
        action: "destination.created",
        entityType: "destination",
        entityId: String(row.id),
        details: { slug: row.slug, via: "content-sync" },
      });
    }

    for (const seed of newTours) {
      const { destination, itinerary, reviews, ...values } = seed;
      // Curated reviews belong to the original demo catalogue; on a live site
      // rating and review count come from real guests, so they start at zero.
      if (reviews?.length) throw new Error(`${seed.slug}: new tours cannot ship curated reviews`);
      const destinationId = existingDestinations.get(destination);
      if (!destinationId) throw new Error(`${seed.slug}: unknown destination ${destination}`);
      // Content is reviewed in a pull request, so new tours go live (isPublished defaults to true).
      const [tour] = await tx
        .insert(tours)
        .values({ ...values, destinationId, rating: 0, reviewCount: 0 })
        .returning();
      await tx
        .insert(itineraryDays)
        .values(itinerary.map((day, i) => ({ ...day, tourId: tour.id, day: i + 1 })));
      await tx.insert(auditLogs).values({
        actorId: null,
        action: "tour.created",
        entityType: "tour",
        entityId: String(tour.id),
        details: { slug: tour.slug, via: "content-sync" },
      });
    }

    // Sanity check inside the transaction: everything we meant to add is there.
    if (newTours.length) {
      const added = await tx
        .select({ slug: tours.slug })
        .from(tours)
        .where(
          inArray(
            tours.slug,
            newTours.map((t) => t.slug),
          ),
        );
      if (added.length !== newTours.length) throw new Error("Not every new tour was inserted.");
    }
    return { newCredits, newDestinations, newTours };
  });

  const verb = apply ? "Added" : "Would add";
  console.log(
    `${verb} ${result.newDestinations.length} destinations, ${result.newTours.length} tours, ${result.newCredits.length} photo credits.`,
  );
  for (const d of result.newDestinations) console.log(`  destination ${d.slug}`);
  for (const t of result.newTours) console.log(`  tour        ${t.slug} (${t.destination})`);
  if (
    !apply &&
    (result.newTours.length || result.newDestinations.length || result.newCredits.length)
  ) {
    console.log("Dry run: nothing was written. Re-run with --apply.");
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
