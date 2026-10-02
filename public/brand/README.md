# Brand assets

Derived from the client's logo (white artwork on brown `#7A654F`). All logo
files are transparent PNGs of the same size (1005x491) so they swap freely.

| File | Use |
| --- | --- |
| `logo-{ink,white,brown}.png` | Compact wordmark (no "pathback"); header, nav. `<Logo />` |
| `logo-full-{ink,white,brown}.png` | Full wordmark with "pathback"; footer, auth, social card. `<Logo full />` |
| `logo-full-on-brown.png` | Full logo on the brand brown, padded; for sharing outside the site |
| `mark-mandala-{white,brown}.png` | The mandala alone |
| `icon-192.png`, `icon-512.png` | Web app manifest icons (`src/app/manifest.ts`) |
| `icon-maskable-512.png` | Maskable manifest icon (safe-zone padding) |

App-level icons live in `src/app/`: `favicon.ico` (16/32/48, the spiral of the
"j": the mandala is unreadable at those sizes), `icon.png` and `apple-icon.png`.

Colours: brown `#7A654F`, ink `#1D1A16`, white.
