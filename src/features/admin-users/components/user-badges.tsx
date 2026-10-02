import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/server/db/schema";

const roleTones = { user: "neutral", staff: "gold", admin: "indigo" } as const;

export function UserRoleBadge({ role }: { role: UserRole }) {
  const t = useTranslations("adminUsers.roles");
  return <Badge tone={roleTones[role]}>{t(role)}</Badge>;
}

export function UserStatusBadge({ disabled }: { disabled: boolean }) {
  const t = useTranslations("adminUsers.status");
  return <Badge tone={disabled ? "danger" : "leaf"}>{t(disabled ? "disabled" : "active")}</Badge>;
}
