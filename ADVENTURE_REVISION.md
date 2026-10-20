# Eat-eat — Revisi Petualangan & Boss

Basis kerja: hasil **Boss Batch 1**, dilanjutkan dengan tujuh revisi UI/gameplay dan revisi mekanisme boss terbaru. Ini implementasi yang sudah terpasang di source, bukan prompt untuk dikerjakan lagi.

## Perubahan utama

| Permintaan | Hasil |
|---|---|
| Bantuan dua grid | Aturan memakai dua kolom di desktop dan HP; kontrol terpisah di atas, kontras teks diperbaiki. Dialog membuka bagian atas, bukan otomatis melompat ke tombol bawah. |
| Panel gelap banner | Delapan banner baru memiliki alpha transparan. Latar kotak di belakang banner ini dihapus; judul diberi outline. |
| Ekspresi karakter | Malam: waspada; Portal: kaget; Time Attack: terburu-buru; Jejak Kunci: licik; Kurir: bersemangat; Ekspedisi/Boss: menantang; Rebut Arena: bersaing. |
| Ekspedisi + boss | Satu perjalanan: lima rute pengumpulan dan upgrade, dilanjutkan sembilan gelombang antek, lalu boss tiga fase di gelombang kebun ke-10. Tombol boss terpisah disembunyikan. |
| Jejak Kunci | Penjaga menjadi kumbang, mata mengikuti arah pandang, posisi diinterpolasi. Arah yang terhalang diputar ke lorong terbuka; pencarian jalur tidak boleh masuk tujuan yang terblokir. |
| Kurir Apel | Semua paket dengan tujuan yang sama diserahkan dalam satu kunjungan. Paket tujuan lain tetap dibawa; bonus cepat dan kedaluwarsa tetap dinilai per paket. |
| Apel dan bom | Jumlah makanan Ekspedisi dinaikkan dari 3 menjadi 5. Bom memakai daftar dan jumlah terpisah; tidak memakan slot apel. Arena kebun dalam Ekspedisi juga memakai 5 apel energi. |
| Animasi Petualangan | Gerak kontinu ular memakai interpolasi linear agar tidak melambat di setiap petak. Penjaga meluncur dan menggerakkan kaki. Musuh kebun berdenyut ringan; orb bergoyang. Jeda membekukan jam visual pada mode kontinu. |

## Alur Ekspedisi gabungan

1. Mulai dari rute 1. Setiap rute menunggu input arah pertama.
2. Capai target **28 / 40 / 52 / 64 / 76** poin.
3. Setelah setiap rute, termasuk rute kelima, simulasi berhenti dan pemain mengambil satu upgrade dari pilihan yang sah. Klik ganda tidak mengambil dua upgrade.
4. Setelah upgrade kelima, masuk kebun dengan bekal yang terkumpul. Awal kebun juga menunggu input arah pertama.
5. Gelombang kebun 1–3: satu antek per gelombang; 4–6: dua; 7–9: tiga. Antek datang bergiliran, total 18.
6. Gelombang kebun 10: salah satu dari tiga varian boss acak. Pola serangan mengikuti varian dan fase.
7. Menang hanya setelah fase 3 boss habis. Kalah di kebun mengakhiri seluruh perjalanan; retry kembali ke rute 1.

Ronde pengumpulan dan gelombang kebun merupakan dua bagian dalam satu run, **bukan** lima ronde yang masing-masing memunculkan boss.

### Bekal dari upgrade

| Upgrade | Efek saat masuk kebun |
|---|---|
| Tubuh ringkas | Panjang awal mengikuti upgrade, minimal 3 segmen. |
| Langkah berani | Pengali interval gerak ikut dibawa. |
| Kulit tebal | Tambahan 2 hati per tingkat. |
| Racikan penawar | Tambahan 1 hati per tingkat. |
| Bekal manis | Tambahan 2 energi awal per tingkat. |
| Napas panjang | Durasi kebal setelah terkena serangan dikali 1,4 per tingkat. |

