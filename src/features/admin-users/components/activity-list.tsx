import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize, type LocalizedText } from "@/lib/i18n-text";
import type { AuditLog } from "@/server/db/schema";
import {
  auditDetails,
  auditEntityHref,
  auditEntityName,
  auditTourScope,
  type AuditDetail,
  type AuditEntityName,
} from "../rules";

export type ActivityRow = {
  log: AuditLog;
  actorName: string | null;
  /** Current name of the user or guide the entry is about, when known. */
  entityName?: string | null;
  /** Current title of the tour a departure or closure entry is about, when known. */
  entityTour?: LocalizedText | null;
};

const timeFormat: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const dayFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/**
 * Audit entries as a compact list: time (Asia/Jakarta, via formatDate), actor,
 * translated action, the item by name with a link when it has an admin page,
 * and the details that matter, labelled and translated (statuses, roles,
 * dates, amounts) instead of raw keys and ids.
 */
export function ActivityList({
  rows,
  showActor = true,
}: {
  rows: ActivityRow[];
  showActor?: boolean;
}) {
  const t = useTranslations("adminUsers.activity");
  const tUsers = useTranslations("adminUsers");
  const tStatus = useTranslations("common.bookingStatus");
  const tReasons = useTranslations("adminPayments.reasons");
  const locale = useLocale();

  // Keys and values come from the database; unknown ones fall back instead of throwing.
  type Key = Parameters<typeof t>[0];
  const label = (key: string) => (t.has(key as Key) ? t(key as Key) : null);
  type StatusKey = Parameters<typeof tStatus>[0];
  const status = (value: string) =>
    tStatus.has(value as StatusKey) ? tStatus(value as StatusKey) : value;
  type UsersKey = Parameters<typeof tUsers>[0];
  const role = (value: string) => {
    const key = `roles.${value}` as UsersKey;
    return tUsers.has(key) ? tUsers(key) : value;
  };
  type ReasonKey = Parameters<typeof tReasons>[0];
  const reason = (value: string) =>
    tReasons.has(value as ReasonKey) ? tReasons(value as ReasonKey) : value;

  const day = (date: string) => formatDate(date, locale, dayFormat);
  const entityLabel = (name: AuditEntityName) =>
    name.kind === "text"
      ? name.value
      : name.kind === "date"
        ? day(name.value)
        : name.from === name.to
          ? day(name.from)
          : t("dateRange", { from: day(name.from), to: day(name.to) });

  const value = (detail: AuditDetail): string => {
    switch (detail.kind) {
      case "creditFields":
        return detail.value.map((field) => label(`creditFields.${field}`) ?? field).join(", ");
      case "date":
        return day(String(detail.value));
      case "bookingStatus":
        return status(String(detail.value));
      case "role":
        return role(String(detail.value));
      case "yesNo":
        return detail.value ? tUsers("detail.yes") : tUsers("detail.no");
      case "money":
        return formatCurrency(Number(detail.value), locale);
      case "percent":
        return `${detail.value}%`;
      case "change":
        return label(`changes.${detail.value}`) ?? String(detail.value);
      case "refundReason":
        return reason(String(detail.value));
      default:
        return String(detail.value);
    }
  };

  return (
    <ol className="admin-stagger border-line divide-line divide-y rounded-(--radius-card) border bg-white">
      {rows.map(({ log, actorName, entityName, entityTour }) => {
        const href = auditEntityHref(log);
        const name = auditEntityName(log, entityName);
        const item = name ? entityLabel(name) : `#${log.entityId}`;
        // A departure or closure is named by its dates: say which tour (or all tours) too.
        const scope = auditTourScope(log, entityTour);
        const tour = scope
          ? scope.kind === "all"
            ? t("allTours")
            : localize(scope.title, locale)
          : null;
        const entity = `${label(`entities.${log.entityType}`) ?? log.entityType} ${
          tour ? t("itemOfTour", { tour, item }) : item
        }`;
        const details = auditDetails(log.action, log.details);
        return (
          <li
            key={log.id}
            className="grid gap-x-6 gap-y-1 px-5 py-4 text-sm md:grid-cols-[11rem_minmax(0,1fr)]"
          >
            <time
              dateTime={log.createdAt.toISOString()}
              className="text-muted text-xs whitespace-nowrap tabular-nums md:pt-0.5"
            >
              {formatDate(log.createdAt, locale, timeFormat)}
            </time>
            <div className="min-w-0">
              <p>
                {showActor && (
                  <span className="font-medium">
                    {log.actorId ? (actorName ?? t("deletedUser")) : t("system")}
                    {" · "}
                  </span>
                )}
                <span>{label(`actions.${log.action}`) ?? t("actions.unknown")}</span>
              </p>
              <p className="text-muted mt-0.5 text-xs">
                {href ? (
                  <Link
                    href={href}
                    className="hover:text-terracotta inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {entity}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                ) : (
                  entity
                )}
              </p>
              {details.length > 0 && (
                <dl className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {details.map((detail) => (
                    <div
                      key={detail.key}
                      className="bg-sand-50 border-line inline-flex gap-1 rounded-md border px-2 py-0.5"
                    >
                      <dt className="text-muted">{label(`details.${detail.key}`) ?? detail.key}</dt>
                      <dd className="break-all">{value(detail)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
