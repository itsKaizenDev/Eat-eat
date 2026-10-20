# Revisi Ekspedisi & Jejak Kunci

Revisi ini melanjutkan `Eat-eat-Adventure-Revision.zip`. Fokusnya adalah revive Ekspedisi dan kritik terhadap lima screenshot Jejak Kunci/menu Ekspedisi. Source lengkap disertakan, termasuk aset dari revisi sebelumnya.

## 1. Hasil revisi berdasarkan screenshot

| Masukan | Perubahan |
| --- | --- |
| Gambar 1: penjaga kurang menarik dan terasa hanya menjaga kotak | Semua penjaga kampanye memiliki jalur patroli 3–5 petak. Jalurnya terlihat sebagai titik-titik; penjaga memberi tanda `!` sebelum mengejar, mengikuti posisi terakhir yang terlihat, lalu kembali ke patroli. |
| Gambar 2: menu Ekspedisi | Struktur menu dipertahankan. Ditambahkan jumlah revive dan informasi kapan kuota pulih. Kecepatan serta struktur 5 rute → 9 gelombang → boss tetap ada. |
| Gambar 3: blok oranye tidak jelas | Objek tersebut adalah gerbang bergantian. Kini digambar sebagai pagar kayu: panah hijau berarti dapat dilewati pada langkah berikutnya, palang merah berarti tertutup. Angka 1/2 yang membingungkan dihapus. |
| Gambar 4: batu yang bisa dipalu hampir tidak terlihat | Batu retak memakai warna krem, bingkai gelap, dan retakan besar. Bentuknya dibedakan dari dinding hijau. HUD dan pesan pickup palu menjelaskan objek yang harus dicari. |
| Gambar 5: terlalu banyak apel, padahal tujuan mencari kunci | Jumlah apel dikurangi menjadi 1–3 per level. Apel menjadi koin bonus opsional. Semua 50 level tetap bisa ditamatkan tanpa mengambil apel. |
| Gerakan kaku | Jejak Kunci menggunakan maskot ular melingkar satu petak, dengan luncuran, gerakan naik-turun kecil, dan perubahan bentuk ringan saat melangkah. Penjaga ikut bergerak dengan interpolasi. |
| Koleksi jangan memanjangkan ular | Apel, kunci, palu, dan perisai menambah penghitung masing-masing. Ukuran maskot tetap satu petak. |
| Apple coin untuk skin nanti | Saldo koin apel sudah ditampilkan dan disimpan. Menu hanya memberi keterangan bahwa skin merupakan rencana mendatang; toko dan pembelian belum dibuat. |

Ikon permainan baru digambar langsung melalui Canvas agar tetap tajam pada berbagai ukuran papan. Tidak ada dependency baru atau gambar raster tambahan dalam revisi ini. Aset menu kartun transparan dari revisi sebelumnya tetap digunakan.

## 2. Revive Ekspedisi

### Aturan kuota

- Pemain mendapat **3 revive**. Kuota dipakai bersama oleh semua run dan semua pilihan kecepatan Ekspedisi pada browser/origin yang sama.
- Penggunaan pertama memulai jendela **72 jam**. Penggunaan kedua/ketiga tidak menggeser waktu reset.
- Saat waktu reset tercapai, kuota kembali menjadi 3. Sisa kuota tidak ditumpuk menjadi 4, 5, atau 6.
- Setelah reset, pemakaian pertama berikutnya memulai jendela 72 jam berikutnya.
- Memulai run baru, kembali ke menu, atau refresh tidak mengisi ulang kuota.
- Reset dihitung berdasarkan waktu yang tersimpan; aplikasi tidak perlu tetap terbuka selama tiga hari.
- Tombol menjadi nonaktif saat kuota habis atau saat pemakaian sedang disimpan. Klik ganda tidak memotong dua jatah.

Contoh: revive pertama dipakai Senin pukul 10.00. Jatah kembali menjadi 3 pada Kamis pukul 10.00, meskipun revive terakhir dipakai Rabu malam.

### Apa yang terjadi ketika hidup lagi

