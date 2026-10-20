# Eat-eat — UI Fokus

Tanggal: 18 Oktober 2026. Basis: `Eat-eat-main-tahap-9.zip`.

Rombakan ini menerapkan pilihan desain **Fokus** ke aplikasi Next.js asli. Menu menggunakan latar krem, teks hijau gelap, kontrol sederhana, dan satu keluarga ilustrasi kartun. Versi lama dan ZIP sumber tetap terpisah dari hasil ini.

## Perubahan utama

- Menu tidak lagi dipaksa mengikuti ukuran kanvas permainan. Desktop memakai ruang maksimum 1000 px; HP memakai satu kolom yang dapat digulir.
- Header berisi identitas eat·eat, pilihan Arkade/Petualangan, dan bantuan.
- Pemilih Arkade tetap dua tingkat: Classic / Mayhem / 2P Lokal, kemudian tombol sub-mode. Memilih grup memilih sub-mode pertamanya.
- Label sub-mode diperbesar dan `Time Attack` ditampilkan lengkap. Status aktif memakai border, glow ringan, titik penanda, serta `aria-pressed`.
- Deskripsi mode tampil dekat pilihan. Petualangan memiliki deskripsi singkat dan detail aturan yang dapat dibuka bila diperlukan. Pilihan level, syarat buka-kunci, dan rekor tetap berasal dari controller.
- Kecepatan Santai / Normal / Ngebut / Konstan, kunci Ngebut pada Impossible, dan durasi 30/60/90/120 detik tetap tersedia sesuai mode.
- Pada layar sentuh, 2P Lokal dan Rebut Arena disembunyikan dengan penjelasan bahwa keduanya memerlukan keyboard.
- Banner menampilkan scene khusus setiap mode. Gambar memakai `contain`, rasio asli, dan komposisi karakter di kanan; bukan gambar portrait yang dipotong paksa menjadi banner.
- Animasi nama masuk dari kiri dan zoom/flash ketika mulai tetap tersedia. Drift sangat pelan hanya pada perangkat non-sentuh. Preferensi reduced motion dihormati.
- Menu portrait HP dapat dibuka. Menekan Mulai meminta rotasi tanpa menjalankan ronde di belakang prompt. Prompt bisa dibatalkan. Gameplay tetap landscape seperti basis tahap 9.
- Menu HP landscape tetap menggunakan portal ke panel samping. Pengaturan dapat digulir dan tombol Mulai tetap terlihat.
- Layar jeda/hasil memakai kartu baru, maskot per mood, tint, dan confetti saat menang. Aksi hasil tetap menggunakan callback controller, termasuk Level Berikutnya.
- HUD, bantuan, pilihan upgrade, loading, dan joystick diselaraskan. Tombol Jeda tersedia pada desktop. Loading hanya menunggu aset awal yang diperlukan, bukan seluruh koleksi scene.
- Fokus keyboard, label kontrol, dialog, dan penghalang input saat modal dibuka diperjelas.

## Aset baru

| Aset | Jumlah | Format dan penggunaan |
| --- | ---: | --- |
| Scene mode | 15 desain × 2 resolusi | WebP desktop 1672 × 941; HP 960 × 540 |
| Maskot mood | 5 | PNG transparan 320 × 320 |
| Apel, bom, portal | 10 | PNG transparan 128 × 128 |
| Ikon aplikasi | 2 | PNG 192 × 192 dan 512 × 512 |

Aset siap aplikasi berada di `public/assets/game/`; ikon aplikasi di `public/`. Seluruh file yang dipakai aplikasi sudah berada di ZIP, tanpa bergantung pada lokasi gambar sementara. Aset raster dibuat menggunakan image generation bawaan, dikurasi, lalu diperkecil dan dikompresi. Ini bukan klaim ilustrasi buatan tangan. Prompt dan aturan konsistensi ada di `docs/ASSET_FOKUS.md`.

## File yang berubah

