import { SearchX, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import { userRole } from "@/server/db/schema";
import { userService } from "@/server/services/user.service";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSearchBox } from "@/features/admin/components/admin-search-box";
import { FilterPills } from "@/features/admin-users/components/filter-pills";
import { UsersTable } from "@/features/admin-users/components/users-table";
import { parseAdminUserQuery } from "@/features/admin-users/schemas";

export default async function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  await requireAdmin("users.manage");
  const raw = await searchParams;
  const query = parseAdminUserQuery(raw);

  const [result, t, tr] = await Promise.all([
    userService.listForAdmin(query, parsePage(raw.page), PAGE_SIZE.admin),
    getTranslations("adminUsers.list"),
    getTranslations("adminUsers.roles"),
  ]);
  const current: Record<string, string | undefined> = { ...query };

  return (
    <>
      <AdminPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mb-4">
        <AdminSearchBox
          pathname="/admin/users"
          query={current}
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          clearLabel={t("clear")}
        />
      </div>

      <FilterPills
        pathname="/admin/users"
        query={current}
        param="role"
        label={t("roleFilterLabel")}
        options={[
          { value: undefined, label: t("allRoles") },
          ...userRole.enumValues.map((value) => ({ value, label: tr(value) })),
        ]}
      />

      <p className="text-muted mb-4 text-sm" aria-live="polite">
        {t("summary", { total: result.total })}
      </p>

      {result.items.length ? (
        <>
          <UsersTable rows={result.items} />
          <Pagination
            className="mt-8"
            pathname="/admin/users"
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
      ) : query.q || query.role ? (
        <EmptyState
          icon={SearchX}
          title={t("noMatch.title")}
          description={t("noMatch.description")}
        />
      ) : (
        <EmptyState icon={Users} title={t("empty.title")} description={t("empty.description")} />
      )}
    </>
  );
}