| Bagian run | Perilaku |
| --- | --- |
| Rute Ekspedisi | Lanjut rute yang sama. Skor ronde, total skor, upgrade, apel, dan bom tetap dibawa. Ular ditempatkan di jalur aman dengan panjang awal sesuai upgrade; efek temporer dibersihkan. |
| Gelombang antek / boss | Lanjut gelombang dan fase yang sama dengan **3 hati**. HP boss, shield boss, energi pemain, stack orb damage, dan progres antek tetap dipertahankan. Bahaya aktif dibersihkan dan ada jeda sebelum serangan berikutnya. |
| Kontrol | Permainan menunggu input arah pertama. Waktu simulasi dan jatah perlindungan tidak berjalan saat pemain belum siap. |
| Perlindungan | Rute memakai perlindungan tabrakan selama 3 detik tanpa mengurangi perisai upgrade. Di kebun, perlindungan bahaya minimal 3 detik mengikuti sistem invulnerabilitas yang ada; tembok/tubuh tetap berbahaya sesuai aturan kebun. |
| Statistik | Mati → revive → mati/menang tetap dihitung sebagai satu run. Skor terbaik selama run tidak hilang. |
| Main lagi | Memulai run baru dari rute pertama. Ini berbeda dari tombol Hidup lagi. |

Sebelum kuota dipotong, sistem menyiapkan posisi revive yang aman. Jika posisi tidak tersedia atau penyimpanan gagal, pemain tetap berada di layar kalah dan mendapat pesan. Kuota hanya dipakai dari layar kalah, bukan saat menang atau sedang bermain.

Layar kalah di HP landscape dibuat dua kolom khusus ketika revive tersedia: maskot/judul di kiri, tiga tombol dan informasi kuota di kanan. Tampilan jeda/hasil mode lain tetap mengikuti desain sebelumnya.

### Penyimpanan dan batasannya

Key baru: `snake-expedition-revives-v1`, berisi versi data, sisa kuota, waktu reset, dan waktu pemakaian terakhir. Web Locks dipakai bila tersedia untuk menyelaraskan pemakaian antar-tab. Browser tanpa Web Locks memakai fallback penyimpanan lokal, sehingga perlindungan dari pemakaian serentak antar-tab lebih terbatas.

Ini **belum menggunakan backend**. Menghapus data browser, mengubah penyimpanan secara manual, pindah origin/perangkat, atau memanipulasi jam dapat memengaruhi kuota. Refresh hanya mempertahankan kuota; run yang sedang berlangsung belum menjadi save game yang bisa dimuat ulang.

## 3. Jejak Kunci: aturan yang disesuaikan

### Maskot satu petak dan sakelar

Maskot boleh berbalik arah. Mengambil item tidak lagi menambah tubuh. Karena mekanisme lama mengharuskan tubuh menahan pressure plate, sakelar sekarang **tetap aktif setelah diinjak sekali**, sampai level selesai/diulang. Undo mengembalikan status sakelar, barang, posisi, dan penjaga ke langkah sebelumnya.

Pintu tetap memerlukan jumlah kunci serta sakelar yang ditentukan level. Koin tidak menjadi syarat keluar. Tutorial, teks bantuan, generator, solusi, dan par diperbarui mengikuti aturan ini.

### Penjaga

1. Penjaga berpatroli pada rute 3–5 petak yang terhubung, menghadap arah langkah patroli berikutnya.
2. Ketika melihat pemain, muncul `!` dan penjaga menunda gerak pengejaran satu giliran. Pemain mendapat kesempatan untuk kabur atau bersembunyi.
3. Pada giliran berikutnya, penjaga mengejar posisi terakhir yang terlihat. Posisi sasaran diperbarui hanya saat pemain terlihat.
4. Jika kehilangan pandangan, ingatan posisi bertahan hingga tiga giliran. Setelah itu penjaga kembali ke titik awal patrolinya. Masuk semak memutus pengejaran.
5. Kontak dengan penjaga tetap berbahaya. Perisai dapat menahan sengatan dan membuat penjaga pingsan sementara.

Gerakan penjaga tetap **berbasis giliran**, bukan berjalan sendiri saat pemain sedang berpikir. Tombol **Tunggu** atau **Spasi** memajukan satu giliran tanpa berpindah tempat; berguna untuk mengatur pagar dan patroli. Gerakan yang tertahan tembok tidak memajukan giliran. Menunggu di portal tidak mengaktifkan teleport ulang.

### Gerakan dan kontrol

- Satu langkah dianimasikan selama sekitar 120 ms.
- Input cepat ditampung maksimal dua langkah, lalu dijalankan berurutan agar posisi tidak meloncat di tengah animasi.
- Pause membekukan animasi; resume melanjutkannya. Undo, restart, dan kembali ke menu membersihkan input yang masih mengantre.
- Pengaturan `prefers-reduced-motion` tetap dihormati.
- HUD menampilkan kunci, sakelar, apel bonus, palu/perisai yang dibawa, dan status penjaga.

