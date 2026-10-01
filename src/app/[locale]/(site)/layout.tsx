import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "@/components/layout/layout-motion.css";
import { RouteTransition } from "@/components/layout/route-transition";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        {/* Page content crossfades and rises on navigation; the header stays anchored. */}
        <RouteTransition>{children}</RouteTransition>
      </main>
      <SiteFooter />
    </>
  );
}
