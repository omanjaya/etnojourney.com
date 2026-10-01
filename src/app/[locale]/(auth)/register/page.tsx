import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { safeRedirectPath } from "@/features/auth/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("auth.register"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: "/register",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function RegisterPage({ searchParams }: PageProps<"/[locale]/register">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? safeRedirectPath(next) : undefined;
  const t = await getTranslations("auth.register");

  return (
    <>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="text-ink-soft mt-4 mb-10 leading-relaxed">{t("description")}</p>
      <RegisterForm next={nextPath} />
      <p className="text-ink-soft mt-8 text-center text-sm">
        {t("haveAccount")}{" "}
        <Link
          href={nextPath ? { pathname: "/login", query: { next: nextPath } } : "/login"}
          className="text-terracotta font-semibold hover:underline"
        >
          {t("loginLink")}
        </Link>
      </p>
    </>
  );
}
