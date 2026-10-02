import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/server/db/schema";

const tones = {
  pending: "gold",
  paid: "leaf",
  failed: "danger",
  expired: "neutral",
  refunded: "indigo",
} as const;

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = useTranslations("adminPayments.status");
  return <Badge tone={tones[status]}>{t(status)}</Badge>;
}
