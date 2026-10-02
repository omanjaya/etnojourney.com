# EtnoJourney: engineering conventions

Next.js 16 (App Router) + TypeScript + Tailwind v4 + PostgreSQL/Drizzle + Better Auth + next-intl.
Next.js 16 notes: `src/proxy.ts` replaces middleware; `params`/`searchParams` are Promises;
`PageProps<"/[locale]/tours/[slug]">` and `LayoutProps<...>` are global helpers (run `npx next typegen` after adding routes).

## Layers (imports only point downward)

| Layer | Path | Rules |
|---|---|---|
| Presentation | `src/app/**` | Compose pages. Call services directly from Server Components. No Drizzle imports. |
| Feature (application) | `src/features/<name>/` | `actions.ts` ("use server"), `schemas.ts` (Zod), `components/`. Actions: `parseInput` → auth check → service → `revalidatePath`, all inside `runAction`. |
| Domain | `src/server/services/*.service.ts` | Business rules. Throw `DomainError(code)`; codes are translated under `errors.*`. Pure rules in `*.rules.ts` with Vitest tests. |
| Data access | `src/server/repositories/*.repository.ts` | The only place that builds Drizzle queries. |
| Infrastructure | `src/server/db`, `src/server/auth` | Schema, client, Better Auth config, guards (`requireUser`, `requireAdmin`, `getCurrentUser`). |

Shared UI: `src/components/ui` (primitives: Button, Input/Select/Textarea/Field, Badge, Alert, EmptyState, Rating, Stars),
`src/components/layout` (Container, PageHeader, SectionHeading, header/footer), `src/components/shared` (TourCard, DestinationCard, Reveal, BookingStatusBadge, category icons, Logo).

## Rules

- No emojis anywhere (UI, copy, code). Icons come from `lucide-react` only.
- Every user-facing string goes through next-intl. Messages are split per namespace in `messages/<id|en>/<namespace>.json`; keep both locales in sync. DB content is `{ id, en }` JSONB, read with `localize(text, locale)`.
- Links and redirects use `@/i18n/navigation`, never `next/link` directly.
- Server Components by default; add `"use client"` only for interactivity.
- Pages other than home start with `<PageHeader>` (it clears the fixed header).
- Authorization is enforced on the server in every action and in every protected `page.tsx`, not just by hiding UI. A layout check alone is NOT enough: Next.js can render a page without re-running its layout (client-side RSC refetch), so each admin/account page calls `requireAdmin()`/`requireUser()` itself.
- Motion: use the toolkit in `src/components/motion` (Reveal variants, SplitWords, CountUp, Marquee, Tilt, Magnetic; `ImageFadeIn` in the root layout fades every `fill` photo in on load, so don't add per-image fades) and React `<ViewTransition>` for route/shared-element transitions; scroll effects use CSS scroll-driven animations (`animation-timeline`). Content must be visible in server HTML (never ship `opacity: 0` from the server), everything must respect `prefers-reduced-motion`, and no new animation libraries.
- Laptop screens: key info (title, price, booking CTA, first results) must be visible without scrolling at 1366x768 and 1280x720. Full-screen heroes must fit the real browser viewport (about 1366x625 on a 1366x768 screen): size them with `svh` as well as `vw` (see `home-hero.tsx`). Use the `short:` variant (min-width 1024px, max-height 860px) to tighten vertical spacing on short laptop screens; full nav from `lg`, hamburger below.
- Back office: roles are `user`, `staff` (operations) and `admin` (owner). Gate pages with `requireAdmin(permission)` and actions with `assertPermission(permission)` from `src/server/auth/guards.ts`; permissions live in `src/server/auth/permissions.ts` (also used to hide nav links). Record every back-office change with `auditService.record` (add new verbs to `auditActions` plus labels in `messages/*/adminUsers.json` under `activity.actions`; a test enforces this).
- Business dates (lead time, "today") use `Asia/Jakarta`, never the server time zone.
- Zod messages are keys under `errors.fields` (e.g. `"required"`, `"email"`); `parseInput` translates them.
- Design tokens live in `src/app/globals.css` (`bg-sand-50`, `text-ink`, `bg-terracotta`, `bg-indigo`, `text-muted`, `border-line`, `font-display`, `.eyebrow`, `.grain`, `rounded-(--radius-card)`).

## Commands

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run db:migrate` · `npm run db:seed`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
