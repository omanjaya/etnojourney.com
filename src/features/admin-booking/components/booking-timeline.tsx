import {
  ArrowRightLeft,
  CalendarClock,
  CalendarX2,
  CircleDollarSign,
  CirclePlus,
  History,
  StickyNote,
  TimerOff,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  timelineLabel,
  type TimelineEvent,
} from "@/server/services/booking-timeline.rules";

const stamp: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const day: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

const auditIcons: Record<string, LucideIcon> = {
  "booking.status_changed": ArrowRightLeft,
  "booking.note_added": StickyNote,
  "booking.rescheduled": CalendarClock,
  "booking.cancelled_by_traveller": CalendarX2,
  "booking.expired": TimerOff,
  "payment.refund_required": Undo2,
  "payment.refunded": Undo2,
};

/** Vertical history of a booking, newest first. */
export function BookingTimeline({ events }: { events: TimelineEvent[] }) {
  const t = useTranslations("adminBooking.timeline");
  const ts = useTranslations("common.bookingStatus");
  // Every audit verb has a label here (a test enforces it): the fallback, never a raw verb.
  const ta = useTranslations("adminUsers.activity.actions");
  const locale = useLocale();
  const money = (value: number) => formatCurrency(value, locale);

  const auditLabel = (action: string, details: Record<string, unknown> | null): string => {
    const label = timelineLabel(action, details);
    switch (label?.key) {
      case "booking_status_changed":
        return t("actions.booking_status_changed", { status: ts(label.status) });
      case "booking_rescheduled":
        return t("actions.booking_rescheduled", {
          from: formatDate(label.from, locale, day),
          to: formatDate(label.to, locale, day),
        });
      case "booking_cancelled_by_traveller_paid":
        return t("actions.booking_cancelled_by_traveller_paid", {
          percent: label.percent,
          amount: money(label.amount),
        });
      case "payment_refund_required":
      case "payment_refunded":
        return t(`actions.${label.key}`, { amount: money(label.amount) });
      case "booking_note_added":
      case "booking_cancelled_by_traveller":
      case "booking_expired":
        return t(`actions.${label.key}`);
    }
    type Key = Parameters<typeof ta>[0];
    return ta.has(action as Key) ? ta(action as Key) : ta("unknown");
  };

  const describe = (event: TimelineEvent): { icon: LucideIcon; label: string; actor: string } => {
    if (event.kind === "created") {
      return {
        icon: CirclePlus,
        label: t("created"),
        actor: t("by", { name: event.actorName }),
      };
    }
    if (event.kind === "paid") {
      return {
        icon: CircleDollarSign,
        label: t("paid", {
          orderId: event.orderId,
          amount: money(event.amount),
        }),
        actor: t("system"),
      };
    }
    return {
      icon: auditIcons[event.action] ?? History,
      label: auditLabel(event.action, event.details),
      actor: event.actorName ? t("by", { name: event.actorName }) : t("system"),
    };
  };

  return (
    <ol className="short:gap-4 relative flex flex-col gap-5">
      <span className="bg-line absolute top-2 bottom-2 left-[0.9375rem] w-px" aria-hidden />
      {events.map((event) => {
        const { icon: Icon, label, actor } = describe(event);
        return (
          <li key={event.key} className="relative flex gap-3">
            <span className="border-line text-terracotta relative grid size-8 shrink-0 place-items-center rounded-full border bg-white">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm leading-snug font-medium">{label}</p>
              <p className="text-muted mt-0.5 text-xs">
                <time dateTime={event.at.toISOString()}>{formatDate(event.at, locale, stamp)}</time>
                {" · "}
                {actor}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
