# Dungeon, Movement & Aset Menu

Tanggal: 19 Oktober 2026. Basis: ZIP revisi Revive & Jejak Kunci yang terakhir dikirim. Ini source lengkap Next.js, bukan merge dengan versi lobby kartu lama.

## Hasil revisi

Jejak Kunci diganti menjadi **Dungeon**. Pemain tetap maskot satu petak; tujuan utama mengumpulkan kunci/sakelar dan mencapai pintu, dengan pilihan menyelinap atau bertarung. Menu Arkade tetap dua tingkat: Classic, Mayhem, 2P Lokal lalu sub-mode.

### Kontrol

- Satu pemilik input untuk keyboard dan DPad. Repeat OS tidak lagi menumpuk gerakan; arah terbaru menggantikan repeat lama.
- Ketuk = satu langkah; tahan = berjalan berulang setelah 190 ms, interval 135 ms. Animasi per langkah 120 ms. Semua gerak tetap empat arah.
- Keyup, zona netral DPad, pointer cancel, kehilangan capture, jeda, blur, bantuan, pergantian mode, undo dan ulang membersihkan hold yang relevan.
- Input arah yang tertahan tembok tidak memakai giliran dan tidak menghambat belokan valid setelahnya.
- DPad memakai satu pointer utama dan toleransi sudut agar jempol tidak mudah berganti sektor tanpa sengaja.
- Animasi tidak lagi menggeser kepala naik ketika bergerak horizontal. Squash kecil tetap ada, tanpa mengubah posisi grid.
- Repeat Spasi, Z, R dan Esc tidak menggandakan aksi. Esc yang ditahan di dialog jeda tidak lagi melanjutkan permainan.

### Aturan Dungeon

| Bagian | Perilaku |
| --- | --- |
| Pemain | Mulai 3 hati per ruang; maskot satu petak, tidak memanjang saat koleksi. |
| Slime | 1 HP; gerak patroli/kejar setiap dua giliran. |
| Penjaga batu | 2 HP; bergerak tiap giliran. |
| Serangan pemain | Arahkan ke petak musuh yang berdampingan: 1 damage, pemain tetap di petaknya. Tidak ada tombol serangan tambahan. |
| Peringatan | Musuh waspada sebelum mengejar. Ketika akan menyerang, petak sasaran bertanda ! selama satu giliran penuh. |
| Serangan musuh | Sasaran terkunci pada petak tersebut, bukan mengikuti pemain yang menghindar. Maksimal kehilangan satu hati per giliran, lalu kebal satu giliran. |
| Perisai | Menahan satu serangan; musuh yang memukul pingsan 3 giliran di tempat, tidak teleport ke rumah. |
| Heal | Pickup hati bertanda + memulihkan satu hati, maksimal 3. Hati tidak ditumpuk melewati batas ini di Dungeon. |
| Jeruji | Injak tuas dengan nomor sama; gerbang terbuka permanen sampai ruang diulang/di-undo. Tidak perlu menebak genap/ganjil. |
| Pintu keluar | Tetap membutuhkan kunci dan sakelar sesuai ruang. Membunuh semua musuh tidak wajib. |
| Koin apel | Bonus opsional, maksimal tiga per ruang kampanye. Disimpan setelah keluar; replay memberi selisih koleksi terbaik saja. |
| Undo | Tetap tersedia untuk semua langkah saat masih bermain, termasuk combat. Ini sengaja tetap menjadi mode taktis yang bisa dipelajari. Setelah kalah/menang, ulang ruang. |

Pandangan musuh memakai ray grid yang menghormati tembok dan sudut. Render area pandang memakai fungsi yang sama dengan deteksi. Musuh tidak bisa bertumpuk, bertukar petak menembus satu sama lain, atau masuk ke petak pemain tanpa peringatan serangan. Musuh yang kalah tidak lagi terlihat, mendeteksi, atau menghalangi jalan.

### Kampanye dan ruang 37

