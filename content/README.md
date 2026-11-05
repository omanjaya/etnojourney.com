# Content

Destinations, tours and photo credits used by the seed (`npm run db:seed`).

- `regions/<region>.json`: destinations, tours and the research `sources` for one region
  (schema: `src/server/db/content.ts`). Bilingual fields are `{ "id": "...", "en": "..." }`.
- `photos/<region>.json`: attribution for every image, keyed by its public path.
- Images: `public/images/content/<destination-slug>/<name>.webp`.

## Adding a photo

Only freely licensed photos (CC0, public domain, CC BY, CC BY-SA, Unsplash License):

```bash
node scripts/content/import-photo.mjs <region> <destination-slug> <name> "File:Some photo.jpg"
node scripts/content/import-photo.mjs <region> <destination-slug> <name> https://images.unsplash.com/photo-...
```

The script checks the license, converts to WebP (1440px, q70, metadata stripped) and records
author, license and source. Credits are shown on the site, which CC BY / BY-SA require.

### Temporary AI placeholders

When a partner's real photos are not ready yet, an AI-generated image may stand in. Credit it
with author `AI illustration`, license `Placeholder, not the real place` and the generator as
source, so visitors can tell it is not a photo of the place. Replace it with a real photo (same
file name, updated credit) as soon as one arrives. Never depict sacred objects or named sites
as if photographed. The Kenderan & Manuaba tours use placeholders (`kenderan-manuaba/`).

## Rules

- Cultural facts must come from verifiable sources listed in `sources`.
- Do not invent named people, partner villages' agreements, awards or statistics.
- Respect communities: no photos where photography is prohibited (e.g. Baduy Dalam),
  no images of human remains or of sacred objects people asked not to photograph.
- Keep existing slugs, titles, prices and capacities stable (URLs and tests depend on them).
- Same-day tours shorter than a full day set `durationHours` (with `durationDays: 1`); the site
  then shows "2 jam" instead of "1 hari".

Validate before committing:

```bash
npx tsx scripts/content/validate.ts
```

## Publishing to production

The seed resets the catalogue, so it cannot run on a database with bookings. After the change is
deployed (the container applies migrations on start), add the new entries with the insert-only
sync, through the SSH tunnel described in `deploy/README.md`:

```bash
DATABASE_URL=postgres://... npx tsx scripts/content/sync.ts          # dry run: lists what is new
DATABASE_URL=postgres://... npx tsx scripts/content/sync.ts --apply  # inserts it
```

It only adds destinations, tours (by slug) and photo credits (by path) that are missing; it never
changes or deletes existing rows, so edits made in the back office are kept. Changes to existing
tours are made in the back office.
