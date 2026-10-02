import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  TriangleAlert,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { whatsAppLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CapacityBar } from "@/features/admin-departures/components/capacity-bar";
import { DepartureNoteForm } from "@/features/admin-departures/components/departure-note-form";
import { GuideAssignmentForm } from "@/features/admin-departures/components/guide-assignment-form";
import { ManifestTable } from "@/features/admin-departures/components/manifest-table";
import { PrintManifestButton } from "@/features/admin-departures/components/print-manifest-button";
import { SendManifestButton } from "@/features/admin-departures/components/send-manifest-button";
import { parseDepartureParams } from "@/features/admin-departures/schemas";
import { requireAdmin } from "@/server/auth/guards";
import { guideWhatsAppNumber } from "@/server/services/departure.rules";
import { departureService, type DepartureKey } from "@/server/services/departure.service";
import { isDomainError } from "@/server/services/errors";

/**
 * Print view: the admin sidebar and mobile bar live in the layout, so they are
 * hidden here for print only. Rules are scoped to the page's marker because
 * React keeps hoisted <style> tags after navigating away.
 */
const SCOPE = "body:has([data-print-manifest])";
const PRINT_CSS = `@media print {
  ${SCOPE} aside, ${SCOPE} header, ${SCOPE} [data-print-hide] { display: none !important; }
  ${SCOPE}, ${SCOPE} main#main > *, ${SCOPE} .bg-sand-50 { background: #fff !important; }
  ${SCOPE} main#main { padding: 0 !important; }
  ${SCOPE} :has(> main#main) { display: block !important; }
  ${SCOPE} [data-print-manifest] * { animation: none !important; opacity: 1 !important; translate: none !important; }
  ${SCOPE} [data-print-manifest] .grid { display: block !important; }
}`;

const stamp: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

