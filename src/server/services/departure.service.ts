import "server-only";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { mailer } from "@/server/mail/mailer";
import type { EmailTranslator } from "@/server/mail/templates";
import { departureManifestEmail } from "@/server/mail/templates/departure";
import {
  departureRepository,
  type DepartureFilters,
} from "@/server/repositories/departure.repository";
import { auditService } from "./audit.service";
import { DomainError } from "./errors";
import {
  capacityLoad,
  departureEntityId,
  groupByDate,
  manifestTotals,
  needsGuide,
  needsGuideWindow,
  sortManifest,
  suggestGuides,
} from "./departure.rules";
import { businessToday } from "./self-service.rules";

export type { DepartureFilters } from "@/server/repositories/departure.repository";

/** A departure is identified by its tour and travel date (YYYY-MM-DD). */
export type DepartureKey = { tourId: number; date: string };

/** Manifest email goes out in Indonesian: guides are local partners. */
const MANIFEST_LOCALE = "id" as const;

async function loadTour(tourId: number) {
  const tour = await departureRepository.findTour(tourId);
  if (!tour) throw new DomainError("notFound");
  return tour;
}

export const departureService = {
  /** Agenda rows grouped by date, each with its capacity load and guide state. */
  async agenda(filters: DepartureFilters) {
    const rows = await departureRepository.agenda(filters);
    const departures = rows.map((row) => ({
      ...row,
      load: capacityLoad(row.confirmed, row.pending, row.capacity),
      needsGuide: needsGuide(row),
    }));
    return {
      groups: groupByDate(departures),
      total: departures.length,
      withoutGuide: departures.filter((d) => d.needsGuide).length,
    };
  },

  listTourOptions: () => departureRepository.listTourOptions(),

  /** Dashboard queue: departures in the next seven days (Asia/Jakarta) without a guide. */
  countNeedingGuideSoon(now: Date = new Date()) {
    const window = needsGuideWindow(businessToday(now));
    return departureRepository.countDepartures({ ...window, withoutGuide: true });
  },

  /** Everything the departure page shows. Throws `notFound` for an unknown tour. */
  async detail(key: DepartureKey) {
    const tour = await loadTour(key.tourId);
    const [current, rows, history] = await Promise.all([
      departureRepository.findAssignment(key.tourId, key.date),
      departureRepository.listManifest(key.tourId, key.date),
      auditService.historyOf("departure", departureEntityId(key.tourId, key.date)),
    ]);
    const assignment = current?.assignment ?? null;
    const guide = current?.guide?.id ? current.guide : null;
    const guideOptions = await departureRepository.listGuideOptions(
      tour.destinationId,
      guide?.id ?? null,
    );
    const manifest = sortManifest(rows);
    const totals = manifestTotals(manifest);
    return {
      tour,
      assignment,
      guide,
      assignedByName: current?.assignedByName ?? null,
      manifest,
      totals,
      load: capacityLoad(totals.confirmedParticipants, totals.pendingParticipants, tour.capacity),
      needsGuide: needsGuide({ guideId: guide?.id ?? null, guideActive: guide?.isActive }),
      guideOptions: suggestGuides(guideOptions),
      history,
    };
  },

  /** CSV export: the tour and its travelling bookings in manifest order (no cancelled). */
  async exportManifest(key: DepartureKey) {
    const [tour, rows] = await Promise.all([
      loadTour(key.tourId),
      departureRepository.listManifest(key.tourId, key.date),
    ]);
    return { tour, rows: sortManifest(rows).filter((row) => row.status !== "cancelled") };
  },

  /**
   * Assigns (`guideId`) or unassigns (null) the departure's guide. The change
   * and its audit entry are written in one transaction; re-saving the same
   * guide is a no-op.
   */
  async assignGuide(actorId: string, key: DepartureKey, guideId: number | null) {
    await loadTour(key.tourId);
    return db.transaction(async (tx) => {
      const guide = guideId === null ? null : await departureRepository.findGuide(guideId, tx);
      if (guideId !== null && !guide?.isActive) throw new DomainError("guideUnavailable");

      const existing = await departureRepository.findAssignmentForUpdate(tx, key.tourId, key.date);
      const previousGuideId = existing?.guideId ?? null;
      if (previousGuideId === guideId) return { changed: false };
      // Nothing to unassign and no row yet: don't create an empty one.
      if (guideId === null && !existing) return { changed: false };

      await departureRepository.upsert(tx, key, { guideId, assignedBy: actorId });
      await auditService.record(
        {
          actorId,
          action: guideId === null ? "departure.unassigned" : "departure.assigned",
          entityType: "departure",
          entityId: departureEntityId(key.tourId, key.date),
          details: {
            tourId: key.tourId,
            date: key.date,
            guideId,
            guideName: guide?.name ?? null,
            previousGuideId,
          },
        },
        tx,
      );
      return { changed: true };
    });
  },

  /** Saves (or clears, with null) the operational note shared with the guide. */
  async saveNote(actorId: string, key: DepartureKey, note: string | null) {
    await loadTour(key.tourId);
    return db.transaction(async (tx) => {
      const existing = await departureRepository.findAssignmentForUpdate(tx, key.tourId, key.date);
      const previous = existing?.note ?? null;
      if (previous === note) return { changed: false };
      if (note === null && !existing) return { changed: false };

      await departureRepository.upsert(tx, key, { note });
      await auditService.record(
        {
          actorId,
          action: "departure.noted",
          entityType: "departure",
          entityId: departureEntityId(key.tourId, key.date),
          details: {
            tourId: key.tourId,
            date: key.date,
            cleared: note === null,
            length: note?.length ?? 0,
          },
        },
        tx,
      );
      return { changed: true };
    });
  },

  /**
   * Emails the manifest (no prices, no payment details) to the assigned guide
   * in Indonesian, then records `notifiedAt` and the audit entry together.
   */
  async sendManifest(actorId: string, key: DepartureKey) {
    const detail = await departureService.detail(key);
    const { guide, tour, assignment, totals } = detail;
    if (!guide || !guide.isActive) throw new DomainError("guideMissing");
    if (!guide.email) throw new DomainError("guideNoEmail");
    const travelling = detail.manifest.filter((row) => row.status !== "cancelled");
    if (travelling.length === 0) throw new DomainError("departureEmpty");

    const [emails, common] = await Promise.all([
      getTranslations({ locale: MANIFEST_LOCALE, namespace: "emails" }),
      getTranslations({ locale: MANIFEST_LOCALE, namespace: "common" }),
    ]);
    const t: EmailTranslator = (k, values) => emails(k as never, values as never);
    const email = departureManifestEmail(t, {
      guideName: guide.name,
      tourTitle: localize(tour.title, MANIFEST_LOCALE),
      destination: tour.destinationName,
      travelDate: formatDate(key.date, MANIFEST_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      meetingPoint: tour.meetingPoint,
      note: assignment?.note ?? null,
      totalParticipants: common("people", { count: totals.participants }),
      bookingCount: totals.bookings,
      rows: travelling.map((row) => ({
        code: row.code,
        contactName: row.contactName,
        contactPhone: row.contactPhone,
        participants: common("people", { count: row.participants }),
        notes: row.notes,
        pending: row.status === "pending",
      })),
    });
    await mailer.send({
      to: guide.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await db.transaction(async (tx) => {
      await departureRepository.upsert(tx, key, { notifiedAt: new Date() });
      await auditService.record(
        {
          actorId,
          action: "departure.notified",
          entityType: "departure",
          entityId: departureEntityId(key.tourId, key.date),
          details: {
            tourId: key.tourId,
            date: key.date,
            guideId: guide.id,
            email: guide.email,
            bookings: totals.bookings,
            participants: totals.participants,
          },
        },
        tx,
      );
    });
    return { email: guide.email };
  },
};
