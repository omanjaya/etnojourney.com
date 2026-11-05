import type { ReactNode } from "react";

/**
 * Admin form section: title and hint on the left, fields on the right. An `id`
 * makes it a jump target; the scroll margin keeps it clear of the sticky bars.
 */
export function Section({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-line grid scroll-mt-32 gap-6 border-b py-10 first:pt-0 last:border-0 lg:scroll-mt-20 lg:grid-cols-[16rem_1fr] lg:gap-12"
    >
      <div>
        <h2 className="text-2xl">{title}</h2>
        {hint && <p className="text-muted mt-2 text-sm">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}
