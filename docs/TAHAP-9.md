> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](../ADVENTURE_REVISION.md).

# Tahap 9: Jejak Kunci 50 level (buatan sistem) + rintangan, power-up, penjaga

## Ringkas
- **50 level**: level 1-5 = tutorial buatan tangan (tidak berubah); level 6-50 dibuat **generator** (`lib/puzzle/generator.js`) dengan seed kampanye tetap lalu dikirim sebagai data (`lib/puzzle/campaignData.js`, dibuat `npm run build:campaign`). Alasan: generator di runtime butuh sampai ~1,5 dtk/level di laptop, lebih lambat di HP. Seed tetap = id level (dan progres) stabil.
- **Makin lama makin sulit**: 6 tier, elemen baru muncul bertahap dan dikenalkan lewat kartu "Baru:" di menu pada level pertama tiernya.

| Level | Tier | Elemen |
|---|---|---|
| 1-5 | Tutorial | kunci, makanan, plate, portal (buatan tangan) |
| 6-12 | Lorong Kunci | kunci + makanan + pilar |
| 13-19 | Lompatan Portal | + portal pembatas |
| 20-27 | Duri dan Retak | + duri (butuh Perisai S), tembok retak (butuh Palu P) |
| 28-34 | Gerbang Bergantian | + gerbang genap/ganjil |
| 35-42 | Penjaga Kebun | + 1 penjaga + semak |
| 43-50 | Penjaga Ganda | 1-2 penjaga |

## Aturan baru (semua bergerak hanya saat pemain melangkah; tanpa jam/RNG di simulasi)
- **Duri** ditolak tanpa Perisai; Perisai terpakai dan duri hilang. **Tembok retak** sama dengan Palu. **Gerbang**: bertanda 2 terbuka bila nomor langkah yang akan diambil genap, bertanda 1 bila ganjil. Gerakan ditolak **tidak memakai langkah** (aturan lama).
- **Penjaga**: mode `idle` (diam/patroli lurus 3 sel), `chase`, `return`. Area pandang = 1..3 sel di depannya, selebar 3, terhalang tembok/retak/gerbang tertutup. Melihat kepala/tubuh ular (di luar semak) -> `chase` (1 sel per langkahmu, BFS dengan urutan tie-break tetap). **Kepala di semak** = tersembunyi -> `return`; sampai posisi awal -> `idle` lagi. Penjaga sengaja dibuat **tidak lebih cepat** dari ular dan mudah diprediksi (tanpa mode pengejar cerdas).
- **Tersengat = game over** (penjaga menyentuh sel mana pun dari ular, atau kepala masuk sel penjaga). Layar "Tersengat!" -> **Coba Lagi** (level sama dari awal) / Pilih mode. Tidak ada undo setelah kalah; progres tidak disimpan. Perisai menahan **satu** sengatan: penjaga pulang dan pingsan 3 langkah. Masuk pintu pada langkah yang sama dengan sengatan = menang.
- Level 50 selesai: "Semua Level Tamat!".

## Generator
Papan dibagi 2-4 ruang oleh dinding pembatas; tiap pembatas punya satu penghalang wajib (celah, portal, duri, retak, gerbang); pickup yang dibutuhkan selalu di ruang sebelum penghalangnya. Solver BFS (diperluas untuk penjaga/gerbang/semak) menolak level mustahil dan menghitung par. Beberapa kandidat dibandingkan dengan kurva par target. Bila gagal: turun tier; bila tetap gagal: level cadangan. Semua dengan batas percobaan/state (tidak ada loop tanpa akhir).

## Tampilan & aksesibilitas
Duri = segitiga, retak = blok bergaris putus + retakan, gerbang = garis + angka (terbuka = putus-putus), semak = gumpalan daun ("SEMBUNYI" saat kepala di dalamnya), Palu/Perisai = ikon + huruf P/S, penjaga = kotak bermata + panah arah dengan penanda `!` (mengejar), `?` (pulang), `zZ` (pingsan); area pandang = kotak bergaris (putus-putus = waspada, solid = mengejar). HUD: Palu, Perisai, status penjaga (teks + ikon). Menu: 50 level per halaman 10, kartu pengantar elemen baru. Bantuan (`?`) memuat aturan baru.

## Test (`npm test`, 253)
216 lama + 24 (aturan 9a: rintangan, penjaga, semak, solver, generator) + 13 (9b: data kampanye identik dengan keluaran generator, 45 level valid + par = optimum + solusi diputar ulang menang, kurva par naik, controller: 50 level/unlock/tamat, game over sengatan satu kali + Coba Lagi, pesan rintangan, HUD).
**Browser (Chromium headless, viewport emulasi, bukan perangkat fisik):** menu 50 level tanpa overflow di 1366x768 dan 1280x720 (level 1, 13, 20, 28, 35, 50); level 20/28/35/45 dirender; permainan nyata di level 45: penjaga mengejar (`!`, HUD "MENGEJAR!"), tersengat -> "Tersengat!" -> Coba Lagi mengulang dari langkah 0; level 35 diselesaikan lewat solusi solver -> "Level Selesai!". Layar sentuh landscape 740x360 dilihat sekilas.

## Belum diverifikasi / catatan jujur
- **Balance dan "seru"** tidak bisa dibuktikan test: par, kurva kesulitan, kerapatan musuh, dan tata letak hanya valid secara teknis (bisa diselesaikan). Perlu dimainkan; angka ada di `TIERS` dan `targetPar` (`generator.js`), lalu `npm run build:campaign`.
- Level yang sama untuk semua pemain (seed tetap); belum ada mode acak per-run.
- Hanya level 35 dan 45 yang diselesaikan/diuji lewat browser; level lain divalidasi oleh solver.
- Belum dicek: HP fisik, 360/390/768 px, suara (sengatan memakai `playDeath`, terlihat `playEits`), kontras warna area pandang di layar kecil.
- Progres lama (`jk-1..jk-5`) tetap dipakai; level 6+ memakai id `gen-N`.
