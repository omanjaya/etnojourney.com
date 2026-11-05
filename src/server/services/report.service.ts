import "server-only";
import type { LocalizedText } from "@/lib/i18n-text";
import { bookingStatus, type BookingStatus } from "@/server/db/schema";
import { reportRepository } from "@/server/repositories/report.repository";
import {
  averageGroupSize,
  buildMonthSeries,
  buildTourRows,
  periodBounds,
  type ReportPeriod,
} from "./report.rules";

export type TourTitle = { slug: string; title: LocalizedText };

/**
 * Revenue model:
 * - gross   = payments that were paid in the period (status `paid`, or `refunded`
 *             later), bucketed by `paid_at` in Asia/Jakarta;
 * - refunds = payments with status `refunded`, bucketed by when the refund was
 *             recorded (`refunded_at`);
 * - net     = gross - refunds.
 * Bookings, statuses and group sizes count bookings created in the period.
 */
export const reportService = {
  async overview(period: ReportPeriod) {
    const range = periodBounds(period);
    const [
      grossMonth,
      refundMonth,
      bookingMonth,
      statuses,
      bookingTour,
      grossTour,
      refundTour,
      refunds,
    ] = await Promise.all([
      reportRepository.grossByMonth(range),
      reportRepository.refundsByMonth(range),
      reportRepository.bookingsByMonth(range),
      reportRepository.bookingsByStatus(range),
      reportRepository.bookingsByTour(range),
      reportRepository.grossByTour(range),
      reportRepository.refundsByTour(range),
      reportRepository.refundTotals(range),
    ]);

    const tourIds = [
      ...new Set([...bookingTour, ...grossTour, ...refundTour].map((row) => row.tourId)),
    ];
    const titles = new Map(
      (await reportRepository.tourTitles(tourIds)).map((t) => [
        t.id,
        { slug: t.slug, title: t.title } satisfies TourTitle,
      ]),
    );

    const months = buildMonthSeries(period, {
      gross: grossMonth,
      refunds: refundMonth,
      bookings: bookingMonth,
    });
    const tours = buildTourRows(titles, {
      bookings: bookingTour,
      gross: grossTour,
      refunds: refundTour,
    });

    const byStatus = Object.fromEntries(
      bookingStatus.enumValues.map((status) => [
        status,
        statuses.find((s) => s.status === status)?.bookings ?? 0,
      ]),
    ) as Record<BookingStatus, number>;
    const totalBookings = statuses.reduce((sum, s) => sum + s.bookings, 0);
    const totalParticipants = statuses.reduce((sum, s) => sum + s.participants, 0);
    const gross = months.reduce((sum, m) => sum + m.gross, 0);

    return {
      period,
      totals: {
        gross,
        refunds: refunds.amount,
        refundCount: refunds.count,
        net: gross - refunds.amount,
        bookings: totalBookings,
        participants: totalParticipants,
        averageGroupSize: averageGroupSize(totalBookings, totalParticipants),
      },
      byStatus,
      months,
      tours,
    };
  },

  /** Rows for the per-tour CSV export (only the per-tour queries). */
  async tourRows(period: ReportPeriod) {
    const range = periodBounds(period);
    const [bookings, gross, refunds] = await Promise.all([
      reportRepository.bookingsByTour(range),
      reportRepository.grossByTour(range),
      reportRepository.refundsByTour(range),
    ]);
    const ids = [...new Set([...bookings, ...gross, ...refunds].map((row) => row.tourId))];
    const titles = new Map(
      (await reportRepository.tourTitles(ids)).map((t) => [
        t.id,
        { slug: t.slug, title: t.title } satisfies TourTitle,
      ]),
    );
    return buildTourRows(titles, { bookings, gross, refunds });
  },

  countRefundsRequired: () => reportRepository.countRefundsRequired(),
};

export type ReportOverview = Awaited<ReturnType<typeof reportService.overview>>;
