import "server-only";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { reportRepository } from "@/server/repositories/report.repository";
import { tourRepository } from "@/server/repositories/tour.repository";
import { periodBounds, resolvePeriod } from "./report.rules";

const sum = (rows: { amount: number }[]) => rows.reduce((total, row) => total + row.amount, 0);

/** Same model as /admin/reports: money received this month, net of refunds. */
async function revenueThisMonth(): Promise<number> {
  const month = periodBounds(resolvePeriod({ period: "this-month" }));
  const [gross, refunds] = await Promise.all([
    reportRepository.grossByMonth(month),
    reportRepository.refundsByMonth(month),
  ]);
  return sum(gross) - sum(refunds);
}

export const dashboardService = {
  /**
   * Overview figures. `refundsNeeded` is only counted for users who can record
   * refunds (null otherwise), so staff never load payment work they can't act on.
   */
  async overview(options: { withRefunds?: boolean; withRevenue?: boolean } = {}) {
    const [stats, publishedTours, recent, refundsNeeded] = await Promise.all([
      bookingRepository.stats(),
      tourRepository.countPublished(),
      bookingRepository.listAll().limit(6),
      options.withRefunds ? reportRepository.countRefundsRequired() : Promise.resolve(null),
    ]);
    return {
      ...stats,
      revenue: options.withRevenue ? await revenueThisMonth() : null,
      publishedTours,
      recent,
      refundsNeeded,
    };
  },
};
