import Image from "next/image";
import { ArrowUpRight, CalendarDays, Compass, Hash, Info, Users, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { localize } from "@/lib/i18n-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingStatusBadge } from "@/components/shared/booking-status-badge";
import { CancelBookingButton } from "@/features/booking/components/cancel-booking-button";
import { PayButton } from "@/features/payment/components/pay-button";
import { PaymentStatusBadge } from "@/features/payment/components/payment-status-badge";
import { WriteReviewButton } from "@/features/reviews/components/write-review-button";
import { requireUser } from "@/server/auth/guards";
import { bookingService } from "@/server/services/booking.service";
import { paymentService } from "@/server/services/payment.service";
import { reviewService } from "@/server/services/review.service";

export default async function AccountBookingsPage() {
  const user = await requireUser();
  const [rows, reviewed, locale, t, tc] = await Promise.all([
    bookingService.listForUser(user.id),
    reviewService.reviewedBookingIds(user.id),
    getLocale(),
    getTranslations("account.bookings"),
    getTranslations("common"),
  ]);
  const payments = await paymentService.latestByBookingIds(rows.map((r) => r.booking.id));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button asChild>
            <Link href="/tours">{t("emptyCta")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section>
      <h2 className="text-muted mb-8 font-sans text-sm font-semibold tracking-[0.2em] uppercase">
        {t("count", { count: rows.length })}
      </h2>
      <ul className="flex flex-col gap-5">
        {rows.map(({ booking, tour, destination }) => {
          const payment = payments.get(booking.id);
          const isPaid = payment?.status === "paid";
          const awaitingPayment = booking.status === "pending" && !isPaid;
          return (
            <li
              key={booking.id}
              className="group border-line grid overflow-hidden rounded-(--radius-card) border bg-white transition-shadow hover:shadow-[0_20px_50px_-30px_rgb(29_26_22/0.35)] md:grid-cols-[240px_1fr]"
            >
              <div className="bg-sand-200 relative aspect-[16/10] md:aspect-auto">
                <Image
                  src={tour.coverImage}
                  alt={localize(tour.title, locale)}
                  fill
                  sizes="(min-width: 768px) 240px, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-5 p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-muted text-xs font-medium tracking-wide uppercase">
                      {destination.name}, {destination.province}
                    </p>
                    <h3 className="mt-1 text-2xl">
                      <Link
                        href={`/account/bookings/${booking.code}`}
                        className="decoration-terracotta/40 underline-offset-4 hover:underline"
                      >
                        {localize(tour.title, locale)}
                      </Link>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payment && <PaymentStatusBadge status={payment.status} />}
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Detail icon={CalendarDays} label={t("travelDate")}>
                    {formatDate(booking.travelDate, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Detail>
                  <Detail icon={Users} label={t("participants")}>
                    {tc("people", { count: booking.participants })}
                  </Detail>
                  <Detail icon={Wallet} label={t("total")}>
                    {formatCurrency(booking.totalPrice, locale)}
                  </Detail>
                  <Detail icon={Hash} label={t("code")}>
                    <span className="font-mono tracking-wider">{booking.code}</span>
                  </Detail>
                </dl>

                {awaitingPayment && (
                  <p className="bg-gold-light flex items-start gap-2 rounded-xl px-4 py-3 text-sm text-[#7a5a1c]">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {t("payHint")}
                  </p>
                )}

                <div className="border-line mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-muted text-xs">
                    {t("bookedOn", { date: formatDate(booking.createdAt, locale) })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {awaitingPayment && <CancelBookingButton bookingId={booking.id} />}
                    {booking.status === "completed" && (
                      <WriteReviewButton
                        bookingId={booking.id}
                        tourTitle={localize(tour.title, locale)}
                        alreadyReviewed={reviewed.has(booking.id)}
                      />
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/account/bookings/${booking.code}`}>
                        {t("viewDetail")}
                        <ArrowUpRight aria-hidden />
                      </Link>
                    </Button>
                    {awaitingPayment && <PayButton bookingId={booking.id} />}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
