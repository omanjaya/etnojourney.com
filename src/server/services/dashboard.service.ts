import "server-only";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { tourRepository } from "@/server/repositories/tour.repository";

export const dashboardService = {
  async overview() {
    const [stats, publishedTours, recent] = await Promise.all([
      bookingRepository.stats(),
      tourRepository.countPublished(),
      bookingRepository.listAll().limit(6),
    ]);
    return { ...stats, publishedTours, recent };
  },
};