- 1–5: tutorial yang sudah ada, tetap mengajarkan kunci, sakelar dan portal.
- 6–12: Lorong Kunci.
- 13–19: Lompatan Portal.
- 20–27: Duri dan Retak.
- 28–34: Ruang Tuas.
- 35–38: satu Slime; 39–42: satu penjaga batu.
- 43–50: tepat dua musuh, satu dari setiap jenis. Jumlahnya tidak diturunkan diam-diam ketika generator kesulitan.
- Ruang 37 memakai jeruji bertuas. Masalah gerakan genap/ganjil tidak menjadi syarat kampanye lagi. Pembaca g/h tetap dipertahankan untuk fixture lama, dengan perbaikan agar menunggu atau keluar dari gerbang yang menutup tidak mengunci pemain.
- Kampanye disimpan sebagai data hasil generator dengan seed tetap. Semua 50 ruang divalidasi dan solusinya diputar ulang. Par/acuan berasal dari solusi terpendek.
- Puzzle tanpa combat memakai BFS; combat tanpa portal memakai A* dengan estimasi jarak yang tidak melebihi biaya sebenarnya. Ruang dengan portal tetap memakai BFS. Optimum A* dibandingkan dengan BFS exhaustive pada fixture kecil.
- Combat akhir memakai template aman yang dicerminkan dan divariasikan, bukan arena acak tanpa validasi. Panjang rute bukan satu-satunya ukuran kesulitan: HP dan jumlah jenis musuh meningkat.

## Progres dan kompatibilitas

Id mode tetap `puzzle`; id ruang tetap `jk-1`…`jk-5`, `gen-6`…`gen-50`. Key `snake-progress-v1` dan semua key lama (`snake-speed`, `snake-ta`, `snake-lefty`, `snake_best`) tetap sama.

Revisi kampanye menjadi 4. Unlock dan koin dari versi lama tetap terbaca; rekor langkah versi lama diberi label versi lama, sehingga tidak dibandingkan dengan par layout baru. Penyimpanan gagal tidak lagi menimpa hasil ruang sebelumnya: progres dalam memori digabung dengan data disk ketika ruang berikutnya selesai atau pemain menekan **Coba simpan lagi**. UI menampilkan status save tertunda.

Batas: progres yang belum berhasil disimpan tetap hanya ada dalam sesi terbuka. Jika tab ditutup saat storage masih menolak penulisan, data dalam memori tidak dapat dipulihkan. Ini belum sinkronisasi backend atau transaksi lintas tab secara atomik.

## Aset dan menu

| Kelompok | Tindakan batch ini |
| --- | --- |
| Mayhem, Mayhem+, Hard, Impossible, Mayhem Duo | Edit area kiri teks menjadi transparan. Pose/ekspresi dan lingkungan di kanan dijadikan referensi yang dipertahankan, tanpa brief redesign baru. |
| 2P Lokal | Perlakuan pembersihan area teks yang sama. |
| Classic / Day | Desain ulang: wajah jahil dan ekspresif, mengejar apel, kebun cerah. |
| Night, Portal, Time Attack | Desain ulang cutout lama menjadi scene berwarna di kanan, dengan ekspresi berbeda sesuai mode. |
| Dungeon | Ruang batu/obor, kunci, slime, penjaga berhelm; sesuai tema gameplay baru. |
| Kurir Apel, Ekspedisi, Rebut Arena, Penjaga Kebun | Desain ulang cutout menjadi scene utuh di kanan. Arena menampilkan rival bertarung. Boss standalone tetap tersembunyi sesuai basis. |

Seluruh 15 scene memiliki WebP desktop **1672×941** dan HP **960×540**, dengan alpha. Bagian luar/area teks transparan; warna langit, tanah, ruangan dan tumbuhan di dalam ilustrasi tetap ada. Seluruh file di bawah 300 KB. Gambar memakai `contain`, tanpa memotong wajah untuk memaksa rasio. Prompt per aset ada di [ASSET_PROMPTS_DUNGEON.md](ASSET_PROMPTS_DUNGEON.md).

