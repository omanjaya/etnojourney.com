import type { Metadata } from "next";
import { CircleCheck, Clock, SearchX, TriangleAlert, type LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { localize } from "@/lib/i18n-text";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/guards";
import { paymentService } from "@/server/services/payment.service";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/payment/finish">): Promise<Metadata> {
  const { locale } = await params;
  const [t, tc] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "payment.finish" }),
    getTranslations({ locale: locale as Locale, namespace: "common" }),
  ]);
  return pageMetadata({
    locale: locale as Locale,
    path: "/payment/finish",
    title: t("metaTitle"),
    description: tc("tagline"),
    noIndex: true,
  });
}

type View = { icon: LucideIcon; tone: string; title: string; body: string };

export default async function PaymentFinishPage({
  params,
  searchParams,
}: PageProps<"/[locale]/payment/finish">) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations("payment.finish");
  const query = await searchParams;
  const orderId = typeof query.order_id === "string" ? query.order_id.slice(0, 64) : "";

  // Status comes from our database (updated by the verified webhook), never from the query string.
  const found = orderId ? await paymentService.getForUser(user.id, orderId) : null;

  let view: View;
  if (!found) {
    view = {
      icon: SearchX,
      tone: "bg-sand-200 text-ink-soft",
      title: t("notFoundTitle"),
      body: t("notFoundBody"),
    };
  } else {
    const code = found.booking.code;
    view =
      found.payment.status === "paid"
        ? {
            icon: CircleCheck,
            tone: "bg-leaf-light text-leaf",
            title: t("paidTitle"),
            body: t("paidBody", { code }),
          }
        : found.payment.status === "pending"
          ? {
              icon: Clock,
              tone: "bg-gold-light text-[#8a6420]",
              title: t("pendingTitle"),
              body: t("pendingBody", { code }),
            }
          : {
              icon: TriangleAlert,
              tone: "bg-danger-light text-danger",
              title: t("failedTitle"),
              body: t("failedBody", { code }),
            };
  }
  const Icon = view.icon;

  return (
    <section className="grain bg-sand-100 min-h-[80vh] pt-36 pb-24 md:pt-44">
      <Container className="max-w-2xl">
        <div className="border-line rounded-(--radius-card) border bg-white p-8 shadow-[0_30px_60px_-40px_rgb(29_26_22/0.35)] md:p-12">
          <span className={cn("grid size-14 place-items-center rounded-full", view.tone)}>
            <Icon className="size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="eyebrow mt-8">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl leading-tight md:text-5xl">{view.title}</h1>
          <p className="text-ink-soft mt-4 leading-relaxed">{view.body}</p>

          {found && (
            <dl className="border-line mt-8 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">{t("tour")}</dt>
                <dd className="mt-1 font-medium">{localize(found.booking.tour.title, locale)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("amount")}</dt>
                <dd className="mt-1 font-medium">{formatCurrency(found.payment.amount, locale)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("orderId")}</dt>
                <dd className="mt-1 font-mono text-xs font-semibold">{found.payment.orderId}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("method")}</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <PaymentStatusBadge status={found.payment.status} />
                  {found.payment.method && (
                    <span className="text-ink-soft capitalize">
                      {found.payment.method.replaceAll("_", " ")}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/account">{t("toAccount")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tours">{t("toTours")}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
