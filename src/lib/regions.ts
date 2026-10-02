/**
 * Groups destinations by island for browsing. Pure and client-safe.
 * Matching uses province keywords so destinations added later in the admin
 * (any of Indonesia's provinces) land in the right group automatically.
 */
export const ISLANDS = [
  "bali",
  "nusa-tenggara",
  "jawa",
  "sumatra",
  "sulawesi",
  "kalimantan",
  "maluku-papua",
  "other",
] as const;

export type Island = (typeof ISLANDS)[number];

const RULES: [Island, RegExp][] = [
  ["nusa-tenggara", /nusa tenggara/],
  ["bali", /\bbali\b/],
  ["jawa", /\bjawa\b|java|jakarta|yogyakarta|banten/],
  ["sumatra", /sumatera|sumatra|aceh|riau|jambi|bengkulu|lampung|bangka|belitung/],
  ["kalimantan", /kalimantan/],
  ["sulawesi", /sulawesi|gorontalo/],
  ["maluku-papua", /maluku|papua/],
];

export function islandOf(province: string): Island {
  const value = province.toLowerCase();
  return RULES.find(([, pattern]) => pattern.test(value))?.[0] ?? "other";
}

/** Splits items into island groups in a fixed, geographic order (empty groups omitted). */
export function groupByIsland<T>(items: T[], provinceOf: (item: T) => string) {
  const groups = new Map<Island, T[]>();
  for (const item of items) {
    const island = islandOf(provinceOf(item));
    groups.set(island, [...(groups.get(island) ?? []), item]);
  }
  return ISLANDS.filter((island) => groups.has(island)).map((island) => ({
    island,
    items: groups.get(island)!,
  }));
}

/** Islands a traveller can filter by (excludes the "other" bucket). */
export const FILTERABLE_ISLANDS = ISLANDS.filter(
  (island): island is Exclude<Island, "other"> => island !== "other",
);
export type FilterableIsland = (typeof FILTERABLE_ISLANDS)[number];

/**
 * The same province rules as `islandOf`, as PostgreSQL `~*` patterns (POSIX
 * regex has no `\b`, and these keywords don't need it). Listed in the same
 * priority order: an island matches when its pattern matches and no earlier
 * one does, so "Nusa Tenggara Barat" never counts as Bali.
 */
export const ISLAND_SQL_PATTERNS: [FilterableIsland, string][] = [
  ["nusa-tenggara", "nusa tenggara"],
  ["bali", "bali"],
  ["jawa", "jawa|java|jakarta|yogyakarta|banten"],
  ["sumatra", "sumatera|sumatra|aceh|riau|jambi|bengkulu|lampung|bangka|belitung"],
  ["kalimantan", "kalimantan"],
  ["sulawesi", "sulawesi|gorontalo"],
  ["maluku-papua", "maluku|papua"],
];

export function isFilterableIsland(value: string): value is FilterableIsland {
  return (FILTERABLE_ISLANDS as readonly string[]).includes(value);
}

/** Free-text aliases (Indonesian and English) for whole island groups. */
const ISLAND_ALIASES: [RegExp, FilterableIsland[]][] = [
  [/\bbali\b/, ["bali"]],
  [/\b(jawa|java)\b/, ["jawa"]],
  [/\b(sumatra|sumatera)\b/, ["sumatra"]],
  [/\b(sulawesi|celebes)\b/, ["sulawesi"]],
  [/\b(kalimantan|borneo)\b/, ["kalimantan"]],
  [/\b(nusa tenggara|lesser sunda)/, ["nusa-tenggara"]],
  [
    /\b(eastern indonesia|east indonesia|indonesia timur|timur indonesia|indonesia bagian timur)\b/,
    ["nusa-tenggara", "sulawesi", "maluku-papua"],
  ],
];

/** Province keywords for regions that are part of a larger island group. */
const PROVINCE_ALIASES: [RegExp, string][] = [
  [/\b(maluku|moluccas|spice islands)\b/, "maluku"],
  [/\bpapua\b/, "papua"],
];

/**
 * Regions a free-text query refers to: whole islands (e.g. "Java" → Jawa,
 * "eastern Indonesia" → Nusa Tenggara + Sulawesi + Maluku & Papua) and
 * province keywords for narrower names ("Papua" stays Papua, not Maluku).
 */
export function regionsInQuery(query: string): {
  islands: FilterableIsland[];
  provinces: string[];
} {
  const text = query.toLowerCase().replace(/\s+/g, " ").trim();
  const islands = new Set<FilterableIsland>();
  for (const [pattern, matched] of ISLAND_ALIASES) {
    if (pattern.test(text)) matched.forEach((island) => islands.add(island));
  }
  const provinces = PROVINCE_ALIASES.filter(([pattern]) => pattern.test(text)).map(([, p]) => p);
  return { islands: [...islands], provinces };
}
