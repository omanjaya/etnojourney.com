import "server-only";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { reportRepository } from "@/server/repositories/report.repository";
import { tourRepository } from "@/server/repositories/tour.repository";

export const dashboardService = {
  /**
   * Overview figures. `refundsNeeded` is only counted for users who can record
   * refunds (null otherwise), so staff never load payment work they can't act on.
   */
  async overview(options: { withRefunds?: boolean } = {}) {
    const [stats, publishedTours, recent, refundsNeeded] = await Promise.all([
      bookingRepository.stats(),
      tourRepository.countPublished(),
      bookingRepository.listAll().limit(6),
      options.withRefunds ? reportRepository.countRefundsRequired() : Promise.resolve(null),
    ]);
    return { ...stats, publishedTours, recent, refundsNeeded };
  },
};
