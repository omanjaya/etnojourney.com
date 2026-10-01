import type { Metadata } from "next";
import { KeyRound, UserRound, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { ProfileForm } from "@/features/account/components/profile-form";
import { requireUser } from "@/server/auth/guards";
import { accountService } from "@/server/services/account.service";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("account.settings"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: "/account/settings",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function AccountSettingsPage({
  searchParams,
}: PageProps<"/[locale]/account/settings">) {
  // Pages guard themselves; the layout check alone is not enough.
  const user = await requireUser();
  const [profile, t] = await Promise.all([
    accountService.profile(user.id),
    getTranslations("account.settings"),
  ]);
  const passwordChanged = (await searchParams).password === "changed";
  const locale: Locale = routing.locales.find((l) => l === profile.locale) ?? routing.defaultLocale;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Reveal>
        <SettingsCard
          icon={UserRound}
          title={t("profile.title")}
          description={t("profile.description")}
        >
          <ProfileForm name={profile.name} email={profile.email} locale={locale} />
        </SettingsCard>
      </Reveal>
      <Reveal delay={0.08}>
        <SettingsCard
          icon={KeyRound}
          title={t("password.title")}
          description={t("password.description")}
        >
          <ChangePasswordForm changed={passwordChanged} />
        </SettingsCard>
      </Reveal>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line h-full rounded-(--radius-card) border bg-white p-6 md:p-8">
      <div className="mb-7 flex items-start gap-4">
        <span className="bg-sand-100 text-terracotta grid size-11 shrink-0 place-items-center rounded-full">
          <Icon className="size-5" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl">{title}</h2>
          <p className="text-muted mt-1 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