async function loadDeparture(params: { tourId: string; date: string }) {
  const key = parseDepartureParams(params);
  if (!key) notFound();
  try {
    return { key, detail: await departureService.detail(key) };
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/departures/[tourId]/[date]">): Promise<Metadata> {
  const { date } = await params;
  const t = await getTranslations("adminDepartures.detail");
  return { title: t("metaTitle", { date }), robots: { index: false, follow: false } };
}

export default async function AdminDepartureDetailPage({
  params,
}: PageProps<"/[locale]/admin/departures/[tourId]/[date]">) {
  // Pages guard themselves: Next.js can render a page without its layout.
  await requireAdmin("departures.manage");
  const { key, detail } = await loadDeparture(await params);
  const [locale, t, tId, tc, tActions] = await Promise.all([
    getLocale(),
    getTranslations("adminDepartures"),
    // The WhatsApp message goes to a local guide: always Indonesian, like the email.
    getTranslations({ locale: "id", namespace: "adminDepartures" }),
    getTranslations("common"),
    getTranslations("adminUsers.activity.actions"),
  ]);

  const { tour, guide, assignment, totals, load, manifest } = detail;
  const tourTitle = localize(tour.title, locale);
  const longDate = formatDate(key.date, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const activeGuide = guide?.isActive ? guide : null;

  const sendBlocker = !activeGuide
    ? t("send.needsGuide")
    : !activeGuide.email
      ? t("send.needsEmail")
      : totals.bookings === 0
        ? t("send.empty")
        : null;

  const whatsApp = activeGuide
    ? whatsAppLink(
        guideWhatsAppNumber(activeGuide.phone),
        whatsAppMessage(tId, key, {
          guide: activeGuide.name,
          tour: localize(tour.title, "id"),
          place: tour.meetingPoint,
          participants: totals.participants,
          bookings: totals.bookings,
          note: assignment?.note ?? null,
        }),
      )
    : null;

  return (
    <div data-print-manifest>
      <style href="departure-print" precedence="default">
        {PRINT_CSS}
      </style>

      <div className="short:mb-2 mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/departures"
          className="group text-ink-soft hover:text-ink -ml-2 inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-medium"
        >
          <ArrowLeft
            className="size-4 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
          {t("detail.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintManifestButton />
          {/* A plain link: the route handler streams a file download. */}
          <a
            href={`/api/admin/departures/${key.tourId}/${key.date}/export`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            download
          >
            <Download aria-hidden />
            {t("detail.csv")}
          </a>
        </div>
      </div>

      {/* Print-only document header. */}
      <div className="border-ink mb-4 hidden border-b pb-3 print:block">
        <p className="font-display text-2xl font-semibold">
          Etno<span className="font-normal italic">Journey</span>
        </p>
        <p className="mt-1 text-sm">{t("detail.printTitle")}</p>
      </div>

      <AdminPageHeader
        eyebrow={t("detail.eyebrow")}
        title={tourTitle}
        description={`${longDate} · ${tour.destinationName}`}
        action={
          detail.needsGuide ? (
            <Badge tone="danger">
              <TriangleAlert aria-hidden />
              {t("agenda.noGuide")}
            </Badge>
          ) : (
            <Badge tone="leaf">
              <UserCheck aria-hidden />
              {guide?.name}
            </Badge>
          )
        }
      />

      <div className="short:gap-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="short:gap-4 flex min-w-0 flex-col gap-6">
          <Card title={t("detail.summary")}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Detail icon={CalendarDays} label={t("detail.date")}>
                {longDate}
              </Detail>
              <Detail icon={MapPin} label={t("detail.meetingPoint")}>
                {tour.meetingPoint}
              </Detail>
              <Detail icon={Users} label={t("detail.participants")}>
                {tc("people", { count: totals.participants })}
                <span className="text-muted block text-xs font-normal">
                  {t("agenda.participants", {
                    confirmed: load.confirmed,
                    pending: load.pending,
                  })}
                </span>
              </Detail>
              <Detail icon={UserCheck} label={t("detail.guide")}>
                {guide ? (
                  <>
                    {guide.name}
                    {activeGuide?.phone && (
                      <span className="text-muted block text-xs font-normal">
                        {activeGuide.phone}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-danger">{t("agenda.noGuide")}</span>
                )}
              </Detail>
            </dl>
            <div className="border-line short:mt-4 short:pt-4 mt-5 border-t pt-5">
              <p className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="text-muted">{t("capacity.title")}</span>
                <span className={load.overbooked ? "text-danger font-medium" : "font-medium"}>
                  {load.overbooked
                    ? t("capacity.overbooked", {
                        booked: load.booked,
                        capacity: tour.capacity,
                      })
                    : t("capacity.remaining", {
                        booked: load.booked,
                        capacity: tour.capacity,
                        remaining: load.remaining,
                      })}
                </span>
              </p>
              <CapacityBar
                className="h-3"
                load={load}
                label={t("capacity.label", {
                  confirmed: load.confirmed,
                  pending: load.pending,
                  capacity: tour.capacity,
                })}
              />
              <p className="text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs print:hidden">
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-leaf size-2.5 rounded-full" aria-hidden />
                  {t("capacity.confirmedLegend")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-gold size-2.5 rounded-full" aria-hidden />
                  {t("capacity.pendingLegend")}
                </span>
              </p>
            </div>
            {assignment?.note && (
              <div className="border-line mt-5 hidden border-t pt-4 text-sm print:block">
                <p className="text-muted text-xs">{t("note.label")}</p>
                <p className="mt-1 whitespace-pre-line">{assignment.note}</p>
              </div>
            )}
          </Card>

          <section aria-labelledby="manifest-heading">
            <h2 id="manifest-heading" className="font-display short:mb-3 mb-4 text-2xl">
              {t("manifest.title")}
            </h2>
            <ManifestTable rows={manifest} totals={totals} />
          </section>
        </div>

        <div data-print-hide className="short:gap-4 flex min-w-0 flex-col gap-6">
          <Card title={t("guide.title")}>
            <div className="flex flex-col gap-5">
              {guide && (
                <div className="bg-sand-50 rounded-xl px-4 py-3 text-sm">
                  <p className="font-medium">{guide.name}</p>
                  {guide.organization && <p className="text-muted text-xs">{guide.organization}</p>}
                  {!guide.isActive && (
                    <p className="text-danger mt-1 text-xs">{t("guide.inactive")}</p>
                  )}
                  <div className="mt-2 flex flex-col gap-1 text-xs">
                    {guide.phone && (
                      <a
                        href={`tel:${guide.phone}`}
                        className="hover:text-terracotta inline-flex items-center gap-1.5"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {guide.phone}
                      </a>
                    )}
                    {guide.email ? (
                      <a
                        href={`mailto:${guide.email}`}
                        className="hover:text-terracotta inline-flex items-center gap-1.5 break-all"
                      >
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        {guide.email}
                      </a>
                    ) : (
                      <span className="text-muted">{t("guide.noEmail")}</span>
                    )}
                  </div>
                  {assignment?.updatedAt && detail.assignedByName && (
                    <p className="text-muted mt-2 text-xs">
                      {t("guide.assignedBy", {
                        name: detail.assignedByName,
                        date: formatDate(assignment.updatedAt, locale, stamp),
                      })}
                    </p>
                  )}
                </div>
              )}

              <GuideAssignmentForm
                tourId={key.tourId}
                date={key.date}
                currentGuideId={guide?.id ?? null}
                suggested={detail.guideOptions.suggested}
                others={detail.guideOptions.others}
              />

              <div className="border-line flex flex-col gap-3 border-t pt-5">
                <p className="text-muted text-xs">{t("send.description")}</p>
                <SendManifestButton
                  tourId={key.tourId}
                  date={key.date}
                  email={activeGuide?.email ?? null}
                  disabledReason={sendBlocker}
                />
                {whatsApp && (
                  <a
                    href={whatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <MessageCircle aria-hidden />
                    {t("whatsapp.button")}
                  </a>
                )}
                {activeGuide && !whatsApp && (
                  <p className="text-muted text-xs">{t("whatsapp.noPhone")}</p>
                )}
                {assignment?.notifiedAt && (
                  <p className="text-leaf text-xs" data-testid="manifest-notified">
                    {t("send.lastSent", { date: formatDate(assignment.notifiedAt, locale, stamp) })}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card title={t("note.title")} description={t("note.description")}>
            <DepartureNoteForm
              tourId={key.tourId}
              date={key.date}
              initialNote={assignment?.note ?? null}
            />
          </Card>

          <Card title={t("history.title")}>
            {detail.history.length === 0 ? (
              <p className="text-muted text-sm">{t("history.empty")}</p>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {detail.history.map(({ log, actorName }) => {
                  const verb = log.action.split(".")[1] as
                    "assigned" | "unassigned" | "noted" | "notified";
                  return (
                    <li key={log.id} className="border-line border-l-2 pl-3">
                      <p className="font-medium">{tActions(`departure.${verb}`)}</p>
                      <p className="text-muted text-xs">
                        {actorName ?? t("history.system")} &middot;{" "}
                        <time dateTime={log.createdAt.toISOString()}>
                          {formatDate(log.createdAt, locale, stamp)}
                        </time>
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Short WhatsApp summary for the guide; the full manifest goes by email. */
function whatsAppMessage(
  t: Awaited<ReturnType<typeof getTranslations<"adminDepartures">>>,
  key: DepartureKey,
  values: {
    guide: string;
    tour: string;
    place: string;
    participants: number;
    bookings: number;
    note: string | null;
  },
): string {
  const date = formatDate(key.date, "id", { weekday: "long", day: "numeric", month: "long" });
  const lines = [
    t("whatsapp.message", {
      guide: values.guide,
      tour: values.tour,
      date,
      place: values.place,
      participants: values.participants,
      bookings: values.bookings,
    }),
  ];
  if (values.note) lines.push(t("whatsapp.note", { note: values.note }));
  return lines.join("\n\n");
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line short:p-5 rounded-(--radius-card) border bg-white p-6 md:p-7 print:border-0 print:p-0">
      <div className="short:mb-4 mb-5">
        <h2 className="text-muted font-sans text-xs font-semibold tracking-[0.2em] uppercase">
          {title}
        </h2>
        {description && <p className="text-muted mt-1 text-xs">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
