import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import type { UserRole } from "@/server/db/schema";
import { UserRoleBadge, UserStatusBadge } from "./user-badges";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bookingCount: number;
  disabledAt: Date | null;
  createdAt: Date;
};

const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  const t = useTranslations("adminUsers.list.columns");
  const locale = useLocale();

  return (
    <>
      <ul className="admin-stagger flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/admin/users/${row.id}`}
              className="border-line hover:border-sand-300 block rounded-(--radius-card) border bg-white p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted text-xs break-all">{row.email}</p>
                </div>
                <UserStatusBadge disabled={row.disabledAt !== null} />
              </div>
              <div className="border-line mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs">
                <UserRoleBadge role={row.role} />
                <span className="text-muted">
                  {t("bookings")}: <span className="text-ink tabular-nums">{row.bookingCount}</span>
                </span>
                <span className="text-muted">
                  {t("joined")}: {formatDate(row.createdAt, locale, short)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-line hidden overflow-x-auto rounded-(--radius-card) border bg-white md:block">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-line bg-sand-50 text-muted border-b text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("name")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("email")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("role")}
              </th>
              <th scope="col" className="px-5 py-4 text-right font-medium">
                {t("bookings")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("joined")}
              </th>
              <th scope="col" className="px-5 py-4 font-medium">
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody className="admin-stagger divide-line divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-sand-50/60 transition-colors">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="hover:text-terracotta inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                  >
                    {row.name}
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </td>
                <td className="text-ink-soft px-5 py-4 break-all">{row.email}</td>
                <td className="px-5 py-4">
                  <UserRoleBadge role={row.role} />
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{row.bookingCount}</td>
                <td className="text-muted px-5 py-4 whitespace-nowrap">
                  {formatDate(row.createdAt, locale, short)}
                </td>
                <td className="px-5 py-4">
                  <UserStatusBadge disabled={row.disabledAt !== null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
