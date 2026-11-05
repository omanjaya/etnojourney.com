import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/features/auth/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("auth.login"),
    getTranslations("common"),
  ]);
  return pageMetadata({
    locale,
    path: "/login",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/login">) {
  const { next, reset } = await searchParams;
  const nextPath = typeof next === "string" ? safeRedirectPath(next) : undefined;
  const t = await getTranslations("auth.login");

  return (
    <>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="text-ink-soft mt-4 mb-10 leading-relaxed">{t("description")}</p>
      {reset === "1" && (
        <Alert tone="success" className="mb-6">
          {t("resetSuccess")}
        </Alert>
      )}
      <LoginForm next={nextPath} />
      <p className="text-ink-soft mt-8 text-center text-sm">
        {t("noAccount")}{" "}
        <Link
          href={nextPath ? { pathname: "/register", query: { next: nextPath } } : "/register"}
          className="text-terracotta font-semibold hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>
    </>
  );
}
