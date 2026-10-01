import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/server/auth/guards";
import { AdminNav } from "@/features/admin/components/admin-nav";
import "@/components/layout/layout-motion.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const user = await requireAdmin();

  return (
    <div className="bg-sand-50 min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <AdminNav user={{ name: user.name, email: user.email }} />
      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 outline-none sm:px-8 lg:px-12 lg:py-12"
      >
        <ViewTransition default="page-content">
          <div>{children}</div>
        </ViewTransition>
      </main>
    </div>
  );
}