Efek apel sementara dibuang saat masuk kebun. Skor rute tetap dibawa. Setiap antek memberi 5 poin, kerusakan HP boss memberi 10 poin per HP; mengikis shield tidak menghasilkan poin tambahan.

## Mekanisme boss terbaru

### HP dan pergantian fase

| Fase | HP fase | Celah per jendela | Damage serangan boss |
|---|---:|---:|---:|
| 1 | 3 | 1 | 1 hati |
| 2 | 5 | 2 | 1 hati |
| 3 | 10 | 3 | 2 hati |

Total HP sepanjang pertarungan adalah **18**. HP fase aktif harus habis sebelum transisi ke fase berikutnya. Damage berlebih tidak melompati fase. HP fase berikutnya diisi sesuai tabel. Setelah fase 3 habis, hasil menang diproses satu kali.

Serangan semakin cepat tiap fase; batas waktu peringatan yang mempertimbangkan jarak tempuh tetap dipertahankan. Saat titik lemah terbuka, bahaya serangan dihentikan. Setiap titik lemah hanya bisa dipukul sekali per jendela. Biaya energi: 1 untuk antek, 3 untuk boss.

### Shield fase 3

Tafsir yang digunakan untuk kalimat “maksimal 3 kali”: **tiga penambahan per serangan boss yang selesai**.

- Satu serangan selesai pada waktu `T`.
- Shield bertambah **10** pada `T + 5 detik`, `T + 10 detik`, dan `T + 15 detik`.
- Serangan berikutnya membuat rangkaian tiga penambahan baru. Rangkaian bisa bertumpuk secara waktu.
- Total shield saat ini dibatasi **100**. Kelebihan di atas batas tidak ditabung.
- Shield tidak mulai sebelum fase 3 dan tidak bertambah saat pause/menu upgrade.
- HUD menampilkan jumlah shield dan waktu menuju penambahan berikutnya.
- Kematian/menang/retry membersihkan jadwal shield yang tersisa.

Ini bukan “tiga kali sepanjang seluruh pertarungan”. Bila yang dimaksud adalah tiga kali total, aturan jadwal perlu diubah; implementasi sekarang mengikuti tafsir per serangan di atas.

### Orb heal dan damage

Saat fase 3 dimulai dan setiap serangan fase 3 selesai, muncul hadiah **heal +1 hati** dan **satu tingkat orb damage ×2** di petak aman yang tersedia.

- Hati bisa ditumpuk melebihi jumlah awal, ditampilkan sebagai `♥ × jumlah`.
- Orb damage bersifat permanen sampai run berakhir; mengambil lagi menambah tingkat pengali.
- Orb tidak menambah panjang tubuh maupun energi.
- Heal merah berbentuk hati; orb damage jingga bertuliskan ×2; apel energi berwarna kuning. Bentuk berbeda agar mudah dibedakan.
- Maksimal tiga objek heal dan tiga objek damage di arena. Hadiah berikutnya digabung nilainya, bukan dibuang. Jika tidak ada petak kosong, hadiah ditunda.
- Hadiah tidak menimpa tubuh, apel, boss, titik lemah, atau pickup lain ketika diletakkan.

Hadiah heal dari antek dan transisi fase sebelumnya tetap ada.

### Rumus damage pemain

Tafsir “×2 per 5 shield” yang dipakai adalah **penggandaan bertingkat**, bukan penambahan dua poin.

```text
baseDamage = 1
orbStacks = jumlah tingkat orb damage yang sudah diambil
shieldStacks = floor(shieldBossSaatPukulan / 5), jika orbStacks > 0
shieldStacks = 0, jika belum punya orb

damage = baseDamage × 2^(orbStacks + shieldStacks)
shieldTerkikis = min(shieldBoss, damage)
kerusakanHP = min(HPFaseAktif, damage - shieldTerkikis)
```

Damage dihitung dari shield **sebelum pukulan tersebut**. Shield menyerap lebih dahulu; sisanya mengenai HP. Pengali dari shield menyesuaikan jumlah shield terkini pada pukulan berikutnya. Stack orb tidak dikonsumsi.