Judul tetap teks HTML Bahasa Indonesia dengan outline, bukan tulisan hasil gambar. Container hijau di belakang judul dihapus pada semua mode. Animasi nama dari kiri, drift, serta zoom/flash PLAY tetap ada. Tab grup, sub-mode berikon, kecepatan, durasi Time Attack, dan penjelasan 2P butuh keyboard tetap tersedia. Bantuan tetap dua kolom. Portrait HP tetap memakai RotatePrompt sesuai versi basis; panel menu landscape tetap melalui portal.

Papan Dungeon menyesuaikan tinggi laptop karena HUD lebih tinggi. HUD landscape diringkas; legenda lengkap tetap tersedia di bantuan dan pada layout desktop.

## Perubahan per file

| File | Perubahan |
| --- | --- |
| `lib/input.js` (baru) | Pengelola hold/repeat terbaru, terpisah per pemain, timer yang bisa dibersihkan. |
| `components/GameCanvas.jsx` | Jembatan input bersama, keyup, pembersihan hold dan aksi retry save. |
| `components/DPad.jsx` | Release/cancel/capture, satu pointer, zona netral dan toleransi sudut. |
| `app/page.js` | Hubungkan DPad hold/release, retry save, penanda mode untuk ukuran papan. |
| `lib/puzzle/sim.js` | Tuas, HP, combat deterministik, heal, LOS, reservasi petak, solver. |
| `lib/puzzle/generator.js` | Tuas sebelum gerbang, template combat aman, jumlah musuh wajib sesuai tier. |
| `scripts/build-campaign.mjs` | Simpan tautan tuas/jeruji dan petunjuk combat dalam kampanye. |
| `lib/puzzle/campaignData.js` | 45 ruang sistem dibuat ulang dan divalidasi. |
| `lib/puzzle/campaign.js` | Metadata revisi 4; id dan urutan ruang tetap. |
| `lib/puzzle/controller.js` | Intent terbaru, HUD combat, pesan, efek, merge/retry save dan hasil ruang. |
| `lib/puzzle/render.js` | Lantai/dinding dungeon, tuas/jeruji, slime/penjaga, HP, sasaran dan efek pukulan; gerak horizontal lurus. |
| `lib/progress.js` | Merge progres tervalidasi; hasil save tertunda tidak hilang saat ruang berikutnya selesai. |
| `components/Hud.jsx` | Hati, musuh tersisa, jeruji terbuka, status serangan dan istilah ruang. |
| `components/Overlay.jsx` | Dungeon, pemilihan ruang, notice retry save, repeat Esc aman. |
| `components/BackgroundLayer.jsx` | Semua scene mendukung area teks transparan. |
| `app/globals.css` | Notice save, HUD combat, outline semua scene, ukuran desktop/landscape. |
| `lib/constants.js`, `lib/modes/registry.js` | Nama/aturan Dungeon dan bantuan sesuai kontrol serta combat. |
| `public/assets/game/bg-*.webp` dan `-m.webp` | 30 berkas dari 15 scene menu; daftar tindakan di atas. |
| `tests/dungeon-input.test.mjs` (baru) | Input terbaru, hold/keyup, tembok dan save gagal lalu berhasil. |
| `tests/dungeon-combat.test.mjs` (baru) | Tuas, LOS, collision musuh, HP, telegraph/dodge, heal/perisai, optimum solver dan jumlah musuh kampanye. |
| `tests/puzzle.test.mjs`, `puzzle9a.test.mjs`, `puzzle9b.test.mjs`, `revive-quest.test.mjs` | Sesuaikan ekspektasi kontrak lama ke combat tiga hati, progres dan revisi 4; tidak ada tes yang di-skip. |
| `README.md`, `CHANGELOG.md`, dokumen revisi/prompt/diff | Petunjuk terbaru dan jejak perubahan. |