| File | Perubahan |
| --- | --- |
| `app/page.js` | Pemisahan layout menu/papan, alur menu portrait dan pending-play, penghalang input modal |
| `app/globals.css` | Sistem warna/spacing Fokus, layout responsif, banner, tombol, dialog, HUD, joystick; CSS menu lama yang bertabrakan dibersihkan |
| `app/layout.js`, `app/manifest.js` | Nama Eat-eat, deskripsi, warna chrome aplikasi; orientasi PWA landscape tetap |
| `components/Overlay.jsx` | Header, banner, menu dua tingkat, detail Petualangan, portal, tombol mulai, kartu hasil, akses keyboard |
| `components/BackgroundLayer.jsx` | Scene WebP responsif, transisi ringan, animasi mulai; loop partikel dekoratif lama dihapus |
| `components/Hud.jsx` | Tombol jeda desktop dan nama tampilan Eat-eat |
| `components/HelpModal.jsx` | Tampilan dialog Fokus dan reduced motion |
| `components/LoadingScreen.jsx` | Loading ringkas dan preload aset awal |
| `components/RotatePrompt.jsx` | Tampilan baru, kembali ke menu, fokus keyboard |
| `components/UpgradeDialog.jsx` | Tampilan kartu konsisten; pilihan dan aturan upgrade tetap |
| `lib/sceneTheme.js` | Lima mode Petualangan kini menunjuk aset WebP nyata |
| `public/assets/game/*`, `public/icon-*.png` | Aset aktif diganti dengan keluarga kartun baru; scene mobile Petualangan ditambahkan |
| `tests/registry.test.mjs`, `tests/boss.test.mjs`, `tests/territory.test.mjs` | Ekspektasi aset/selector lama disesuaikan; pemeriksaan berkas WebP dan ukuran aset |

`UI_FOKUS.diff` berisi diff per file, termasuk perubahan biner aset. Gunakan source lengkap dalam ZIP untuk menjalankan hasil; diff disediakan untuk review terhadap tahap 9.

## Yang sengaja tidak diubah

- `lib/gameEngine.js`, seluruh simulasi/controller/renderer mode, dan `components/GameCanvas.jsx`.
- Aturan collision, skor, spawn, nyawa, timer, difficulty, generator/solver, serta 50 level Puzzle.
- Warna papan dan logika gerakan joystick. Joystick hanya mendapat gaya CSS baru.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, `snake_best`, serta penyimpanan progres lain.
- Dependency, lockfile, bahasa JavaScript, susunan folder aplikasi, dan backend. Tidak ada fitur online multiplayer.
- Perilaku bantuan/visibility-pause yang sudah ada pada tahap 9 dipertahankan, bukan ditambahkan dari versi redesign lama.

## Menjalankan

```sh
npm ci
npm run dev
```

Build produksi:

```sh
npm run build
npm start
```

Tes logika dalam mode serial:

```sh
node --test --test-concurrency=1 "tests/**/*.test.mjs"
```

## Verifikasi

- **`npm run build` lolos**, termasuk kompilasi, pemeriksaan tipe/lint bawaan build, dan generasi halaman.
- **253/253 tes lolos** dengan runner serial.
- Browser Chromium: seluruh 15 mode diuji melalui pilih → mulai → jeda → lanjut → bantuan → lanjut → kembali ke menu.
- Tutorial Puzzle pertama diselesaikan dengan input keyboard: 15 langkah, layar menang muncul dan level berikutnya terbuka.
- Game over Classic diuji dengan menabrak batas arena.
- Lebar 360, 390, 768, 1366 px dan landscape sentuh 844 × 390 diperiksa. Tidak ditemukan overflow horizontal pada menu.
- Mode 2P disembunyikan pada emulasi sentuh; menu portrait, batal rotasi, rotasi untuk mulai, dan portal landscape diuji.
- Tidak ada error JavaScript pada rangkaian uji browser tersebut.
- Pemeriksaan diff memastikan file engine/controller/simulasi/storage dan dependency tidak berubah.

Pengujian HP menggunakan emulasi Chromium. Belum diuji pada perangkat fisik atau Safari iOS; kunci orientasi/fullscreen bergantung dukungan browser. Ini bukan audit keseimbangan atau pembuktian semua kemungkinan gameplay.

## Catatan logika untuk pekerjaan berikutnya

Temuan review tahap 9 berikut **belum diperbaiki** karena tahap ini berfokus pada UI. Jangan menganggap aset/UI baru menyelesaikannya.

1. **Collision 2P saat respawn.** Pisahkan daftar pemain yang bergerak dari occupancy tubuh. Pemain yang baru respawn tidak bergerak pada tick itu, tetapi tubuhnya tetap perlu masuk pemeriksaan collision. Tambahkan tes lawan memasuki kepala/tubuh/ekor respawn.
2. **Timestamp makanan setelah Main Lagi.** Audit urutan `reset()` dan `clock.reset()` pada engine arkade. Dunia baru harus membuat deadline relatif terhadap jam ronde baru. Uji retry setelah ronde 60 detik, termasuk reveal racun dan expiry item.
3. **Race cache test.** Helper test memakai folder cache bersama. `npm test` default masih berisiko bentrok saat file berjalan paralel. Perintah serial di atas dipakai untuk validasi ini; perbaikan permanen sebaiknya memberi cache terisolasi per proses atau build fixture sekali sebelum test.

Backend dan pengembangan gameplay sebaiknya menjadi perubahan terpisah dengan spesifikasi serta pengujian tersendiri.
