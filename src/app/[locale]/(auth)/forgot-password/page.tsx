import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("auth.forgot"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: "/forgot-password",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("auth.forgot");

  return (
    <>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="text-ink-soft mt-4 mb-10 leading-relaxed">{t("description")}</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm">
        <Link
          href="/login"
          className="text-terracotta inline-flex items-center gap-2 font-semibold hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