Diff teks lengkap, dipisah per file: [DUNGEON_DIFF_PER_FILE.md](DUNGEON_DIFF_PER_FILE.md). Aset biner disediakan langsung dalam ZIP.

## Verifikasi

- `npm run build:campaign`: berhasil, 45 ruang sistem ditulis.
- `npm test`: **299/299 lulus**, tanpa skip. Mencakup engine Arkade, Dungeon, Delivery, Ekspedisi, Boss, Territory, progres dan aset.
- Setelah koreksi dialog/visual terakhir, 14 tes regresi input/combat dijalankan lagi: lulus.
- `npm run build`: build produksi Next.js berhasil, lint/type validation bawaan build lolos.
- `git diff --check`: bersih.

Pemeriksaan browser Chromium (emulasi perangkat, bukan uji HP fisik):

| Pemeriksaan | Hasil |
| --- | --- |
| Semua 10 mode Arkade | Pilih grup/sub-mode → mulai → jeda → lanjut → kembali ke menu lolos. Grup otomatis memilih sub-mode pertama. |
| Time Attack / Impossible | Semua durasi dapat dipilih; Impossible terkunci Ngebut. |
| Menu 360×800, 390×844, 768×1024 | Tanpa overflow horizontal; 2P disembunyikan dengan alasan keyboard. |
| Laptop 1366×768 | Menu terbaca; papan Dungeon beserta HUD muat dalam tinggi layar. |
| HP landscape 844×390 | Portal menu bekerja; tombol mulai dan DPad combat terlihat. DPad 117 px, batas bawah 382 px. |
| Bantuan | Tetap dua kolom pada HP; buka/tutup normal. |
| Belokan keyboard | Repeat Up yang sudah dilepas tidak menggantikan Left baru; belokan mengikuti intent terbaru. |
| Belokan sentuh | Hold Down → Up → Left, lalu lepas: posisi akhir sesuai dua langkah baru, tanpa sisa arah Up. |
| Hold DPad | 520 ms menghasilkan 4 langkah; setelah release langkah berhenti. |
| Repeat Esc | Tetap di layar jeda, tidak melanjutkan akibat repeat. |
| Dungeon 28/37/43 | Render tuas, satu/dua jenis musuh sesuai kampanye; ruang 37 selesai dan menyimpan revision 4. |
| Dungeon kalah / ulang | Hati habis menampilkan Coba Lagi; percobaan baru kembali 3 hati. |
| Kurir / Ekspedisi / Arena | Mulai dan kembali ke menu lolos. Game over Arkade kembali ke menu normal. |
| Error JavaScript | Tidak ditemukan pada alur browser yang diperiksa. |

Semua 50 ruang diuji solusinya oleh tes simulasi; pemeriksaan visual browser mengambil sampel 28, 37 dan 43 serta tutorial. Safari/iOS dan HP fisik belum dijalankan.

## Yang dipertahankan dan pekerjaan berikutnya

`lib/gameEngine.js`, dependency/lockfile, struktur aplikasi, pengaturan kecepatan/durasi, serta logika Delivery, Ekspedisi, revive 3 kali/72 jam, Boss dan Territory tidak diubah. Layar hasil tetap memakai maskot, tint dan confetti dari basis; hanya teks hasil Dungeon dan notice gagal simpan yang bertambah.

Belum ada online multiplayer, backend baru, pembelian skin atau perubahan formula damage/shield Boss. Revisi ini menyiapkan saldo koin dan mempertahankan mekanik yang sudah ada; integrasi backend/skin perlu batch tersendiri ketika memang diminta.

## Menjalankan

```bash
npm ci
npm test
npm run build
npm start
```

Untuk mengubah generator kemudian membangun ulang data kampanye: `npm run build:campaign`, lalu jalankan tes. Ekstrak ZIP ke folder baru agar build/cache lama tidak ikut tercampur.
