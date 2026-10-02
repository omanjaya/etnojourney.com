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
