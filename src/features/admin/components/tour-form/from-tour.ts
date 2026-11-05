import type { Tour } from "@/server/db/schema";
import type { TourFormDefaults } from "./defaults";

type TourWithItinerary = Tour & {
  itinerary: { title: Tour["title"]; description: Tour["description"] }[];
};

/**
 * Form values for an existing tour. Shared by the edit page and "copy tour"
 * (new page with `?from=<id>`), so the two cannot drift apart.
 */
export function toTourFormDefaults(tour: TourWithItinerary): TourFormDefaults {
  return {
    slug: tour.slug,
    destinationId: tour.destinationId,
    title: tour.title,
    summary: tour.summary,
    description: tour.description,
    category: tour.category,
    durationDays: tour.durationDays,
    durationHours: tour.durationHours ?? "",
    pricePerPerson: tour.pricePerPerson,
    maxParticipants: tour.maxParticipants,
    meetingPoint: tour.meetingPoint,
    coverImage: tour.coverImage,
    gallery: tour.gallery,
    highlights: tour.highlights,
    included: tour.included,
    difficulty: tour.difficulty,
    notIncluded: tour.notIncluded,
    whatToBring: tour.whatToBring,
    etiquette: tour.etiquette,
    isPublished: tour.isPublished,
    isFeatured: tour.isFeatured,
    itinerary: tour.itinerary.map(({ title, description }) => ({ title, description })),
  };
}
