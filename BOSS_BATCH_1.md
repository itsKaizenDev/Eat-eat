> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](ADVENTURE_REVISION.md).

# Eat-eat — Batch 1: Penjaga Kebun

Basis: **Eat-eat Fokus UI**, kelanjutan dari `Eat-eat-main-tahap-9.zip`. Tidak ada ZIP unggahan lebih baru yang tersedia pada saat pengerjaan. Perubahan ini berisi implementasi, bukan hanya rancangan.

## Yang sudah dikerjakan

- Ronde 1–9 berisi antek; boss baru tampil pada ronde 10.
- Tiga varian boss acak dengan warna, nama, dan kecenderungan pola berbeda.
- Tiga fase boss dengan HP 3 → 4 → 5; total 12 HP.
- Jeda serangan makin pendek, ranjau makin banyak, dan fase terakhir memberi damage 2 hati.
- Celah untuk menyerang bertambah dari 1 → 2 → 3 target.
- Heal dapat dikumpulkan menjadi simpanan hati di atas jumlah awal. HUD menggunakan satu ikon hati × jumlah.
- Enam ilustrasi menu diperbarui: Mayhem, Mayhem+, Hard, Impossible, 2P Lokal, dan Mayhem Duo. Masing-masing memiliki WebP desktop dan HP.
- Aturan bantuan, deskripsi menu, HUD, hasil permainan, dan rekor disesuaikan.

**Batch 2 belum diimplementasikan:** bom/roket untuk Rebut Arena. Perubahan ilustrasi Duo pada batch ini tidak menambah senjata pada gameplay.

## Alur permainan

| Ronde | Lawan | Jumlah antek | Energi per pukulan |
| --- | --- | --- | --- |
| 1–3 | Antek acak | 1 per ronde | 1 |
| 4–6 | Antek acak | 2 per ronde, bergiliran | 1 |
| 7–9 | Antek acak | 3 per ronde, bergiliran | 1 |
| 10 | Boss acak, tiga fase | — | 3 |

Total 18 antek sebelum boss. Setiap antek kalah dengan satu pukulan sah. Lawan berikutnya menyerang setelah jeda, bukan serentak. Pemain tetap bergerak selama transisi, tetapi ancaman dibersihkan.

Antek:

| Nama | Pola |
| --- | --- |
| Si Biji | Baris dan ranjau |
| Jamur Usil | Ranjau dan baris |
| Duri Bandel | Koridor dan baris |

Pola diawali arsiran peringatan. Bahaya aktif ditandai X atau bom. Koridor aman memiliki penanda tersendiri. Setelah serangan selesai, bintang titik lemah terbuka; masuk ke bintang dengan energi cukup untuk menyerang. Area tubuh musuh di atas papan tetap merupakan penghalang.

## RNG boss

Varian dipilih saat run dibuat. Pemilihan varian dan pola menggunakan RNG yang diinjeksi; test dapat mengulang seed yang sama.

| Boss | Pola favorit |
| --- | --- |
| Akar Gahar | Baris berbahaya |
| Raja Spora | Ranjau kebun |
| Sulur Liar | Koridor menyempit |

Ketiga boss dapat menggunakan ketiga pola. Pola favorit mendapat bobot tambahan ketika tersedia. Pola yang baru digunakan dikeluarkan dari pilihan berikutnya. Jika generator pola tidak dapat menghasilkan kondisi aman, sistem memakai baris sebagai fallback; fallback dapat menjadi pengecualian larangan pengulangan.

Ini bukan tiga boss dengan sistem AI yang sepenuhnya terpisah. Variasinya berada pada identitas visual, bobot pola, posisi bahaya, dan urutan serangan. Pendekatan ini menjaga aturan tetap mudah dibaca pemain.

## Fase dan keseimbangan awal

| Parameter | Fase 1 | Fase 2 | Fase 3 |
| --- | ---: | ---: | ---: |
| HP lapisan | 3 | 4 | 5 |
| Damage serangan | 1 hati | 1 hati | 2 hati |
| Titik lemah per jendela | 1 | 2 | 3 |
| Jeda sebelum pola berikutnya | 1.6 dtk | 0.9 dtk | 0.4 dtk |
| Pengali durasi aktif/pemulihan | 1 | 0.7 | 0.45 |
| Jendela menyerang dasar | 6 dtk | 5 dtk | 4.2 dtk |
| Jumlah ranjau | 4 | 6 | 8 |