## 4. Koin apel dan fondasi skin

Apel emas bernilai satu koin. Saat diambil, penghitung level bertambah dan muncul pesan untuk membawanya keluar. **Saldo permanen bertambah setelah level berhasil diselesaikan**, bukan setiap pickup.

Hadiah mengikuti koleksi terbaik per level:

```text
koin_tersimpan_level = max(koin_terbaik_sebelumnya, koin_dibawa_keluar)
hadiah_run = koin_tersimpan_level - koin_terbaik_sebelumnya
saldo_total = jumlah koin_tersimpan_level dari semua level
```

Contoh: pertama kali keluar dengan 1 koin → dapat 1. Mengulang dengan 1 koin → tambahan 0. Mengulang dan membawa 3 koin → tambahan 2. Undo lalu mengambil ulang apel yang sama tidak menggandakan hadiah.

Data koin ditambahkan ke record level di key yang sudah ada, `snake-progress-v1`. Tidak ada pemotongan saldo, toko, unlock skin berbayar, atau klaim sinkronisasi akun.

Saat fitur skin benar-benar dibuat, tambahkan ledger pengeluaran dan daftar skin milik pemain. Saldo yang terlihat saat ini adalah total hadiah, sehingga jangan langsung menguranginya dengan mengedit rekor koleksi level. Jika ekonomi harus terjaga lintas perangkat, pindahkan transaksi ke backend.

## 5. Kampanye dan kompatibilitas

- Semua **50 level** memakai revisi 3; generator menghasilkan ulang 45 level non-tutorial dan par/solusi diperhitungkan kembali.
- Level tetap memakai ID yang sama. Level yang sudah terbuka tidak dikunci ulang.
- Rekor dari aturan lama ditandai **Versi lama**. Menyelesaikan level dengan aturan baru mencatat rekor revisi saat ini.
- Rekor koleksi koin tidak berkurang ketika level dimainkan ulang atau revisinya berubah.
- Level generated tetap deterministik berdasarkan seed. Tidak ada pengacakan ulang kampanye setiap membuka aplikasi.
- Semua level diuji dapat diselesaikan tanpa mengambil koin bonus.

## 6. File yang berubah

| File | Perubahan utama |
| --- | --- |
| `app/page.js` | Menghubungkan tombol revive dan Tunggu ke controller; petunjuk keyboard puzzle. |
| `app/globals.css` | Tampilan quota/revive, saldo koin, legenda puzzle, serta hasil Ekspedisi landscape dua kolom. |
| `components/GameCanvas.jsx` | Jembatan `reviveRun` dan input Spasi untuk menunggu di puzzle. |
| `components/Hud.jsx` | Penghitung apel, status penjaga, legenda objek, tombol Tunggu, indikator perlindungan revive. |
| `components/Overlay.jsx` | Tombol Hidup lagi, quota/hitung mundur, saldo koin, penanganan fokus dan tombol saat proses revive. |
| `lib/roguelite/revives.js` **baru** | Validasi, reset 72 jam, penyimpanan kuota, dan Web Lock. |
| `lib/roguelite/controller.js` | Siklus revive, status UI, dan pencatatan satu run meskipun beberapa kali revive. |
| `lib/roguelite/sim.js` | Respawn rute dan perlindungan sementara. |
| `lib/boss/sim.js` | Respawn setelah kalah dengan 3 hati dan preservasi progres boss/shield/orb. |
| `lib/puzzle/sim.js` | Maskot satu petak, koleksi, sakelar permanen, giliran Tunggu, patroli/peringatan/ingatan penjaga, solver. |
| `lib/puzzle/controller.js` | Antrean input dan animasi, HUD, penyimpanan hadiah, pesan objek dan penjaga. |
| `lib/puzzle/render.js` | Maskot, koin apel, batu retak, pagar, jalur/tanda penjaga, animasi. |
| `lib/progress.js` | Data koin per level dan perhitungan saldo/hadiah. |
| `lib/puzzle/levels.js` | Tutorial dan solusi mengikuti aturan baru. |
| `lib/puzzle/generator.js` | Koin lebih sedikit, jalur patroli, sakelar, dan deskripsi level. |
| `lib/puzzle/campaign.js`, `lib/puzzle/campaignData.js` | Kampanye revisi 3 dan data level hasil generator. |
| `scripts/build-campaign.mjs` | Label revisi generator. |
| `lib/constants.js`, `lib/modes/registry.js` | Bantuan, pratinjau, dan kontrol yang sesuai implementasi. |
| `tests/helpers/env.mjs`, `tests/puzzle.fixtures.mjs` | Dukungan clock/kuota/animasi dan fixture aturan baru. |
| `tests/puzzle.test.mjs`, `tests/puzzle9a.test.mjs`, `tests/puzzle9b.test.mjs` | Ekspektasi puzzle diperbarui mengikuti aturan baru. |
| `tests/revive-quest.test.mjs` **baru** | Regresi quota, revive rute/boss, klik ganda, kegagalan simpan, koin, antrean animasi, dan kampanye. |
| `README.md`, `CHANGELOG.md`, `REVIVE_JEJAK_KUNCI.md` | Dokumentasi revisi dan petunjuk penggunaan. |

