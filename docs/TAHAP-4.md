# Tahap 4: Delivery "Kurir Apel" + perbaikan dari uji coba

## A. Perbaikan dari uji coba di browser
| Keluhan | Penyebab | Perbaikan |
|---|---|---|
| Ular Puzzle kaku | Posisi melompat antar-sel tanpa interpolasi | Tiap segmen meluncur (120 ms, ease-out), tikungan dibulatkan, efek pop (makan/kunci) dan riak (portal), undo ikut meluncur. Loop RAF hanya hidup selama animasi. Menghormati `prefers-reduced-motion`. Simulasi tetap berbasis langkah. |
| Suara "eits" tidak cocok | Gerakan tertahan memakai suara peringatan bahaya padahal Puzzle tidak bisa mati | Bunyi sintetis lembut: tumbukan (`playBump`), pintu terkunci (`playLocked`), menang (`playWin`). Berbalik arah senyap. "Eits" tidak lagi dipakai di Puzzle. |
| Latar mode baru "polos" | Hanya gradien CSS cadangan (tidak ada ilustrasi) | Ilustrasi SVG buatan sendiri: `bg-puzzle.svg` (aula dungeon) dan `bg-delivery.svg` (jalan kota senja). Gradien tetap sebagai cadangan. |
| Arena Sempit tanpa animasi | Di mode non-Hard `bi = 3` instan | Semua mode Mayhem: menyempit **1 ubin demi 1 ubin** (`SHRINK.tileMs` = 1,5 dtk/ubin, ring merah sebagai peringatan), bertahan **15 dtk** (`EFFECTS.shrink.dur`, tidak termasuk animasi), lalu melebar. HUD hanya menghitung lama bertahan. Makanan di luar arena dipindah tiap ubin menutup. |

Catatan: durasi 15 dtk kuambil dari ceritamu; kalau di salinan lokalmu sudah kamu ubah, nilainya kini ada di `lib/constants.js`. Mode Hard/Impossible kini memakai mekanisme yang sama (sebelumnya menyempit linear selama 0,85 × durasi), jadi perilakunya berubah di sana.

## B. Delivery
**Arsitektur:** `lib/delivery/sim.js` (murni) · `controller.js` (lifecycle, jam simulasi, penjadwal langkah, HUD, rekor) · `render.js` · `lib/records.js` · memakai ulang `sim/clock`, `sim/grid`, `sim/anim`, `render/snakePath`.

**Aturan**
- Arena 17×15 dengan gedung sebagai rintangan; rumah tujuan A/B/C tetap. Tabrak tembok/gedung/tubuh = shift gagal.
- Pesanan aktif maks **2**; kapasitas kargo **3** (parameter awal di `DEFAULT_CONFIG`). Tiap paket = **1 segmen kargo di ekor**; tubuh dasar (`baseLen`) dan kargo dicatat terpisah. Invarian: `panjang = baseLen + kargo`. Mengantar/membuang kargo memendekkan **ekor** saja; kepala tidak pernah terpotong.
- Rumah menerima **paket tertua yang cocok**, **satu per kali masuk**; kiriman berikutnya perlu keluar-masuk lagi.
- Pickup saat kargo penuh: kepala lewat, paket tetap menunggu, tubuh tidak tumbuh.
- Umur paket (sejak diambil) = jarak rute statis terpendek × interval gerak × 2,2 + 5 dtk. Interval tetap per kecepatan (tidak naik seiring skor), jadi deadline adil di semua kecepatan. Paket basi: kargo dibuang, skor −5 (minimal 0), slot pesanan kosong; pesanan baru muncul setelah jeda 0,8 dtk. Pesanan yang belum diambil tidak basi.
- Skor: 10 per pengantaran, +5 bila sisa umur ≥ 50%.
- Shift 120 dtk (tetap), target 5. Menang bila terkirim ≥ 5 saat waktu habis.
- **Prioritas event:** deadline == t masih sah (pengantaran pada t yang sama menang atas basi); sesudahnya basi diproses lebih dulu. Langkah yang jatuh tepat di akhir shift diproses **sebelum** hasil dievaluasi. Pause membekukan semuanya (jam simulasi).
- Titik pickup tidak di tubuh/rintangan/rumah/pickup lain, dan hanya dari sel yang **secara statis** terjangkau dari posisi awal (BFS tanpa tubuh). **Batasan:** itu bukan jaminan terhadap tubuh yang bergerak; ular panjang bisa menutup jalur sementara.
- Rekor di `snake-records-v1`, dipisah per mode **dan** konfigurasi (`delivery|shift:120|target:5|speed:<pref>`); disimpan sekali saat shift selesai. `snake_best` lama tidak dimigrasikan (asal modenya tidak diketahui).

**Menu & HUD:** layar Petualangan memuat tujuan, pratinjau 3 aturan, kontrol, durasi shift **tetap** (bukan chip palsu), chip kecepatan yang benar-benar berlaku, dan rekor per kecepatan. HUD: waktu shift, terkirim/target, tiga slot kargo (ikon + huruf + sisa detik; slot ≤ 3 dtk bertanda `data-low`), pesanan aktif dengan arahan teks. Warna paket selalu didampingi ikon dan huruf.

## C. Test (134 → lihat `npm test`)
Delivery: arena valid/invalid, 200 seed spawn pickup, kelayakan deadline (semua sel × tipe × interval), pickup, **kapasitas penuh**, antar tertua-dulu dan **dua paket identik**, **posisi ekor setelah kargo dihapus**, basi (batas deadline, skor min 0), pengantaran vs basi pada t yang sama, **pengantaran di detik terakhir**, **pause tidak membasikan paket**, hasil/penyimpanan sekali, rekor per konfigurasi, fuzz sim 60 seed × 2500 langkah dan fuzz controller. Mutasi (6) pada aturan inti tertangkap semua.
Puzzle: interpolasi (`animatedPoints`), jalur halus, loop animasi berhenti sendiri, suara tanpa eits.
Mayhem: shrink bertahap (ubin ke-1/2/3, bertahan 15 dtk, melebar), relokasi makanan, HUD.

## D. Belum diverifikasi di browser
Rasa gerak (kecepatan Delivery, durasi luncur Puzzle 120 ms, kecepatan shrink 1,5 dtk/ubin), keseimbangan (umur paket, target 5 dalam 120 dtk, jarak pickup), kenyaringan bunyi sintetis, tampilan di viewport kecil/landscape HP, dan pergantian controller antar-mode di React. Yang sudah diperiksa: SSR markup menu/HUD, gambar Canvas arena Delivery dan level Puzzle, serta kedua ilustrasi latar lewat renderer SVG.
