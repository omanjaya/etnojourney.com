import {
  ArrowRightLeft,
  CircleDollarSign,
  CirclePlus,
  History,
  StickyNote,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/format";
import { bookingStatus, type BookingStatus } from "@/server/db/schema";
import { auditMessageKey, type TimelineEvent } from "@/server/services/booking-timeline.rules";

const stamp: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const auditIcons: Record<string, LucideIcon> = {
  "booking.status_changed": ArrowRightLeft,
  "booking.note_added": StickyNote,
  "payment.refund_required": Undo2,
  "payment.refunded": Undo2,
};

const isBookingStatus = (value: unknown): value is BookingStatus =>
  (bookingStatus.enumValues as readonly unknown[]).includes(value);

/** Vertical history of a booking, newest first. */
export function BookingTimeline({ events }: { events: TimelineEvent[] }) {
  const t = useTranslations("adminBooking.timeline");
  const ts = useTranslations("common.bookingStatus");
  const locale = useLocale();

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
          amount: formatCurrency(event.amount, locale),
        }),
        actor: t("system"),
      };
    }
    const key = `actions.${auditMessageKey(event.action)}` as Parameters<typeof t>[0];
    const status = event.details?.status;
    const label = t.has(key)
      ? t(key, { status: isBookingStatus(status) ? ts(status) : String(status ?? "") } as never)
      : t("other", { action: event.action });
    return {
      icon: auditIcons[event.action] ?? History,
      label,
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
