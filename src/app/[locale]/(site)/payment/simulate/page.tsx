import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { localize } from "@/lib/i18n-text";
import { requireUser } from "@/server/auth/guards";
import { isMockPaymentEnabled, paymentService } from "@/server/services/payment.service";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import { SimulateButtons } from "@/features/payment/components/simulate-buttons";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/payment/simulate">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "payment.simulate" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/payment/simulate",
    title: t("metaTitle"),
    description: t("description"),
    noIndex: true,
  });
}

export default async function PaymentSimulatePage({
  params,
  searchParams,
}: PageProps<"/[locale]/payment/simulate">) {
  // Never reachable in production or when a real gateway is configured.
  if (!isMockPaymentEnabled()) notFound();

  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await requireUser();
  const query = await searchParams;
  const orderId = typeof query.order === "string" ? query.order.slice(0, 64) : "";
  const found = orderId ? await paymentService.getForUser(user.id, orderId) : null;
  if (!found || found.payment.provider !== "mock") notFound();

  const t = await getTranslations("payment.simulate");
  const { payment, booking } = found;

  return (
    <section className="grain bg-sand-100 min-h-[80vh] pt-36 pb-24 md:pt-44">
      <Container className="max-w-2xl">
        <div className="border-terracotta/40 rounded-(--radius-card) border border-dashed bg-white p-8 md:p-12">
          <span className="bg-terracotta-light text-terracotta grid size-14 place-items-center rounded-full">
            <FlaskConical className="size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="eyebrow mt-8">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl">{t("title")}</h1>
          <p className="text-ink-soft mt-4">{t("description")}</p>

          <div className="bg-sand-50 mt-8 flex items-center justify-between gap-4 rounded-xl p-5">
            <div>
              <p className="font-medium">{localize(booking.tour.title, locale)}</p>
              <p className="text-muted mt-1 font-mono text-xs">{payment.orderId}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl">{formatCurrency(payment.amount, locale)}</p>
              <PaymentStatusBadge status={payment.status} />
            </div>
          </div>

          <div className="mt-8">
            {payment.status === "pending" ? (
              <SimulateButtons orderId={payment.orderId} />
            ) : (
              <p className="text-muted text-sm">{t("processed")}</p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
