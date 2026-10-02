/**
 * Editorial content (destinations, tours, photo credits) lives as JSON in
 * `content/` so it can be reviewed in pull requests and loaded by the seed.
 * See content/README.md for the authoring workflow.
 *
 * Plain Node module (no "server-only"): used by the seed and the validator.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const text = z.object({ id: z.string().min(1), en: z.string().min(1) });
const imagePath = z.string().regex(/^\/images\/content\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/, "must be /images/content/<slug>/<name>.webp");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const destinationContent = z.object({
  slug,
  name: z.string().min(2),
  province: z.string().min(2),
  tagline: text,
  description: text,
  heroImage: imagePath,
  gettingThere: text.optional(),
});

const reviewContent = z.object({
  authorName: z.string(),
  country: z.string(),
  rating: z.number().int().min(1).max(5),
  body: text,
});

export const tourContent = z
  .object({
    slug,
    destination: slug,
    category: z.enum(["ritual", "craft", "culinary", "village", "trekking"]),
    title: text,
    summary: text,
    description: text,
    durationDays: z.number().int().min(1).max(14),
    pricePerPerson: z.number().int().min(100_000),
    maxParticipants: z.number().int().min(2).max(20),
    coverImage: imagePath,
    gallery: z.array(imagePath).min(2).max(8),
    highlights: z.array(text).min(3).max(6),
    included: z.array(text).min(3).max(8),
    meetingPoint: z.string().min(3),
    difficulty: z.enum(["easy", "moderate", "challenging"]).default("easy"),
    notIncluded: z.array(text).max(6).default([]),
    whatToBring: z.array(text).max(8).default([]),
    etiquette: z.array(text).max(6).default([]),
    isFeatured: z.boolean().default(false),
    itinerary: z.array(z.object({ title: text, description: text })).min(1),
    /** Only for the original demo tours; new tours start without reviews. */
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().min(0).optional(),
    reviews: z.array(reviewContent).optional(),
  })
  .refine((t) => t.itinerary.length === t.durationDays, {
    message: "itinerary must have one entry per day",
    path: ["itinerary"],
  });

export const regionContent = z.object({
  region: z.string(),
  destinations: z.array(destinationContent),
  tours: z.array(tourContent),
  /** Research sources for the cultural facts (URLs), reviewed by humans. */
  sources: z.array(z.string().url()).min(1),
});

export const photoCredit = z.object({
  title: z.string(),
  author: z.string(),
  license: z.string(),
  licenseUrl: z.string().nullable(),
  sourceUrl: z.string().url(),
  source: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});

export type DestinationContent = z.infer<typeof destinationContent>;
export type TourContent = z.infer<typeof tourContent>;
export type PhotoCredit = z.infer<typeof photoCredit>;

export type Content = {
  destinations: DestinationContent[];
  tours: TourContent[];
  credits: Record<string, PhotoCredit>;
};

async function readJsonDir<T>(dir: string, schema: z.ZodType<T>): Promise<Array<{ file: string; data: T }>> {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => {
      const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`${dir}/${file}:\n${z.prettifyError(parsed.error)}`);
      }
      return { file, data: parsed.data };
    }),
  );
}

/**
 * Loads and cross-checks all content. Throws with every problem listed, so the
 * seed never writes half-valid data.
 */
export async function loadContent(root = process.cwd()): Promise<Content> {
  const regions = await readJsonDir(path.join(root, "content/regions"), regionContent);
  const creditFiles = await readJsonDir(path.join(root, "content/photos"), z.record(z.string(), photoCredit));

  const destinations = regions.flatMap((r) => r.data.destinations);
  const tours = regions.flatMap((r) => r.data.tours);
  const credits = Object.assign({}, ...creditFiles.map((c) => c.data)) as Record<string, PhotoCredit>;

  const problems: string[] = [];
  const dupes = (items: string[]) => items.filter((v, i) => items.indexOf(v) !== i);
  for (const d of dupes(destinations.map((d) => d.slug))) problems.push(`duplicate destination slug: ${d}`);
  for (const t of dupes(tours.map((t) => t.slug))) problems.push(`duplicate tour slug: ${t}`);

  const destinationSlugs = new Set(destinations.map((d) => d.slug));
  const images = new Set<string>();
  for (const d of destinations) images.add(d.heroImage);
  for (const t of tours) {
    if (!destinationSlugs.has(t.destination)) problems.push(`tour ${t.slug}: unknown destination ${t.destination}`);
    images.add(t.coverImage);
    t.gallery.forEach((g) => images.add(g));
  }
  for (const image of images) {
    if (!credits[image]) problems.push(`missing credit for ${image}`);
    const exists = await stat(path.join(root, "public", image)).then(() => true, () => false);
    if (!exists) problems.push(`missing file public${image}`);
  }

  if (problems.length) throw new Error(`Content problems:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  return { destinations, tours, credits };
}
