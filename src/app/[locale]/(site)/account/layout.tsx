import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { AccountTabs } from "@/features/booking/components/account-tabs";
import { requireUser } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("account"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: "/account",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("account");

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("greeting", { name: user.name.split(" ")[0] })}
        description={t("description")}
      >
        <AccountTabs />
      </PageHeader>
      <Container className="py-14 md:py-20">{children}</Container>
    </>
  );
}