Diff per file tersedia dalam `REVIVE_JEJAK_KUNCI.diff` di ZIP. Diff dibandingkan dengan paket revisi sebelumnya; apply patch hanya pada basis tersebut.

## 7. Yang tetap dipertahankan

- `lib/gameEngine.js` tidak berubah.
- Tidak ada dependency baru, perpindahan ke TypeScript, atau perubahan struktur folder aplikasi.
- Dua tingkat pilihan mode Arkade, scene/aksen per mode, pengaturan kecepatan dan Time Attack tetap ada.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, dan `snake_best` tidak diganti.
- HP portrait tetap dapat memilih menu; RotatePrompt untuk mulai bermain tetap seperti basis sebelumnya. Panel samping landscape dan kontrol kidal dipertahankan.
- Kurir Apel, Rebut Arena, dan mode Arkade tidak mendapat perubahan aturan di batch ini.
- Boss tetap menggunakan aturan fase, shield, damage orb, dan variasi serangan dari revisi sebelumnya; tambahan di sini adalah jalur revive.
- Belum ada multiplayer online, backend akun/kuota, toko skin, atau pembelian.

## 8. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | **285/285 lolos**, tanpa skipped test. Mencakup suite regresi mode yang ada serta tambahan revive/koin/animasi. |
| `npm run build` | **Lolos** pada Next.js 14.2.34. Rute `/` sekitar 106 kB, First Load JS sekitar 193 kB. |
| Solusi kampanye | Semua 50 level terbukti memiliki solusi; par sesuai solver. Semua level tetap dapat ditamatkan tanpa apel. |
| Revive lewat Chromium | Pakai 3 kali lintas run; menunggu arah setelah revive; kuota habis menonaktifkan tombol; refresh tetap mempertahankan kuota; waktu reset lewat mengembalikan 3. |
| Koin lewat Chromium | Ambil 2 koin, undo/ambil ulang, keluar, lihat hadiah dan saldo menu. |
| Objek puzzle | Level 16, 22, 28, dan 37 diperiksa untuk koin, batu retak, pagar, maskot, serta jalur penjaga. Tombol Tunggu memajukan giliran. |
| Responsif | Menu diperiksa pada lebar 360, 390, 768, dan 1366 px; permainan/menu/revive pada landscape 844×390. Tidak ada overflow horizontal pada ukuran yang diperiksa. |
| Landscape hasil | Revive, Main Lagi, dan Kembali ke menu terlihat di viewport tanpa scroll setelah penyesuaian. |
| Bantuan | Grid tetap dua kolom pada HP. |
| Error browser | Tidak ada `pageerror` pada alur yang berhasil diperiksa. |
| Diff | Whitespace bersih; engine Arkade serta berkas dependency tidak berubah. |

Pengujian responsif menggunakan Chromium dengan emulasi sentuh/viewport; belum merupakan pengujian pada HP fisik atau Safari iOS. Rasa permainan dan tingkat kesulitan penjaga masih bisa dituning setelah dicoba pemain.

## 9. Menjalankan paket

```bash
npm ci
npm run dev
```

Untuk verifikasi:

```bash
npm test
npm run build
npm start
```

`node_modules`, `.next`, dan metadata Git tidak dimasukkan dalam ZIP. Tidak perlu menjalankan ulang generator untuk bermain; data kampanye sudah disertakan. `npm run build:campaign` tersedia bila ingin meregenerasi kampanye dari seed yang ditetapkan.
