import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePartner } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partner.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function PartnerLayout({ children }: LayoutProps<"/[locale]/partner">) {
  // Each page re-checks: Next.js can render a page without re-running its layout.
  await requirePartner();
  return children;
}
