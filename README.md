# EtnoJourney

Marketplace tur budaya Indonesia: jelajahi destinasi dan paket tur etnik yang dipandu warga lokal, booking, lalu bayar online. Dua bahasa (Indonesia/English), akun traveller, ulasan, email notifikasi, dan panel admin dengan upload gambar.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · Better Auth · Zod · next-intl · lucide-react · Vitest · Playwright (animasi: CSS + React ViewTransition, tanpa library animasi)

## Menjalankan secara lokal

```bash
cp .env.example .env            # isi DATABASE_URL dan BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d            # opsional: PostgreSQL 17 lokal
npm install
npm run db:migrate              # terapkan migrasi di ./drizzle
npm run db:seed                 # destinasi, tur, ulasan, akun demo
npm run dev                     # http://localhost:3000
```

Akun demo hasil seed:

| Peran | Email | Password |
|---|---|---|
| Admin | `admin@etnojourney.id` | `Admin12345!` (atau `SEED_ADMIN_PASSWORD`) |
| Traveller | `traveler@etnojourney.id` | `Traveler123!` |

Ganti kredensial ini sebelum dipakai di production.

## Arsitektur

```
src/
  app/[locale]/        Presentation: (site) publik + akun, (auth) login/daftar, admin
  features/<fitur>/    Application: server actions, skema Zod, komponen fitur
  server/services/     Domain: aturan bisnis (kapasitas, harga, transisi status)
  server/repositories/ Data access: satu-satunya layer yang menyusun query Drizzle
  server/db, auth/     Infrastruktur: schema, koneksi, Better Auth, guard
  components/          UI bersama: ui (primitif), layout, shared (TourCard, dll.)
messages/<locale>/     Teks UI per namespace
drizzle/               Migrasi SQL
```

Detail konvensi ada di [`AGENTS.md`](AGENTS.md), dan desain lengkap di [`docs/superpowers/specs`](docs/superpowers/specs).

### Alur booking dan pembayaran

1. Traveller login, memilih tanggal (minimal H+3) dan jumlah peserta.
2. Server menghitung harga dari database dan mengecek sisa kuota di dalam transaksi dengan row lock, sehingga tidak terjadi overbooking.
3. Booking tercatat `pending` dengan kode `EJ-XXXXXX`, dan email konfirmasi dikirim.
4. Traveller menekan **Bayar sekarang** dan diarahkan ke halaman pembayaran Midtrans. Webhook `POST /api/payments/midtrans` memverifikasi signature dan jumlah, lalu menandai pembayaran `paid` dan booking `confirmed` secara otomatis.
5. Selama belum dibayar, traveller bisa membatalkan. Admin tetap bisa mengubah status secara manual: `pending → confirmed | cancelled`, `confirmed → completed | cancelled`.
6. Setelah perjalanan `completed`, traveller bisa menulis satu ulasan per booking. Rating tur dihitung ulang otomatis, dan admin bisa menyembunyikan ulasan di `/admin/reviews`.

### Integrasi eksternal

| Layanan | Env | Tanpa konfigurasi |
|---|---|---|
| Midtrans (pembayaran) | `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION` | Di development memakai simulator `/payment/simulate`. Di production, pembayaran ditolak. |
| Resend (email) | `RESEND_API_KEY`, `MAIL_FROM` | Email ditulis ke log server. |
| Penyimpanan gambar | `UPLOAD_DIR` (default `./storage/uploads`) | Disk lokal. Adapter `Storage` siap diganti ke S3. |

Di dashboard Midtrans, arahkan *Payment Notification URL* ke `https://<domain>/api/payments/midtrans` dan *Finish Redirect URL* ke `https://<domain>/payment/finish`.

### Keamanan

- Password di-hash oleh Better Auth; cookie sesi httpOnly, `SameSite=Lax`, `Secure` di production.
- Rate limit pada endpoint login dan daftar.
- Semua input divalidasi Zod di server; harga tidak pernah diambil dari client.
- Otorisasi dicek di setiap server action dan layout terproteksi (`requireUser`, `requireAdmin`), termasuk kepemilikan booking.
- Header keamanan: CSP, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`, `Permissions-Policy`, `nosniff`.
- Parameter redirect setelah login hanya menerima path relatif (mencegah open redirect).
- Rate limit per IP pada login, daftar, lupa password, dan reset password (in-memory; pakai Redis jika berjalan di banyak instance).
- Reset password tanpa membocorkan apakah email terdaftar; token berlaku 1 jam dan semua sesi lain dikeluarkan.
- Webhook pembayaran diverifikasi dengan signature SHA-512 (perbandingan timing-safe) dan jumlah dicocokkan dengan database.
- Upload gambar hanya untuk admin. Format diverifikasi dari isi file, gambar di-encode ulang ke WebP tanpa metadata (EXIF/GPS), dan path file dibuat oleh server.

## Deploy

### Docker

Image production dibangun dari `Dockerfile` (multi-stage, output `standalone` Next.js, berjalan sebagai user non-root). Saat container start, migrasi di `./drizzle` diterapkan otomatis, lalu server berjalan di port 3000.

```bash
docker build -t etnojourney .
docker run -d --name etnojourney -p 3000:3000 \
  --env-file .env.production \
  -v etnojourney-uploads:/app/storage/uploads \
  etnojourney
