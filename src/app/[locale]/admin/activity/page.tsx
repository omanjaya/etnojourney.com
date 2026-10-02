import { History, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import { auditGroups } from "@/server/services/audit.rules";
import { auditService } from "@/server/services/audit.service";
import { userService } from "@/server/services/user.service";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ActivityActorFilter } from "@/features/admin-users/components/activity-actor-filter";
import { ActivityList } from "@/features/admin-users/components/activity-list";
import { FilterPills } from "@/features/admin-users/components/filter-pills";
import { parseActivityQuery } from "@/features/admin-users/schemas";

export default async function AdminActivityPage({
  searchParams,
}: PageProps<"/[locale]/admin/activity">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("audit.view");
  const raw = await searchParams;
  const query = parseActivityQuery(raw);

  const [result, actors, t] = await Promise.all([
    auditService.list(query, parsePage(raw.page), PAGE_SIZE.admin),
    userService.listBackofficeAccounts(),
    getTranslations("adminUsers.activity"),
  ]);

  // Keep a filtered actor selectable even if they are no longer staff (e.g. a demoted admin).
  const actorOptions = actors.map(({ id, name }) => ({ id, name }));
  if (query.actor && query.actor !== "system" && !actorOptions.some((a) => a.id === query.actor)) {
    const profile = await userService.findProfile(query.actor);
    if (profile) actorOptions.push({ id: profile.id, name: profile.name });
  }

  const current: Record<string, string | undefined> = { ...query };
  const filtered = Boolean(query.group || query.actor);

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <ActivityActorFilter query={current} actors={actorOptions} />
        {filtered && (
          <Link
            href="/admin/activity"
            className="text-muted hover:text-ink inline-flex h-11 items-center px-2 text-sm underline-offset-4 hover:underline"
          >
            {t("reset")}
          </Link>
        )}
      </div>

      <FilterPills
        pathname="/admin/activity"
        query={current}
        param="group"
        label={t("groupFilterLabel")}
        options={[
          { value: undefined, label: t("allGroups") },
          ...auditGroups.map((group) => ({ value: group, label: t(`groups.${group}`) })),
        ]}
      />

      <p className="text-muted mb-4 text-sm" aria-live="polite">
        {t("summary", { total: result.total })}
      </p>

      {result.items.length ? (
        <>
          <ActivityList rows={result.items} />
          <Pagination
            className="mt-8"
            pathname="/admin/activity"
            query={current}
            page={result.page}
            pageCount={result.pageCount}
            labels={{
              nav: t("pagination.label"),
              previous: t("pagination.previous"),
              next: t("pagination.next"),
              page: (page) => t("pagination.page", { page }),
            }}
          />
        </>
      ) : filtered ? (
        <EmptyState
          icon={SearchX}
          title={t("noMatch.title")}
          description={t("noMatch.description")}
        />
      ) : (
        <EmptyState icon={History} title={t("empty.title")} description={t("empty.description")} />
      )}
    </>
  );
}
