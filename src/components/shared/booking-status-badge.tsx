import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/server/db/schema";

const tones = {
  pending: "gold",
  confirmed: "leaf",
  cancelled: "danger",
  completed: "indigo",
} as const;

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("common.bookingStatus");
  return <Badge tone={tones[status]}>{t(status)}</Badge>;
}