Contoh siklus pola baris tanpa pukulan/interupsi: sekitar **10.60 → 8.48 → 6.83 detik**. Frekuensi serangan meningkat tiap fase; angka ini bukan jumlah proyektil per detik. Durasi sebenarnya dapat bertambah untuk memberi waktu tempuh yang aman.

Peringatan tidak dipercepat secara membabi buta: batas minimum tetap mengikuti jarak rute aman, interval gerak, margin langkah, dan waktu reaksi. Jendela titik lemah juga diperpanjang bila rute menuju target memerlukan waktu tambahan.

Setiap bintang hanya boleh dipukul sekali dalam satu jendela. Fase 2/3 memungkinkan beberapa pukulan pada **target berbeda** jika energi cukup. Mengulang masuk bintang yang sama tidak memberi damage lagi. Semua bahaya berhenti selama jendela terbuka.

Fase berubah setelah HP lapisan habis dan transisi 2.2 detik selesai. HP total tidak diisi ulang. Setiap pukulan mengurangi 1 HP; serangan bos fase terakhir mengurangi 2 hati pemain. Tabrakan dinding, tubuh sendiri, atau area musuh tetap mengurangi 1 hati.

## Hati, heal, dan energi

- Mulai dengan **5 hati**; tampilan `♥ × 5`.
- Heal menambah jumlah hati saat dipungut, termasuk di atas 5. Tidak ada batas maksimum 5 hati.
- Setiap ronde antek tuntas menghasilkan heal **+1**.
- Setiap pergantian fase boss menghasilkan heal **+2**.
- Antek yang bukan antek terakhir dalam ronde memiliki peluang **25%** menjatuhkan heal tambahan. Antek terakhir sudah memberikan hadiah ronde yang pasti.
- Maksimum 3 objek heal di papan. Hadiah berikutnya digabung ke nilai pickup yang sudah ada; nilainya tidak dibuang. Jika papan tidak memiliki sel bebas, hadiah ditunda sampai tersedia sel.
- Heal tidak kedaluwarsa, tidak menambah energi, dan tidak memanjangkan tubuh. Pickup tidak memberi manfaat dua kali.
- Menunggu atau mengulang siklus serangan tidak menghasilkan heal tambahan; hadiah terkait kemajuan musuh/ronde/fase.
- Ada 3 apel energi. Setiap apel memberi +1 energi dan +1 segmen, dengan simpanan maksimum 9 energi.
- Pukulan memakai 1 energi untuk antek atau 3 untuk boss, serta memendekkan tubuh 3 segmen, minimum 3.
- Setelah terkena damage, pemain respawn aman dengan kebal bahaya sementara 2.5 detik. Kebal tidak membolehkan menabrak tembok.
- Retry/menu mereset ronde, HP, hati, energi, heal, target, dan serangan. Simpanan hati berlaku dalam run tersebut.

## Perbaikan logic

1. **Fase tidak lagi sama dengan jumlah pukulan.** `phaseHp` memisahkan lapisan fase dari `hp` total sehingga boss dapat lebih tebal.
2. **Serangan tidak lagi memakai urutan modulo tetap.** RNG berbobot memilih pola dan generator memilih posisi.
3. **Hadiah dipicu sekali.** Transisi ronde/fase idempoten; menunggu tidak menduplikasi heal.
4. **Multi-target tidak bisa difarm.** Setiap jendela menyimpan target yang sudah terkena.
5. **Damage dibawa oleh serangan.** Collision biasa tidak ikut berubah menjadi 2 hati; hasil tidak membuat hati negatif.
6. **Pause memakai jam simulasi.** Sisa telegraph/transisi tetap saat pause/help/orientasi.
7. **Hasil terminal aman.** HUD tidak membaca serangan yang sudah dibersihkan setelah kalah.
8. **Rekor baru terpisah.** Key konfigurasi menjadi `boss|v:2|hp:12|lives:5|rounds:10|speed:normal` untuk kecepatan Normal. Penyimpanan tetap `snake-records-v1`; entri boss lama tidak dihapus atau dimigrasikan.
9. **Rekor menyimpan progres ronde.** Selain kerusakan boss, kemenangan, dan waktu tercepat, menu menampilkan ronde tertinggi.

## Aset

Ilustrasi mempertahankan ukuran/aspek 16:9, area tenang di kiri, dan aksi karakter di kanan. Tampilan menu tetap memakai `contain`, sehingga gambar tidak dipotong untuk memenuhi panel.

