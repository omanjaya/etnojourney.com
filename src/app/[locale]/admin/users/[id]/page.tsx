import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { requireAdmin } from "@/server/auth/guards";
import { auditService } from "@/server/services/audit.service";
import { isDomainError } from "@/server/services/errors";
import { userService } from "@/server/services/user.service";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ActivityList } from "@/features/admin-users/components/activity-list";
import { UserRoleBadge, UserStatusBadge } from "@/features/admin-users/components/user-badges";
import { UserAccessControl } from "@/features/admin-users/components/user-access-control";
import { UserRoleControl } from "@/features/admin-users/components/user-role-control";

async function loadUser(id: string) {
  try {
    return await userService.detailForAdmin(id);
  } catch (error) {
    if (isDomainError(error) && error.code === "notFound") notFound();
    throw error;
  }
}

const ACTIVITY_LIMIT = 15;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-line rounded-(--radius-card) border bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminUserDetailPage({
  params,
}: PageProps<"/[locale]/admin/users/[id]">) {
  // Pages must guard themselves: Next.js can render a page without its layout.
  const viewer = await requireAdmin("users.manage");
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) notFound();

  const [{ profile, bookings, wishlistCount }, activity, t, locale] = await Promise.all([
    loadUser(id),
    auditService.list({ involvingUser: id }, 1, ACTIVITY_LIMIT),
    getTranslations("adminUsers.detail"),
    getLocale(),
  ]);
  const isSelf = viewer.id === profile.id;
  const disabled = profile.disabledAt !== null;
  const dateFormat: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  return (
    <>
      <Link
        href="/admin/users"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <AdminPageHeader
        eyebrow={t("eyebrow")}
        title={profile.name}
        description={profile.email}
        action={
          <div className="flex flex-wrap gap-2">
            <UserRoleBadge role={profile.role} />
            <UserStatusBadge disabled={disabled} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={t("bookingsTitle")}>
            {bookings.length === 0 ? (
              <p className="text-muted text-sm">{t("bookingsEmpty")}</p>
            ) : (
              <ul className="divide-line -my-3 divide-y">
                {bookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/bookings/${booking.code}`}
                        className="hover:text-terracotta inline-flex items-center gap-1 font-mono text-xs font-semibold tracking-wide underline-offset-4 hover:underline"
                      >
                        {booking.code}
                        <ChevronRight className="size-3.5" aria-hidden />
                      </Link>
                      <p className="line-clamp-1">{localize(booking.tourTitle, locale)}</p>
                      <p className="text-muted text-xs">
                        {formatDate(booking.travelDate, locale, dateFormat)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(booking.totalPrice, locale)}
                      </span>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl">{t("activityTitle")}</h2>
                <p className="text-muted mt-1 text-sm">{t("activityDescription")}</p>
              </div>
              {activity.total > 0 && (
                <Link
                  href={{ pathname: "/admin/activity", query: { actor: profile.id } }}
                  className="hover:text-terracotta inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                >
                  {t("viewAllActivity")}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
            {activity.items.length ? (
              <ActivityList rows={activity.items} />
            ) : (
              <p className="border-line text-muted rounded-(--radius-card) border border-dashed px-5 py-8 text-center text-sm">
                {t("activityEmpty")}
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title={t("profileTitle")}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-muted text-xs">{t("email")}</dt>
                <dd className="break-all">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">{t("joined")}</dt>
                <dd>{formatDate(profile.createdAt, locale, dateFormat)}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">{t("language")}</dt>
                <dd>{t(`languages.${profile.locale === "en" ? "en" : "id"}`)}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">{t("emailVerified")}</dt>
                <dd>{profile.emailVerified ? t("yes") : t("no")}</dd>
              </div>
              {profile.disabledAt && (
                <div>
                  <dt className="text-muted text-xs">{t("disabledSince")}</dt>
                  <dd>{formatDate(profile.disabledAt, locale, dateFormat)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted text-xs">{t("stats.bookings")}</dt>
                <dd className="tabular-nums">{bookings.length}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs">{t("stats.wishlist")}</dt>
                <dd className="tabular-nums">{wishlistCount}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={t("roleTitle")}>
            <p className="text-muted mb-4 text-sm">{t("roleDescription")}</p>
            {isSelf ? (
              <p className="text-ink-soft text-sm">{t("selfNote")}</p>
            ) : (
              <UserRoleControl userId={profile.id} role={profile.role} />
            )}
          </Panel>

          <Panel title={t("accessTitle")}>
            <p className="text-muted mb-4 text-sm">
              {disabled ? t("accessDisabled") : t("accessActive")}
            </p>
            {isSelf ? (
              <p className="text-ink-soft text-sm">{t("selfNote")}</p>
            ) : (
              <UserAccessControl userId={profile.id} name={profile.name} disabled={disabled} />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
