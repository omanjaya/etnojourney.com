import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/guards";
import { isBackofficeRole } from "@/server/auth/permissions";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("common.nav")]);
  return (
    <SiteHeaderClient
      user={user ? { name: user.name, isAdmin: isBackofficeRole(user.role) } : null}
      links={[
        { href: "/tours", label: t("tours") },
        { href: "/destinations", label: t("destinations") },
      ]}
    />
  );
}
