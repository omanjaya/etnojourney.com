import "server-only";
import { wishlistRepository } from "@/server/repositories/wishlist.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { DomainError } from "./errors";

export const wishlistService = {
  /**
   * Returns the new saved state. Unpublished tours can't be added (that would
   * reveal they exist), but one already saved can still be removed.
   */
  async toggle(userId: string, tourId: number): Promise<boolean> {
    const [tour, saved] = await Promise.all([
      tourRepository.findById(tourId),
      wishlistRepository.exists(userId, tourId),
    ]);
    if (!tour || (!tour.isPublished && !saved)) throw new DomainError("notFound");
    if (saved) {
      await wishlistRepository.remove(userId, tourId);
      return false;
    }
    await wishlistRepository.add(userId, tourId);
    return true;
  },

  tourIds: (userId: string) => wishlistRepository.tourIdsForUser(userId),

  list: (userId: string) => wishlistRepository.listForUser(userId),
};
