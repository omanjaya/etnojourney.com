import "server-only";
import { isoDateFromToday } from "@/lib/format";
import { partnerRepository } from "@/server/repositories/partner.repository";
import { inPartnerWindow, PARTNER_PAST_DAYS } from "./guide.rules";

/**
 * Partner portal reads. Callers pass the signed-in user's id (never a guide id
 * from the request): the guide is resolved from the account here, and every
 * read below is filtered by that guide in SQL. An inactive guide sees no
 * departures.
 */
async function activeGuideFor(userId: string) {
  const guide = await partnerRepository.findGuideByUserId(userId);
  return guide?.isActive ? guide : null;
}

export const partnerService = {
  /** Profile plus upcoming and recent (last 60 days) departures, in Asia/Jakarta days. */
  async overview(userId: string) {
    const guide = await partnerRepository.findGuideByUserId(userId);
    if (!guide || !guide.isActive) return { guide: guide ?? null, upcoming: [], past: [] };
    const today = isoDateFromToday(0);
    const [upcoming, past] = await Promise.all([
      partnerRepository.listUpcoming(guide.id, today),
      partnerRepository.listPast(guide.id, isoDateFromToday(-PARTNER_PAST_DAYS), today),
    ]);
    return { guide, upcoming, past };
  },

  /**
   * One departure and its partner-safe manifest, or null when it is not
   * assigned to this partner's guide (or is older than the portal window).
   */
  async departure(userId: string, tourId: number, date: string) {
    if (!inPartnerWindow(date, isoDateFromToday(-PARTNER_PAST_DAYS))) return null;
    const guide = await activeGuideFor(userId);
    if (!guide) return null;
    const departure = await partnerRepository.findDeparture(guide.id, tourId, date);
    if (!departure) return null;
    const travellers = await partnerRepository.listManifest(guide.id, tourId, date);
    return { guide, departure, travellers };
  },
};
