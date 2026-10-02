import { ArrowUpRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import type { AuditLog } from "@/server/db/schema";
import { auditEntityHref, compactDetails } from "../rules";

export type ActivityRow = { log: AuditLog; actorName: string | null };

const timeFormat: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Audit entries as a compact list: time (Asia/Jakarta, via formatDate), actor,
 * translated action, a link to the item when it has an admin page, and details.
 */
export function ActivityList({
  rows,
  showActor = true,
}: {
  rows: ActivityRow[];
  showActor?: boolean;
}) {
  const t = useTranslations("adminUsers.activity");
  const locale = useLocale();

  // Keys come from the database; unknown ones fall back instead of throwing.
  type Key = Parameters<typeof t>[0];
  const label = (key: string) => (t.has(key as Key) ? t(key as Key) : null);

  return (
    <ol className="admin-stagger border-line divide-line divide-y rounded-(--radius-card) border bg-white">
      {rows.map(({ log, actorName }) => {
        const href = auditEntityHref(log);
        const code = typeof log.details?.code === "string" ? log.details.code : null;
        const entity = `${label(`entities.${log.entityType}`) ?? log.entityType} ${code ?? `#${log.entityId}`}`;
        const details = compactDetails(log.details);
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
                  {details.map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-sand-50 border-line inline-flex gap-1 rounded-md border px-2 py-0.5"
                    >
                      <dt className="text-muted">{key}</dt>
                      <dd className="font-mono break-all">{value}</dd>
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
