# K-Snake (Next.js)

Riwayat perubahan, detail revisi, prompt aset dan diff tersedia di [changelog.md](changelog.md).

Game ular berbasis Next.js App Router dengan mode Arkade, Dungeon, Kurir Apel, Ekspedisi, dan Rebut Arena untuk dua pemain lokal.

## Cara jalanin

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Struktur

- `lib/gameEngine.js` — mesin Arkade (state, tick, collision dan render Canvas).
- `lib/puzzle/`, `lib/delivery/`, `lib/roguelite/`, `lib/boss/`, `lib/territory/` — simulasi, controller dan render mode petualangan.
- `lib/constants.js` — konstanta (ukuran papan, daftar efek, teks bantuan per mode).
- `hooks/useSounds.js` — pemutar sound + fix prioritas: begitu snake mati, sound "eits" langsung dipotong biar nggak numpuk sama sound mati ("bruh").
- `components/GameCanvas.jsx` — canvas + kontrol keyboard/swipe.
- `components/Hud.jsx`, `Overlay.jsx`, `HelpModal.jsx`, `DPad.jsx` — UI.
- `public/sounds/` — file suara: `chomp.mp3`, `eits.mp3`, `death.mp3` (roblox/"bruh"), `poison-death.mp3` (movie_1.mp3), `move.wav` (di-extract dari base64 file HTML lama, karena file aslinya udah nggak ada).

## Catatan

- Sound gerak (`move.wav`) itu hasil extract dari file HTML lama (base64), bukan dari file asli temenmu — kalau ada file aslinya, tinggal timpa `public/sounds/move.wav`.
- Volume `eits` & `move` sengaja diturunin (~25% dari default) sesuai request sebelumnya.


## Test

`npm test` menjalankan tes regresi. Riwayat cakupan serta hasil verifikasi tiap revisi tersedia di [changelog.md](changelog.md#riwayat-ringkas).
