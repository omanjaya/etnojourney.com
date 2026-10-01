import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main className="grain grid min-h-dvh place-items-center bg-sand-100 px-6 text-center">
      <div className="max-w-lg">
        <Link href="/" className="inline-block"><Logo /></Link>
        <Compass className="mx-auto mt-16 size-12 text-terracotta" strokeWidth={1.25} aria-hidden />
        <p className="mt-6 font-display text-8xl text-ink/10">404</p>
        <h1 className="mt-2 text-4xl">{t("title")}</h1>
        <p className="mt-4 text-ink-soft">{t("description")}</p>
        <Button asChild className="mt-8"><Link href="/">{t("cta")}</Link></Button>
      </div>
    </main>
  );
}