| Stack orb | Shield sebelum pukulan | Damage | Shield tersisa | Damage ke HP |
|---:|---:|---:|---:|---:|
| 0 | 10 | 1 | 9 | 0 |
| 1 | 0 | 2 | 0 | 2 |
| 1 | 5 | 4 | 1 | 0 |
| 1 | 10 | 8 | 2 | 0 |
| 2 | 10 | 16 | 0 | 6 |
| 1 | 100 | 2.097.152 | 0 | Seluruh HP fase yang tersisa |

**Konsekuensi balancing:** rumus eksponensial ini memang dapat menghasilkan one-hit pada shield tinggi. Angka tidak diam-diam dibuat linear. Perhitungan dijaga tetap numerik aman, dan kerusakan HP tidak boleh membuat HP negatif. Parameter berada di `lib/boss/sim.js`; titik utama untuk tuning: `baseDamage`, `shieldPerDouble`, `shieldGain`, `shieldEveryMs`, `shieldPulses`, dan `shieldMax`.

## Penjaga dan kampanye Jejak Kunci

Penjaga yang arah depannya terhalang sekarang memilih lorong terbuka terpanjang dalam jarak pandang, dengan urutan tie-break tetap. Perilaku tetap deterministik untuk undo dan solver. Penjaga tetap bergerak berdasarkan langkah pemain, bukan mengejar dengan timer real-time.

Perubahan ini membuat sebagian layout lama tidak lagi cocok. Kampanye dibuat ulang dari seed yang sama, lalu divalidasi solver. Layout/data yang berubah: **38, 41, 46, 47, 48, 49**. Seluruh 50 level tetap dapat diselesaikan; par disesuaikan dengan solusi hasil validasi.

Progres buka-kunci lama tetap dipertahankan. Level dengan penjaga memakai penanda revisi 2. Rekor lama tetap tersimpan dan ditandai **Versi lama** di menu; percobaan pertama pada revisi baru mencatat rekor baru tanpa dibandingkan dengan angka dari aturan/peta lama.

## Aset dan UI

Delapan scene × dua ukuran = **16 WebP** baru, masing-masing di bawah 300 KB:

- `bg-classicnight`, `bg-portal`, `bg-timeattack`
- `bg-puzzle`, `bg-delivery`, `bg-roguelite`, `bg-boss`, `bg-territory`

Versi desktop berlebar 1672 px, versi `-m` berlebar 960 px; alpha dipertahankan. Komposisi menyediakan ruang kiri untuk judul dan menjaga karakter di kanan. Prompt lengkap ada di `docs/ASSETS_ADVENTURE.md`.

Objek gameplay memakai Canvas native agar tetap ringan dan tajam: wajah ular bersama, kumbang penjaga, dinding kebun membulat, palet sage/krim, orb dan indikator shield. Animasi tidak mengubah koordinat collision.

## Kompatibilitas dan ruang lingkup

- `lib/gameEngine.js` tidak berubah.
- Pemilihan mode Arkade tetap grup → sub-mode. Label Time Attack ditulis lengkap.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, `snake_best` tetap.
- Rekor Ekspedisi gabungan memakai entri konfigurasi v2, boss memakai v3; entri lama tetap tersimpan di key `snake-records-v1`.
- Boss standalone tetap memiliki adapter internal untuk kompatibilitas dan pengujian, tetapi tidak muncul sebagai pilihan terpisah.
- Tidak menambah dependency, TypeScript, backend, atau multiplayer online.
- Bom/roket Rebut Arena masih belum diimplementasikan; tetap batch berikutnya.
- RotatePrompt portrait dan pemindahan menu ke panel samping HP landscape dipertahankan.
- Mascot hasil, tint mood, dan confetti tidak diganti.

## Validasi

