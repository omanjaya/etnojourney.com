import type { ReactNode } from "react";

/** Admin form section: title and hint on the left, fields on the right. */
export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line grid gap-6 border-b py-10 first:pt-0 last:border-0 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h2 className="text-2xl">{title}</h2>
        {hint && <p className="text-muted mt-2 text-sm">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}
