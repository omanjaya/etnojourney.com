import { ViewTransition } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "@/components/layout/layout-motion.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        {/* Page content crossfades and rises on navigation; the header stays anchored. */}
        <ViewTransition default="page-content">{children}</ViewTransition>
      </main>
      <SiteFooter />
    </>
  );
}
