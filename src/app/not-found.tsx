
import Link from "next/link";

/**
 * Fallback for requests that never reach a locale segment (e.g. unknown static
 * paths). Localized pages use `app/[locale]/not-found.tsx` instead. Plain
 * `next/link` is intentional here: there is no locale context for next-intl.
 */
export default function RootNotFound() {
  return (
    <html lang="id">
      <body className="grid min-h-dvh place-items-center bg-sand-100 px-6 text-center font-sans text-ink">
        <main className="max-w-md">
          <p className="font-display text-8xl text-ink/15">404</p>
          <h1 className="mt-2 font-display text-4xl">Halaman tidak ditemukan</h1>
          <p className="mt-4 text-ink-soft">Page not found.</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-terracotta px-6 text-sm font-medium text-sand-50 hover:bg-terracotta-dark"
          >
            EtnoJourney
          </Link>
        </main>
      </body>
    </html>
  );
}
