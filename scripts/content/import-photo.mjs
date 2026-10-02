#!/usr/bin/env node
/**
 * Imports a freely licensed photo into the repo as an optimized WebP and
 * records its attribution.
 *
 *   node scripts/content/import-photo.mjs <region> <destination-slug> <name> <source>
 *
 * <source> is either a Wikimedia Commons file title ("File:Foo.jpg") or an
 * images.unsplash.com URL. Output: public/images/content/<slug>/<name>.webp
 * (max 1440px wide, quality 70, metadata stripped) and an entry in
 * content/photos/<region>.json keyed by the public path.
 *
 * Only licenses that allow commercial reuse with attribution are accepted.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ALLOWED = [/^cc0/i, /^public domain/i, /^pd/i, /^cc by(-sa)? \d(\.\d)?/i, /^cc by(-sa)?$/i];
const UA = "EtnoJourneyContentImport/1.0 (+https://github.com/omanjaya/etnojourney.com)";

const [region, slug, name, source] = process.argv.slice(2);
if (!region || !slug || !name || !source) {
  console.error("usage: import-photo.mjs <region> <destination-slug> <name> <File:... | unsplash url>");
  process.exit(2);
}
if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9-]+$/.test(name)) {
  console.error("slug and name must be kebab-case");
  process.exit(2);
}

/**
 * Commons metadata (Artist, LicenseShortName) is HTML. Convert it to plain
 * text: strip tags until none remain (so nested fragments like "<scr<b>ipt>"
 * can't survive one pass), decode entities, then drop any stray angle brackets.
 */
export function htmlToText(html = "") {
  let text = String(html);
  for (let previous; previous !== text; ) {
    previous = text;
    text = text.replace(/<[^<>]*>/g, "");
  }
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;|&gt;/g, "")
    .replace(/&amp;/g, "&");
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}
const stripHtml = htmlToText;

async function fromCommons(title) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    format: "json",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata|mime",
    iiurlwidth: "2000",
  });
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  const page = Object.values((await res.json()).query.pages)[0];
  if (!page?.imageinfo) throw new Error(`Not found on Commons: ${title}`);
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!ALLOWED.some((re) => re.test(license))) throw new Error(`License not allowed: "${license}"`);
  if (!/image\/(jpeg|png|webp)/.test(info.mime)) throw new Error(`Unsupported type ${info.mime}`);
  return {
    downloadUrl: info.thumburl ?? info.url,
    credit: {
      title: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      author: stripHtml(meta.Artist?.value) || "Unknown",
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl,
      source: "Wikimedia Commons",
    },
  };
}

function fromUnsplash(url) {
  const u = new URL(url);
  if (u.hostname !== "images.unsplash.com") throw new Error("Only images.unsplash.com URLs");
  u.search = "?w=2000&q=85&auto=format&fit=crop&fm=jpg";
  return {
    downloadUrl: u.toString(),
    credit: {
      title: name,
      author: "Unsplash",
      license: "Unsplash License",
      licenseUrl: "https://unsplash.com/license",
      sourceUrl: `https://unsplash.com/photos/${u.pathname.replace(/^\/photo-/, "")}`,
      source: "Unsplash",
    },
  };
}

const { downloadUrl, credit } = source.startsWith("File:")
  ? await fromCommons(source)
  : fromUnsplash(source);

const res = await fetch(downloadUrl, { headers: { "User-Agent": UA } });
if (!res.ok) throw new Error(`Download failed ${res.status} ${downloadUrl}`);
const input = Buffer.from(await res.arrayBuffer());

const publicPath = `/images/content/${slug}/${name}.webp`;
const outFile = path.join("public", publicPath);
await mkdir(path.dirname(outFile), { recursive: true });
const out = await sharp(input)
  .rotate()
  // next/image re-encodes per viewport at request time, so the stored source
  // only needs to be good enough for the largest rendition (~1440px hero).
  .resize({ width: Number(process.env.WEBP_WIDTH ?? 1440), withoutEnlargement: true })
  .webp({ quality: Number(process.env.WEBP_QUALITY ?? 70), effort: 6 })
  .toFile(outFile); // sharp drops EXIF/GPS unless .withMetadata() is called

const creditsFile = path.join("content", "photos", `${region}.json`);
const credits = JSON.parse(await readFile(creditsFile, "utf8").catch(() => "{}"));
credits[publicPath] = { ...credit, width: out.width, height: out.height };
await writeFile(creditsFile, JSON.stringify(credits, null, 2) + "\n");

console.log(`${publicPath} ${out.width}x${out.height} ${(out.size / 1024).toFixed(0)}KB | ${credit.license} | ${credit.author}`);