```

Atau dengan Compose (database + app), cara termudah untuk mencoba versi production di laptop:

```bash
# Jika port 5432 sudah dipakai Postgres lokal, pilih port host lain untuk database.
DB_HOST_PORT=5544 docker compose --profile app up -d --build

# Isi data contoh ke database container (dijalankan dari host lewat port tadi).
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5544/etnojourney npm run db:seed

open http://localhost:3000                       # login: traveler@etnojourney.id / Traveler123!
docker compose --profile app logs -f app         # log aplikasi
docker compose --profile app down                # berhenti (data tetap di volume)
docker compose --profile app down -v             # berhenti dan hapus data
```

Compose membaca rahasia dari `.env` (minimal `BETTER_AUTH_SECRET`), mengarahkan app ke database container, dan memakai `http://localhost:3000` sebagai URL publik. Ubah lewat `APP_URL`, `APP_HOST_PORT`, dan `DB_HOST_PORT`. Container berjalan dalam mode production, jadi simulator pembayaran tidak tersedia: tanpa `MIDTRANS_SERVER_KEY`, tombol bayar menampilkan pesan "pembayaran tidak tersedia".

- **Health check**: `GET /api/health` mengembalikan `200 {"status":"ok","db":"ok"}`, atau `503` jika database tidak terjangkau. Dipakai oleh `HEALTHCHECK` di image dan cocok untuk load balancer.
- **Validasi env**: server menolak start jika konfigurasi salah. Daftar variabel yang bermasalah ditulis ke log tanpa menampilkan nilainya (`src/server/env.ts`).

