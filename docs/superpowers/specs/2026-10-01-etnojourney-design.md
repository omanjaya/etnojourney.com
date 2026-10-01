# EtnoJourney: Design Spec

Marketplace tur budaya Indonesia. Pengunjung menjelajah destinasi dan paket tur etnik, melihat detail, lalu booking (tanpa pembayaran online di tahap 1). Admin mengelola tur, destinasi, dan booking.

## Keputusan

| Topik | Keputusan |
|---|---|
| Stack | Next.js 16 (App Router, RSC, Server Actions), TypeScript strict, Tailwind v4, PostgreSQL 17, Drizzle ORM, Better Auth, Zod, next-intl, lucide-react, motion |
| Booking | User login → pilih tanggal + jumlah peserta → booking `pending` → admin `confirmed` / `cancelled` → `completed`. Tidak ada payment gateway. |
| Akun | Email + password (Better Auth). Role `user` / `admin`. |
| Bahasa | `id` (default) + `en`, routing `/[locale]/...`. Konten DB disimpan sebagai JSONB `{ id, en }`. |
| Visual | Editorial premium: foto full-bleed, serif display (Fraunces) + sans (Inter), palet earthy (terracotta, indigo batik, krem, hijau daun), animasi halus. Tanpa emoji, ikon Lucide. |

## Arsitektur berlapis

```
src/
  app/[locale]/...          Presentation: routes, layouts, page composition (RSC)
  components/ui/            Shared primitives (Button, Input, Badge, Card, ...)
  components/layout/        Header, Footer, Container, Section
  components/shared/        Komponen domain yang dipakai lintas fitur (TourCard, PriceTag, ...)
  features/<feature>/       Application layer per fitur: actions.ts (server actions), schemas.ts (zod), components/
  server/services/          Domain/use-case: aturan bisnis (harga, kapasitas, transisi status)
  server/repositories/      Data access: satu-satunya layer yang menyentuh Drizzle
  server/db/                schema.ts, client, seed
  server/auth/              Better Auth config + guard (requireUser, requireAdmin)
  lib/                      utils murni (format, cn, result type)
  i18n/                     routing, request config
messages/                   id.json, en.json
```

Aturan dependensi: `app` → `features` → `services` → `repositories` → `db`. Layer bawah tidak mengimpor layer atas. Komponen UI tidak mengakses DB. Server Actions selalu: validasi Zod → cek auth → panggil service → kembalikan `ActionResult`.

## Database schema

- `user`, `session`, `account`, `verification`: tabel Better Auth; `user.role` (`user` | `admin`).
- `destinations`: id, slug (unique), name jsonb, region, province, summary jsonb, description jsonb, heroImage, createdAt.
- `tours`: id, slug (unique), destinationId FK, title jsonb, summary jsonb, description jsonb, category enum (`ritual`, `craft`, `culinary`, `village`, `trekking`), durationDays, pricePerPerson (integer, IDR), maxParticipants, rating numeric, reviewCount, coverImage, gallery text[], highlights jsonb[], included jsonb, meetingPoint, isPublished, isFeatured, createdAt, updatedAt.
- `itinerary_days`: id, tourId FK cascade, day, title jsonb, description jsonb. Unique (tourId, day).
- `bookings`: id, code (unique, mis. `EJ-7K2Q9A`), userId FK, tourId FK, travelDate date, participants, unitPrice, totalPrice (snapshot), status enum (`pending`, `confirmed`, `cancelled`, `completed`), contactName, contactPhone, notes, createdAt, updatedAt. Index (userId), (tourId, travelDate).
- `wishlists`: userId + tourId composite PK.
- `reviews`: id, tourId FK, authorName, country, rating, body jsonb, createdAt (diisi seed; form ulasan di luar cakupan tahap 1).

Aturan bisnis (service): travelDate minimal H+3; participants 1..maxParticipants; total peserta booking aktif (pending/confirmed) pada tanggal yang sama tidak melebihi maxParticipants; harga dihitung di server, bukan dari client; user hanya bisa membatalkan booking `pending` miliknya; transisi status admin: pending→confirmed/cancelled, confirmed→completed/cancelled.

## Halaman

Publik: Home (hero, kategori, tur unggulan, destinasi, cerita/nilai, testimoni, CTA), `/tours` (filter kategori, destinasi, harga, durasi, pencarian, sort; filter via URL search params), `/tours/[slug]` (galeri, highlights, itinerary, termasuk/tidak termasuk, ulasan, panel booking sticky), `/destinations`, `/destinations/[slug]`.
Auth: `/login`, `/register`.
User: `/account` (booking saya, batalkan pending), `/account/wishlist`.
Admin: `/admin` (statistik), `/admin/bookings` (ubah status), `/admin/tours` (list, publish toggle, buat/edit).

## Security

- Password di-hash Better Auth (scrypt); session cookie httpOnly, sameSite=lax, secure di production.
- Semua input lewat Zod di server; tidak ada SQL mentah dari input (Drizzle parameterized).
- Otorisasi di server action dan di layout admin/account (`requireAdmin`/`requireUser`), bukan hanya menyembunyikan UI. Kepemilikan booking dicek di service.
- Security headers via `next.config`: CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- Rate limiting bawaan Better Auth untuk endpoint auth.
- Secrets hanya di `.env` (tidak di-commit); `.env.example` disediakan.

## Testing

Vitest untuk unit test service layer (aturan harga, validasi tanggal, kapasitas, transisi status) dengan repository di-mock. Verifikasi akhir: `tsc`, `eslint`, `next build`, smoke test halaman utama via HTTP.

## Di luar cakupan tahap 1

Payment gateway, upload gambar (pakai URL Unsplash), form ulasan user, email notifikasi, reset password.
