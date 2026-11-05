import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/server/db/schema";

const tones = {
  none: "neutral",
  pending: "gold",
  paid: "leaf",
  failed: "danger",
  expired: "neutral",
  refunded: "indigo",
} as const;

/**
 * Payment state of a booking in the admin lists, worded for the operator:
 * no attempt (or an expired one) reads "not paid", a gateway session still
 * open reads "being paid".
 */
export function BookingPaymentBadge({ status }: { status: PaymentStatus | null }) {
  const t = useTranslations("admin.bookings.payment");
  const key = status ?? "none";
  return <Badge tone={tones[key]}>{t(key)}</Badge>;
}