- **275 tes, 14 berkas uji, seluruhnya lolos.** Meliputi fase/HP, shield 5/10/15 detik dan cap 100, stacking orb, penyerapan shield sebelum HP, pause/reset, paket campuran, lima apel, bekal upgrade, kampanye solver, serta regresi Arkade.
- `npm run build`: berhasil.
- Browser Chromium: start, pause/resume, bantuan, game over, retry, kembali ke menu; halaman penjaga level 35; aset mode Malam/Portal/Time Attack.
- Tampilan diperiksa pada **360, 390, 768, 1366 px** dan HP landscape **844 × 390**. Tidak ditemukan horizontal overflow; tombol mulai pada portal menu landscape tetap terjangkau.
- Dialog bantuan dua kolom telah diperiksa di desktop dan HP; fokus tidak melompat ke bagian bawah.
- Render Canvas fase 3 diperiksa dengan fixture visual shield/orb; transisi seluruh fase diuji lewat simulasi otomatis, bukan klaim menyelesaikan seluruh run dengan tangan di browser.
- `git diff --check`: bersih.

Uji browser memakai emulasi. Balancing kesulitan/durasi perjalanan dan performa di HP fisik masih memerlukan playtest.

## Menjalankan

```bash
npm ci
npm run dev
npm test
npm run build
```

Test dijalankan serial karena helper test menyiapkan cache modul bersama. Arsip tidak menyertakan `node_modules`, `.next`, atau folder `.git`.

## Berkas yang berubah

Daftar lengkap di bawah dibuat dari diff terhadap Boss Batch 1. `ADVENTURE_REVISION.diff` di dalam ZIP berisi diff source; penggantian gambar tersedia sebagai file WebP langsung.

- `ADVENTURE_REVISION.md`
- `BOSS_BATCH_1.md`
- `CHANGELOG.md`
- `README.md`
- `app/globals.css`
- `components/BackgroundLayer.jsx`
- `components/HelpModal.jsx`
- `components/Hud.jsx`
- `components/Overlay.jsx`
- `docs/ASSETS_ADVENTURE.md`
- `docs/TAHAP-5.md`
- `docs/TAHAP-9.md`
- `lib/boss/controller.js`
- `lib/boss/hud.js`
- `lib/boss/render.js`
- `lib/boss/sim.js`
- `lib/constants.js`
- `lib/delivery/controller.js`
- `lib/delivery/render.js`
- `lib/delivery/sim.js`
- `lib/modes/registry.js`
- `lib/progress.js`
- `lib/puzzle/campaign.js`
- `lib/puzzle/campaignData.js`
- `lib/puzzle/controller.js`
- `lib/puzzle/render.js`
- `lib/puzzle/sim.js`
- `lib/records.js`
- `lib/render/face.js`
- `lib/roguelite/controller.js`
- `lib/roguelite/render.js`
- `lib/roguelite/sim.js`
- `lib/roguelite/upgrades.js`
- `lib/territory/controller.js`
- `lib/territory/render.js`
- `package.json`
- `public/assets/game/bg-boss-m.webp`
- `public/assets/game/bg-boss.webp`
- `public/assets/game/bg-classicnight-m.webp`
- `public/assets/game/bg-classicnight.webp`
- `public/assets/game/bg-delivery-m.webp`
- `public/assets/game/bg-delivery.webp`
- `public/assets/game/bg-portal-m.webp`
- `public/assets/game/bg-portal.webp`
- `public/assets/game/bg-puzzle-m.webp`
- `public/assets/game/bg-puzzle.webp`
- `public/assets/game/bg-roguelite-m.webp`
- `public/assets/game/bg-roguelite.webp`
- `public/assets/game/bg-territory-m.webp`
- `public/assets/game/bg-territory.webp`
- `public/assets/game/bg-timeattack-m.webp`
- `public/assets/game/bg-timeattack.webp`
- `tests/adventure-revision.test.mjs`
- `tests/boss-campaign.test.mjs`
- `tests/boss.test.mjs`
- `tests/delivery.test.mjs`
- `tests/puzzle9a.test.mjs`
- `tests/registry.test.mjs`
- `tests/roguelite.test.mjs`
