# Tahap 8: Menu laptop 2 kolom + perapian akhir

Tidak ada perubahan aturan game, engine, atau balance. Hanya UI menu/header dan dokumentasi.

## Yang berubah
- **Menu awal arkade (laptop, layar >= 640 px):** dua kolom. Kiri: pilih grup + mode + deskripsi. Kanan: kecepatan/durasi, tombol Petualangan, PLAY. Di HP, portal samping landscape, dan mode kidal tetap satu kolom seperti sebelumnya.
- **Menu Petualangan (laptop):** lima mode dalam satu baris (bukan 3+2), sehingga PLAY tidak terdorong keluar panel. Teks "Tujuan:" yang sebelumnya patah (flex) diperbaiki.
- **Header HUD saat menu awal:** kartu statistik mode (Puzzle/Delivery/Roguelite/Boss/Rebut Arena) disembunyikan selama menu awal tampil. Sebelumnya kartu itu (Waktu 1:30, P1/P2 0%, dst.) muncul di atas menu dan mendorong kanvas ke bawah. Kartu tetap tampil saat bermain dan di layar hasil.
- Berkas: `components/Overlay.jsx`, `components/Hud.jsx`, `app/page.js` (prop `hideStats`), `app/globals.css` (blok "Tahap 8").

## Pemeriksaan (Chromium headless, emulasi viewport; bukan HP/laptop fisik)
- Overflow panel menu (`scrollHeight - clientHeight`) = 0 untuk menu arkade dan kelima mode Petualangan di 1366x768 dan 1280x720.
- Screenshot ditinjau: 1366x768, 800x600 (arkade); 1366x768 (Petualangan); 740x360 sentuh (tidak berubah).
- `npm test`: 216 lulus. `npm run build`: sukses, rute `/` 180 kB First Load JS (tidak berubah).

## Belum diperiksa
Layar fisik (HP/laptop), 360/390/768 px untuk menu baru, 844x390 dan 640x360 landscape secara visual, kontras/fokus keyboard menu 2 kolom (urutan Tab: kolom kiri lalu kanan), rasa main dan balance semua mode baru.
