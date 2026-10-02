import type { Locale } from "@/i18n/routing";

/**
 * Official English names of Indonesia's 38 provinces, keyed by the Indonesian
 * name stored in the database. Pure and client-safe.
 */
const ENGLISH: Record<string, string> = {
  aceh: "Aceh",
  "sumatera utara": "North Sumatra",
  "sumatera barat": "West Sumatra",
  riau: "Riau",
  "kepulauan riau": "Riau Islands",
  jambi: "Jambi",
  "sumatera selatan": "South Sumatra",
  "kepulauan bangka belitung": "Bangka Belitung Islands",
  bengkulu: "Bengkulu",
  lampung: "Lampung",
  "dki jakarta": "Jakarta",
  "jawa barat": "West Java",
  banten: "Banten",
  "jawa tengah": "Central Java",
  "di yogyakarta": "Special Region of Yogyakarta",
  "jawa timur": "East Java",
  bali: "Bali",
  "nusa tenggara barat": "West Nusa Tenggara",
  "nusa tenggara timur": "East Nusa Tenggara",
  "kalimantan barat": "West Kalimantan",
  "kalimantan tengah": "Central Kalimantan",
  "kalimantan selatan": "South Kalimantan",
  "kalimantan timur": "East Kalimantan",
  "kalimantan utara": "North Kalimantan",
  "sulawesi utara": "North Sulawesi",
  gorontalo: "Gorontalo",
  "sulawesi tengah": "Central Sulawesi",
  "sulawesi barat": "West Sulawesi",
  "sulawesi selatan": "South Sulawesi",
  "sulawesi tenggara": "Southeast Sulawesi",
  maluku: "Maluku",
  "maluku utara": "North Maluku",
  papua: "Papua",
  "papua barat": "West Papua",
  "papua barat daya": "Southwest Papua",
  "papua tengah": "Central Papua",
  "papua pegunungan": "Highland Papua",
  "papua selatan": "South Papua",
};

const ALIASES: Record<string, string> = {
  "daerah istimewa yogyakarta": "di yogyakarta",
  yogyakarta: "di yogyakarta",
  jakarta: "dki jakarta",
  "daerah khusus ibukota jakarta": "dki jakarta",
  "bangka belitung": "kepulauan bangka belitung",
};

/** Province name for display; unknown names are returned unchanged. */
export function provinceLabel(province: string, locale: Locale): string {
  if (locale === "id") return province;
  const key = province.trim().toLowerCase().replace(/\s+/g, " ");
  return ENGLISH[ALIASES[key] ?? key] ?? province;
}

export const PROVINCE_COUNT = Object.keys(ENGLISH).length;
