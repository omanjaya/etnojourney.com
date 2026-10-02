import { CalendarDays, ChevronRight, MapPin, StickyNote, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { localize, type LocalizedText } from "@/lib/i18n-text";

export type PartnerDeparture = {
  tourId: number;
  date: string;
  tourTitle: LocalizedText;
  meetingPoint: string;
  note: string | null;
  bookingCount: number;
  participantCount: number;
};

/** One assigned departure, linking to its manifest. */
export async function DepartureCard({ departure }: { departure: PartnerDeparture }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("partner.departures")]);
  return (
    <Link
      href={`/partner/departures/${departure.tourId}/${departure.date}`}
      className="group border-line hover:border-sand-300 flex items-start gap-4 rounded-(--radius-card) border bg-white p-4 transition-colors sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-terracotta inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDate(departure.date, locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h3 className="mt-1 text-lg leading-snug">{localize(departure.tourTitle, locale)}</h3>
        <ul className="text-ink-soft mt-2 flex flex-col gap-1 text-sm">
          <li className="inline-flex items-start gap-2">
            <MapPin className="text-muted mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{departure.meetingPoint}</span>
          </li>
          <li className="inline-flex items-center gap-2">
            <Users className="text-muted size-4 shrink-0" aria-hidden />
            <span>
              {t("travellers", {
                participants: departure.participantCount,
                bookings: departure.bookingCount,
              })}
            </span>
          </li>
          {departure.note && (
            <li className="inline-flex items-start gap-2">
              <StickyNote className="text-muted mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="line-clamp-2">{departure.note}</span>
            </li>
          )}
        </ul>
      </div>
      <span className="text-muted group-hover:text-ink mt-1 inline-flex shrink-0 items-center gap-1 text-sm">
        <span className="hidden sm:inline">{t("open")}</span>
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
