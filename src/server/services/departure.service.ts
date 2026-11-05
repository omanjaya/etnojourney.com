import "server-only";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { mailer } from "@/server/mail/mailer";
import type { EmailTranslator } from "@/server/mail/templates";
import { departureManifestEmail } from "@/server/mail/templates/departure";
import { closureRepository } from "@/server/repositories/closure.repository";
import {
  departureRepository,
  type DepartureFilters,
} from "@/server/repositories/departure.repository";
import { auditService } from "./audit.service";
import { closureDuring, tripEndDate } from "./availability.rules";
import { DomainError } from "./errors";
import {
  capacityLoad,
  departureEntityId,
  groupByDate,
  historyGuideId,
  lastAssignment,
  manifestTotals,
  needsGuide,
  needsGuideOn,
  needsGuideWindow,
  sortManifest,
  suggestGuides,
} from "./departure.rules";
import { businessToday } from "./self-service.rules";

export type { BusyDeparture, DepartureFilters } from "@/server/repositories/departure.repository";

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
  /**
   * Agenda rows grouped by date, each with its capacity load, guide state and
   * whether a day of the trip is closed. Past departures stay listed as a
   * record, but only today and later can "need a guide" (Asia/Jakarta).
   */
  async agenda(filters: DepartureFilters, now: Date = new Date()) {
    const today = businessToday(now);
    // "Without a guide" is a to-do list: past departures are history, not work.
    const query =
      filters.withoutGuide && filters.from < today ? { ...filters, from: today } : filters;
    const rows = query.from > query.to ? [] : await departureRepository.agenda(query);
    const lastDay = rows.reduce((last, row) => {
      const end = tripEndDate(row.date, row.durationDays);
      return end > last ? end : last;
    }, query.to);
    const closures = rows.length
      ? await closureRepository.listInRange(query.tourId ?? null, query.from, lastDay)
      : [];
    const departures = rows.map((row) => {
      const closure = closureDuring(
        closures,
        row.tourId,
        row.date,
        tripEndDate(row.date, row.durationDays),
      );
      return {
        ...row,
        load: capacityLoad(row.confirmed, row.pending, row.capacity),
        needsGuide: needsGuideOn(row, today),
        closed: closure ? { reason: closure.reason } : null,
      };
    });
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
    const end = tripEndDate(key.date, tour.durationDays);
    const [current, rows, history, closures] = await Promise.all([
      departureRepository.findAssignment(key.tourId, key.date),
      departureRepository.listManifest(key.tourId, key.date),
      auditService.historyOf("departure", departureEntityId(key.tourId, key.date)),
      closureRepository.listInRange(key.tourId, key.date, end),
    ]);
    const assignment = current?.assignment ?? null;
    const guide = current?.guide?.id ? current.guide : null;
    // History names the guide each entry is about (stored ids, so renamed and
    // unassigned guides read correctly too).
    const historyGuideIds = new Set<number>();
    for (const { log } of history) {
      const id = historyGuideId(log.action, log.details);
      if (id !== null) historyGuideIds.add(id);
    }
    const [guideOptions, guideNames] = await Promise.all([
      departureRepository.listGuideOptions(tour.destinationId, guide?.id ?? null, {
        tourId: key.tourId,
        date: key.date,
        end,
      }),
      departureRepository.guideNames([...historyGuideIds]),
    ]);
    const manifest = sortManifest(rows);
    const totals = manifestTotals(manifest);
    const closure = closureDuring(closures, key.tourId, key.date, end);
    return {
      tour,
      assignment,
      guide,
      /** Who assigned the current guide, and when (not later note or send edits). */
      assignedBy: guide ? lastAssignment(history) : null,
      manifest,
      totals,
      load: capacityLoad(totals.confirmedParticipants, totals.pendingParticipants, tour.capacity),
      needsGuide: needsGuide({ guideId: guide?.id ?? null, guideActive: guide?.isActive }),
      guideOptions: suggestGuides(guideOptions),
      /** A day of the trip that an admin closed; its bookings are kept. */
      closure: closure ? { date: closure.date, reason: closure.reason } : null,
      history: history.map((entry) => {
        const guideId = historyGuideId(entry.log.action, entry.log.details);
        return { ...entry, guideName: guideId === null ? null : (guideNames.get(guideId) ?? null) };
      }),
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

      // A new (or no) guide has not received this manifest: show it as not sent.
      await departureRepository.upsert(tx, key, { guideId, assignedBy: actorId, notifiedAt: null });
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
