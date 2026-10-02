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

## Rules

- Cultural facts must come from verifiable sources listed in `sources`.
- Do not invent named people, partner villages' agreements, awards or statistics.
- Respect communities: no photos where photography is prohibited (e.g. Baduy Dalam),
  no images of human remains or of sacred objects people asked not to photograph.
- Keep existing slugs, titles, prices and capacities stable (URLs and tests depend on them).

Validate before committing:

```bash
npx tsx scripts/content/validate.ts
```
