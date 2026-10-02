/**
 * Validates content/ (schema, slugs, photo files and credits).
 *   npx tsx scripts/content/validate.ts
 */
import { loadContent } from "../../src/server/db/content";

loadContent()
  .then((c) => {
    const photos = Object.keys(c.credits).length;
    console.log(`OK: ${c.destinations.length} destinations, ${c.tours.length} tours, ${photos} credited photos`);
  })
  .catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
