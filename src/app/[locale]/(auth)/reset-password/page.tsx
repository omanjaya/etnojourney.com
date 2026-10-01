import type { Metadata } from "next";
import { ArrowLeft, LinkIcon } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("auth.reset"),
    getTranslations("common"),
  ]);
  return {
    ...(await pageMetadata({
      locale,
      path: "/reset-password",
      title: t("metaTitle"),
      description: tc("tagline"),
      noIndex: true,
    })),
    referrer: "no-referrer",
  };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token, error } = await searchParams;
  const t = await getTranslations("auth.reset");
  const validToken = typeof token === "string" && token.length > 0 && !error ? token : null;

  if (!validToken) {
    return (
      <>
        <span className="bg-danger-light text-danger grid size-12 place-items-center rounded-full">
          <LinkIcon className="size-5" aria-hidden />
        </span>
        <h1 className="mt-6 text-4xl">{t("invalidTitle")}</h1>
        <p className="text-ink-soft mt-4 mb-8 leading-relaxed">{t("invalid")}</p>
        <Button asChild size="lg">
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="text-ink-soft mt-4 mb-10 leading-relaxed">{t("description")}</p>
      <ResetPasswordForm token={validToken} />
      <p className="mt-8 text-center text-sm">
        <Link
          href="/login"
          className="text-terracotta inline-flex items-center gap-2 font-semibold hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {(await getTranslations("auth.forgot"))("backToLogin")}
        </Link>
      </p>
    </>
  );
}
