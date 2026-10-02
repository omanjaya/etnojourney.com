import type { LocalizedText } from "@/lib/i18n-text";
import type { TourCategory, TourDifficulty } from "@/server/db/schema";

export const emptyText = (): LocalizedText => ({ id: "", en: "" });

/** Editable shape: list fields are kept as raw multi-line text until submit. */
export type TourFormDefaults = {
  slug: string;
  destinationId: number | "";
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  category: TourCategory | "";
  durationDays: number | "";
  pricePerPerson: number | "";
  maxParticipants: number | "";
  meetingPoint: string;
  coverImage: string;
  gallery: string[];
  highlights: LocalizedText[];
  included: LocalizedText[];
  difficulty: TourDifficulty;
  notIncluded: LocalizedText[];
  whatToBring: LocalizedText[];
  etiquette: LocalizedText[];
  isPublished: boolean;
  isFeatured: boolean;
  itinerary: { title: LocalizedText; description: LocalizedText }[];
};

export const emptyTourDefaults: TourFormDefaults = {
  slug: "",
  destinationId: "",
  title: emptyText(),
  summary: emptyText(),
  description: emptyText(),
  category: "",
  durationDays: 1,
  pricePerPerson: "",
  maxParticipants: 10,
  meetingPoint: "",
  coverImage: "",
  gallery: [],
  highlights: [],
  included: [],
  difficulty: "easy",
  notIncluded: [],
  whatToBring: [],
  etiquette: [],
  isPublished: false,
  isFeatured: false,
  itinerary: [{ title: emptyText(), description: emptyText() }],
};

export type SetTourField = <K extends keyof TourFormDefaults>(
  key: K,
  value: TourFormDefaults[K],
) => void;

/** What every section receives from the orchestrating <TourForm>. */
export type TourSectionProps = {
  values: TourFormDefaults;
  set: SetTourField;
  /** First validation message for a field, if any. */
  err: (key: string) => string | undefined;
};