- Mayhem: mata asimetris, ekspresi panik, apel/bom berhamburan.
- Mayhem+: ekspresi nekat dan overconfident dengan gerak tubuh lebih aktif.
- Hard: rahang tegang, alis tajam, menghindari racun/duri.
- Impossible: panik berlebihan dengan tubuh kusut dan bom.
- 2P Lokal: dua rival berebut apel; tubuh terpisah dan ekspresi kompetitif.
- Mayhem Duo: rival saling menyerang sambil berebut apel di antara bom.

Lokasi aset: `public/assets/game/bg-{mode}.webp` dan `bg-{mode}-m.webp`. Desktop lebar 1672 px, HP lebar 960 px. Prompt lengkap dan metode generasi ada di `docs/ASSET_BOSS_BATCH_1.md`.

Antek/boss di papan digambar melalui Canvas 2D, dengan siluet, palet, ekspresi, label, serta bilah HP per fase. Tidak memerlukan request gambar tambahan ketika bermain.

## File yang berubah

| File | Perubahan |
| --- | --- |
| `lib/boss/sim.js` | Ronde, antek, varian RNG, HP fase, multi-target, damage, heal |
| `lib/boss/controller.js` | HUD, pesan, hasil, rekor, integrasi lifecycle |
| `lib/boss/render.js` | Visual antek/boss, target jamak, pickup heal, HP fase |
| `lib/records.js` | Key boss v2, validasi HP baru, progres ronde |
| `components/Hud.jsx` | Ronde, antek/fase, heart × jumlah, celah dan nama musuh |
| `components/Overlay.jsx` | Ringkasan aturan baru dan rekor menu |
| `lib/constants.js` | Bantuan Penjaga Kebun |
| `lib/modes/registry.js` | Deskripsi, tujuan, pratinjau aturan boss |
| `app/globals.css` | Gaya ringkas jumlah hati |
| `tests/boss.test.mjs` | Fixture kontrak dasar disesuaikan; coverage lama dipertahankan |
| `tests/boss-campaign.test.mjs` | 12 test baru untuk aturan produksi |
| 12 file WebP | Enam scene desktop + HP |

## Yang tetap

`lib/gameEngine.js`, gameplay Arcade, semua controller mode lain, logika Rebut Arena, struktur menu dua tingkat, localStorage `snake-speed`, `snake-ta`, `snake-lefty`, dan `snake_best` tetap. Tidak menambah dependency, tidak mengubah JavaScript ke TypeScript, dan tidak menambah backend atau multiplayer online.

## Menjalankan

```bash
npm ci
npm run dev
```

Build dan test:

```bash
npm run build
node --test --test-concurrency=1 tests/**/*.test.mjs
```

Test dijalankan serial karena helper test bawaan menyalin modul ke satu folder cache bersama. Menjalankan file test paralel berisiko saling menghapus cache; infrastruktur test tersebut tidak diubah pada batch ini.

## Validasi

- Build produksi: **lolos**.
- Suite test: **265/265 lolos**.
- Test baru mencakup 18 antek/9 ronde, boss ronde 10, HP 3/4/5, tiga target, RNG, cadence, damage 2, stack heal, pause/transisi, reset, dan kompatibilitas rekor.
- Uji transisi penuh menggunakan fixture simulasi; ini bukan klaim menyelesaikan seluruh run secara manual dengan keyboard.
- Browser Chromium: desktop 1366 × 768; menu HP 360 × 800, 390 × 844, 768 × 1024; landscape 844 × 390. Tidak ada overflow horizontal pada menu yang diuji.
- Alur browser: start → pause/resume → bantuan → game over → retry/reset → kembali ke menu; portrait → rotasi → landscape dan CTA portal. Semuanya lolos.
- Keenam scene baru termuat; tidak ada error JavaScript selama pemeriksaan browser.
- Pengujian HP menggunakan emulasi browser, bukan perangkat fisik.

Angka keseimbangan merupakan setelan awal. Kelayakan logic sudah diuji; durasi dan tingkat kesulitan tetap perlu dirasakan lewat sesi bermain nyata sebelum dianggap final untuk semua pemain.

## Arah batch 2 — Rebut Arena

Belum dieksekusi. Sasaran berikutnya: bom atau roket untuk duel lokal, kontrol aksi terpisah untuk P1/P2, tanda serangan yang terbaca, cooldown/amunisi, dan aturan dampak pada jejak/wilayah/nyawa. Sebelum mengubahnya, tetapkan apakah ledakan merusak jejak saja atau juga mengurangi hati, serta aturan self-damage dan hasil seri. Pertahankan hasil deterministik untuk kejadian serentak dan jangan mengubah mode boss yang sudah diuji.