### Variabel env production

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | `postgres://...` |
| `BETTER_AUTH_SECRET` | Ya | Minimal 32 karakter (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Ya | URL publik dengan `https://` |
| `SITE_URL` | Ya | URL publik untuk canonical, sitemap, Open Graph |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION` | Disarankan | Tanpa key, pembayaran online ditolak |
| `RESEND_API_KEY`, `MAIL_FROM` | Disarankan | Tanpa key, email tidak terkirim |
| `UPLOAD_DIR` | Tidak | Default image: `/app/storage/uploads` (volume) |
| `TRUST_PROXY`, `TRUSTED_PROXIES` | Lihat di bawah | Pembacaan IP klien untuk rate limit |

### Midtrans

Di dashboard Midtrans (Settings > Payment):

- *Payment Notification URL*: `https://<domain>/api/payments/midtrans`
- *Finish Redirect URL*: `https://<domain>/payment/finish`

### Reverse proxy

Jalankan di belakang reverse proxy (Nginx, Caddy, Cloudflare) yang menangani HTTPS. Set `TRUST_PROXY=true` **hanya** jika app tidak bisa diakses langsung selain lewat proxy, lalu pastikan proxy menimpa header `X-Forwarded-For`, atau isi `TRUSTED_PROXIES` dengan IP proxy. Jika tidak, header bisa dipalsukan untuk menghindari rate limit login.

Tanpa `TRUST_PROXY`, rate limit tetap berjalan per akun (email), tetapi tidak per IP. Sengaja tidak ada batas bersama untuk semua pengunjung, karena batas seperti itu bisa dipakai penyerang untuk mengunci login semua user. Endpoint HTTP Better Auth untuk login, daftar, dan reset password juga ditutup; aplikasi memakainya lewat server action.

Jika folder upload di-*bind mount* dari host (bukan named volume), pastikan bisa ditulis oleh user aplikasi di container (uid 1001): `sudo chown -R 1001:1001 /path/di/host`.

### Checklist sebelum peluncuran

- [ ] `SITE_URL`, `BETTER_AUTH_URL` (https), `BETTER_AUTH_SECRET` baru (`openssl rand -base64 32`).
- [ ] `CONTACT_EMAIL` (wajib secara praktis), `CONTACT_PHONE`, `CONTACT_ADDRESS`: tanpa ini situs tidak menampilkan kontak sama sekali, padahal FAQ dan kebijakan merujuk tamu untuk menghubungi kamu.
- [ ] Midtrans production: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=true`, URL notifikasi dan finish di dashboard.
- [ ] Resend: `RESEND_API_KEY`, domain pengirim terverifikasi, `MAIL_FROM`.
- [ ] Halaman Kebijakan pembatalan, Privasi, dan Syarat ditinjau ahli hukum; ganti placeholder `[Nama badan usaha]` dan `[Alamat terdaftar]` di `messages/*/pages.json`.
- [ ] Ganti akun demo hasil seed (atau jangan jalankan seed di production) dan ulasan contoh.
- [ ] Foto: ganti foto Unsplash dengan foto asli dari desa mitra lewat panel admin.
- [ ] `TRUST_PROXY` sesuai topologi deploy (lihat di atas).

### Backup

Yang perlu di-backup secara rutin:

1. **Database**: `pg_dump --format=custom "$DATABASE_URL" > etnojourney-$(date +%F).dump`
2. **Gambar upload**: isi volume `/app/storage/uploads`, misalnya `docker run --rm -v etnojourney-uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .`

Uji restore secara berkala di environment terpisah.

## Testing

| Perintah | Isi |
|---|---|
| `npm test` | Unit test aturan bisnis (Vitest) |
| `npm run test:e2e` | 36 skenario end-to-end di browser (Playwright) |
| `npm run test:all` | Lint, typecheck, unit, lalu E2E |

Suite E2E berjalan terhadap **build production** di port 3460 dan **database terpisah** `etnojourney_test`, jadi data development tidak pernah tersentuh.

- Global setup membuat database itu jika belum ada, lalu menerapkan migrasi dan menjalankan seed di awal setiap run. Untuk memakai database lain, set `E2E_DATABASE_URL`; namanya wajib berakhiran `_test`, kalau tidak suite menolak berjalan.
- Secara lokal Playwright memakai Google Chrome yang terpasang. Di CI, Chromium dipasang otomatis.
- Server yang sudah berjalan di port 3460 dipakai ulang secara lokal. Matikan dulu kalau kode berubah supaya build-nya baru.

Cakupan:
- Browsing publik: filter, pencarian, 404, JSON-LD, canonical.
- Auth: login salah, daftar, proteksi open redirect, lupa password tanpa membocorkan apakah email terdaftar.
- Booking: buat booking, tolak tanggal di bawah H+3 di server, batalkan.
- Wishlist dan ulasan.
- Admin: proteksi halaman, regresi kebocoran data lewat replay RSC tanpa cookie, konfirmasi booking, tayang/sembunyikan tur.
- Webhook Midtrans: signature palsu, settlement valid yang idempoten, jumlah yang dimanipulasi.
- Pindah bahasa, reduce motion, tanpa JavaScript, layout mobile.

Pembayaran diuji lewat webhook, bukan tombol bayar. Dengan key Midtrans dummy, memulai pembayaran dari UI akan memanggil API Midtrans sungguhan, jadi baris pembayaran pending disiapkan langsung di database uji dan hanya notifikasinya yang dikirim lewat HTTP. Itu jalur yang sama dengan yang dipakai Midtrans di production.

CI (`.github/workflows/ci.yml`) menjalankan lint, typecheck, unit, dan E2E dengan PostgreSQL 17 di setiap push ke `main` dan setiap pull request. Laporan Playwright diunggah kalau ada yang gagal. Semua secret di CI adalah nilai dummy.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development |
| `npm run build` / `start` | Build dan jalankan production |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test aturan bisnis (Vitest) |
| `npm run db:generate` | Buat migrasi dari perubahan schema |
| `npm run db:migrate` | Terapkan migrasi |
| `npm run db:seed` | Isi data contoh |
| `npm run db:studio` | Drizzle Studio |

## Konten dan foto

Destinasi, tur, dan kredit foto disimpan sebagai JSON di [`content/`](content/README.md) dan dimuat oleh seed. Fakta budaya disertai daftar sumber per wilayah. Semua foto berlisensi terbuka (Wikimedia Commons: CC0, CC BY, CC BY-SA; dan Unsplash), disimpan sebagai WebP di `public/images/content/`, dan kreditnya tampil di situs (galeri, hero destinasi, dan halaman `/credits`).

```bash
node scripts/content/import-photo.mjs <wilayah> <slug-destinasi> <nama> "File:Foto.jpg"
npx tsx scripts/content/validate.ts
```
