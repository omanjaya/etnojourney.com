## Ringkasan

<!-- Apa yang berubah dan kenapa. -->

## Checklist

- [ ] Mengikuti konvensi di `AGENTS.md` (layer, i18n id + en, tanpa emoji, otorisasi di server)
- [ ] Halaman/aksi terproteksi memanggil `requireUser()`/`requireAdmin()` sendiri
- [ ] Ada tes untuk perilaku baru (unit di `src/**/*.test.ts` atau E2E di `e2e/specs`)
- [ ] Perubahan schema disertai migrasi (`npm run db:generate`)
- [ ] Tidak ada rahasia atau data pribadi asli di kode, seed, atau screenshot
