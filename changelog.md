# Changelog — K-Snake

Diperbarui: 25 Oktober 2026.

Seluruh catatan revisi, aturan, hasil verifikasi, prompt aset dan diff Markdown disatukan dalam berkas ini. `README.md` tetap menjadi panduan menjalankan proyek. Catatan rinci disimpan dalam bagian buka-tutup agar riwayat tetap tersedia tanpa memenuhi halaman utama.

Aturan terbaru Dungeon ada pada [revisi Dungeon](#doc-dungeon-revision); pedoman visual terbaru ada pada [konsistensi scene](#doc-asset-consistency). Angka tes dan batasan di bagian arsip adalah hasil pada saat revisi tersebut dikerjakan, bukan pengujian ulang hari ini. Jika aturan arsip berbeda, gunakan revisi yang lebih baru.

## Delivery: Normal lapang dan Hard presisi — 25 Oktober 2026

- **Normal menjadi pilihan awal:** kota diperluas menjadi **25×23**, jalan utama 2–3 petak, persimpangan diperlebar, dan jalur awal memiliki ruang lebih panjang sebelum tembok. Kamera mengikuti ular pada ukuran petak yang sama; peta besar tidak mengecilkan ular saat bermain. Tombol Peta tetap menampilkan overview untuk perencanaan.
- **Hard** memakai kota sempit **17×15** versi sebelumnya. Bentuk map, posisi awal dan hazard dibandingkan terhadap v18 pada **80 kombinasi seed/fitur**, semuanya sama. Pilihan Normal/Hard ada di bagian **Tata jalan**, terpisah dari Santai/Normal/Ngebut/Konstan; mengganti kesulitan tidak mengubah pilihan kecepatan.
- Normal menyimpan input belok yang langsung menuju tembok bila bukaan tersedia dalam dua petak ke depan. Input dipakai saat bukaan tercapai; arah lurus dapat membatalkannya. Jeda/ulang membersihkan antrean; menahan rem tidak membuang input tersebut. Bantuan ini bukan autopilot dan tidak menembus tembok, tubuh atau hazard. Hard tidak memakai bantuan belok.
- Progres lama pada `snake-delivery-mayhem-v2` dipertahankan sebagai progres **Hard**. Normal memakai `snake-delivery-normal-v3`; format checkpoint tetap versi 2. Rekor Normal memakai kunci konfigurasi versi 3, sementara Hard mempertahankan kunci versi 2. Pilihan kesulitan disimpan terpisah. Perpindahan hanya dari menu; checkpoint yang belum tersimpan harus berhasil disimpan sebelum pindah profil.
- Pesanan sekarang datang per **batch** (maksimal satu di awal atau dua pada misi lanjut). Batch baru menunggu seluruh batch lama selesai/kedaluwarsa. Ini mencegah paket Berat baru muncul mendadak di tengah rute yang sudah direncanakan, lalu mengubah panjang/kecepatan ular.
- Perluasan matriks tes menemukan cache pencarian rute menyamakan keadaan yang sudah pulih dari guncangan dengan keadaan yang baru terkena guncangan pada sel/waktu sama. Kunci node sekarang mencakup waktu simulasi eksak, sisa delay, cooldown hazard aktif dan kondisi kargo. Regresi khusus memastikan rute dengan menunggu tetap ditemukan.
- Setelah tombol Peta diklik dengan pointer, fokus dikembalikan dari tombol agar Spasi berikutnya mengerem. Aktivasi tombol melalui keyboard tetap menjaga perilaku fokus keyboard.
- Source yang berubah: `lib/delivery/city.js`, `turns.js`, `routing.js`, `controller.js`, `progress.js`, `sim.js`, `lib/records.js`, integrasi menu/HUD/canvas/page, teks bantuan, dan tes. Tidak ada route baru, dependency runtime baru, aset audio diganti, atau Markdown baru.

**Verifikasi:** `npm test` **435/435 lulus**, 0 gagal. Matriks Delivery memuat **864 replay** (2 kesulitan × 12 misi × 12 seed × 3 kecepatan), semuanya mencapai target tanpa paket kedaluwarsa. Tes tambahan memeriksa lebar jalan, delapan petak ruang awal, buffer belok dua petak, tabrakan tetap berlaku, pergantian profil, progres/rekor lama, checkpoint gagal simpan, stabilitas batch dan state cooldown pencarian. `npm run build` berhasil; build dijalankan ulang setelah perapian fokus/copy UI. Konfigurasi ESLint tetap belum tersedia, seperti catatan v18.

**Browser:** alur Normal di 390×844, 844×390 dan 1366×768 selesai melalui 92 input nyata, mencapai Rank S/skor 118 yang sama dengan model simulasi. Pindah Hard, persistensi pilihan setelah refresh, kecepatan tetap terpisah, serta kegagalan tabrakan di Hard juga diuji. Progres Normal terbuka sampai misi 2 dan progres Hard lama tetap misi 7/skor 120 pada fixture migrasi; tidak ada page error. Run lintas ukuran menggunakan input keyboard untuk replay; profil touch terpisah benar-benar melaporkan pointer coarse dan maxTouchPoints=1, dengan hold/lepas rem, joystick, overview, serta batas kontrol dan lebar halaman diperiksa pada dua orientasi HP. Capture menu, gameplay, overview, hasil Normal dan kegagalan Hard diperiksa secara visual. Browser emulasi tetap bukan pengujian perangkat fisik.

Batasan: replay otomatis membuktikan kasus yang diuji bisa dituntaskan; bukan jaminan seluruh keputusan pemain akan selamat. Belum ada playtest rasa kesulitan pada Android/iOS fisik. Normal sengaja memberi ruang lebih lega, sementara tekanan pesanan dan paket tetap diperkenalkan bertahap.

## Delivery Mayhem 2.0 & audio global — 25 Oktober 2026

### Hasil implementasi

- Delivery lama diganti kampanye 12 misi di route utama yang sama, dengan empat distrik, seed penempatan yang berubah, dan urutan belajar → perencanaan → tekanan → ahli. Satu antrean di misi awal, maksimal dua berikutnya. Jalur luar selalu tersedia; jalan satu arah, gerbang, roadblock, gundukan dan tram adalah pilihan rute berisiko.
- Lima paket diperkenalkan bertahap: Reguler, Ekspres (deadline lebih pendek), Rapuh (kondisi turun 35% per guncangan, gagal setelah tiga), Berat (dua slot kapasitas, interval +18%), dan Multi-stop (dua alamat diperiksa terpisah). Semua paket tetap menambah tepat satu segmen ekor agar aturan tabrakan konsisten.
- Pesanan baru mendapat bukti rute untuk seluruh antrean melalui `stepSim`: arah, tubuh terurut, pertumbuhan, kapasitas, deadline, delay, gerbang, satu arah, dan tram ikut disimulasikan. Pencarian dibatasi; kandidat yang tidak terbukti tidak diterbitkan. Pembuktian memodelkan pelepasan rem, sehingga menahan rem tidak menghabiskan kandidat yang sebenarnya layak. Bukti bukan jaminan untuk sembarang keputusan pemain; menutup jalan dengan tubuh sendiri masih menjadi risiko Snake.
- Skor memisahkan nilai dasar, cepat, kondisi, efisiensi, combo, objektif dan penalti aktual. Multi-stop baru memberi skor setelah seluruh alamat selesai; hasil disimpan sekali melalui journal yang sudah ada. Menang langsung membuka misi berikutnya; best score/bintang memakai nilai maksimum. Rekor shift versi lama dipertahankan dengan kunci terpisah.
- HUD menampilkan jenis, status pickup/antar, tujuan, deadline, hadiah, kondisi Rapuh, muatan berbobot dan combo. Canvas memakai seluruh viewport; kamera mengikuti ular, tombol Peta memperlihatkan kota. HP portrait memakai HUD atas; landscape memakai rail kiri. Joystick/swipe/WASD tetap dipakai; tahan Rem/Spasi untuk menunggu tanpa membekukan deadline. Jeda membekukan deadline dan lalu lintas.
- Tema musik orisinal funk/electronic ringan untuk menu Delivery, normal, rush, menang dan kalah. Rush memakai hysteresis masuk 1 detik/keluar 3,5 detik; hasil diputar satu kali. Delapan cue kurir berbentuk WAV sungguhan ditambahkan untuk pickup, notifikasi, kiriman sempurna, gagal, deadline, combo, kerusakan dan aktivasi rintangan. Cooldown, prioritas, ducking dan batas 20 suara tetap terpusat.
- Audio tetap memakai satu director/context. Permintaan musik lama dibatalkan saat scene berubah, hasil terlambat diabaikan, dan pemuatan dibatasi 12 detik. Browser yang gagal memuat/dekode FLAC memakai MP3 tema yang sama; gagal total menghentikan lagu lama yang tidak sesuai. Pengaturan menyediakan status dan Coba Lagi, termasuk saat permainan dijeda.
- Slider Volume utama ditambahkan di atas Musik/Efek; nilai lama pada `snake-audio-v1` tetap dibaca. Model gain: master × kategori × suara × konteks. Limiter bus konservatif melindungi campuran suara bersamaan. Route `/dungeon` yang sudah ada juga memakai director/preferensi yang sama; oscillator/context terpisahnya dihapus dan kehilangan fokus menjeda audio/permainan.

### App Review Council — evaluasi sebelum dan sesudah

Enam peran berikut dijalankan berurutan oleh satu asisten, bukan enam manusia/model independen. Temuan berdasar source, capture browser dan output tes; penilaian visual bukan data studi pengguna.

| Peran / ID | Temuan, bukti, dampak dan akar masalah | Putusan Chair dan perbaikan / verifikasi |
| --- | --- | --- |
| UI Judge · UI-01 · Tinggi · terkonfirmasi | Capture HP 390×844 sebelum perubahan: canvas 358×315,875, sekitar 37% tinggi layar. `GameViewport` hanya memberi Dungeon seluruh permukaan; Delivery dipaksa rasio 17:15 dengan ruang HUD/joystick terpisah. Arena dan paket menjadi kecil. | **Upheld, diperbaiki.** Delivery juga mendapat viewport penuh dan transform kamera. Capture/browser setelah perubahan memeriksa portrait 390×844, landscape 844×390, desktop 1366×768. Branding krem/hijau, ilustrasi menu, dan maskot dipertahankan. |
| UX Judge · UX-01 · Tinggi · terkonfirmasi | HUD lama hanya timer/terkirim/kargo; tujuan dan deadline pesanan baru harus dicari melalui Info. Source `Hud.jsx` + capture bermain/Info membuktikan pemisahan informasi penting saat waktu berjalan. | **Upheld, diperbaiki.** Antrean maksimal dua kartu persisten dengan status, tujuan, waktu dan hadiah. Pengujian browser mengikuti pesanan sampai menang, lanjut misi, gagal, ulang dan jeda. |
| Logic Judge · LOG-01 · Tinggi · celah validator terkonfirmasi | Generator lama menggunakan BFS statis tanpa tubuh/gate/waktu; komentar dan `makeOrder` di `delivery/sim.js` mengakuinya. Ini tidak membuktikan seluruh misi lama mustahil. | **Revised.** Chair menolak klaim “semua map rusak”; menerima kekurangan validasi. Generator Mayhem kini membuktikan seluruh antrean lewat transisi asli. 432 kombinasi misi/seed/kecepatan direplay sampai menang tanpa kedaluwarsa, ditambah kasus kapasitas, multi-stop, gate, rem, tabrakan dan waktu mundur. |
| Bug Judge · BUG-01 · Tinggi · terkonfirmasi | `director.prepare` sebelumnya menahan satu permintaan tanpa timeout/pembatalan per scene. Reproduksi sebelum perbaikan: Portal macet lalu pindah Dungeon; dua tes gagal, lagu lama terus aktif. | **Upheld, diperbaiki.** Abort per permintaan, token hasil, timeout dan retry mengganti latch serial. Dua tes reproduksi menjadi hijau; browser menyengaja menahan dua FLAC Portal, mengamati keduanya dibatalkan, lalu musik Dungeon berjalan. |
| Bug Judge / audio · BUG-02 · Tinggi · terukur | 125 aset awal: musik −33,3…−30,7 LUFS, RMS efek −47,53…−9,79 dBFS. Decode `eits.mp3` mencapai +3,15 dBFS dan poison +0,19 dBFS. Ini menunjukkan overshoot hasil decode, bukan bukti pasti rekaman sumber sudah rusak permanen. Gain musik tambahan ×0,55 memperparah ketimpangan. | **Upheld, istilah clipping direvisi.** Stems dimaster dengan envelope limiter yang sama; rekaman dengan overshoot diturunkan, bukan diboost. Semua 148 aset hasil diukur ulang, tanpa sampel mendekati full scale. Nilai terukur ada di tabel audio berikut. |
| Bug Judge · BUG-03 · Sedang · ditemukan saat implementasi | Browser dengan clock/RNG terkontrol menunjukkan urutan order berubah ketika pemain menahan rem: clone pembuktian mewarisi `braking=true`, semua jalur kandidat berhenti, RNG terbuang. Tes skor juga memeriksa penalti kedaluwarsa agar rincian hasil sama dengan total. | **Upheld, diperbaiki.** Proof melepas hold input; rem tetap tersedia sebagai langkah W. Regresi membandingkan pesanan dengan/ tanpa hold rem. Breakdown sekarang memuat penalti sebesar skor yang benar-benar dikurangi. |
| UI/UX Judge · UI-02 · Sedang · ditemukan lewat capture | Iterasi pertama daftar 12 misi tersusun satu kolom dan tip menghalangi ular. Ini bukan kritik berdasarkan nama class saja; capture nyata memperlihatkannya. | **Upheld, diperbaiki.** Grid eksplisit enam kolom, dua baris; arahan singkat masuk HUD dan petunjuk mengambang Delivery dihapus. Capture ulang serta tes geometri memeriksa joystick/rem tetap di layar dan halaman tidak scroll. |

**Chair, tinjau ulang:** isu di atas ditutup berdasarkan tes/capture yang benar-benar dijalankan. Gaya kota berbentuk grid, pemilihan warna, dan keinginan animasi lebih ramai diperlakukan sebagai preferensi, bukan bug. Klaim “sudah optimal untuk semua HP”, “semua seed di dunia pasti dapat dimenangkan”, dan “sudah didengar pada speaker fisik” ditolak karena bukti tidak mencakupnya. Uji simulasi deterministik tidak menggantikan evaluasi rasa permainan manusia.

**Technical Advisor:** perbaikan memakai simulasi, clock, input dan journal existing; tidak ada loop atau audio manager tandingan, route baru, atau dependency runtime tambahan. Urutan pelaksanaan: akar race audio → gain/asset → paket/rute/skor → HUD/kontrol → regresi. Lanjutan yang masih berguna: playtest tingkat tekanan dan kualitas suara di Android fisik serta Safari/iOS; ukur sebelum menambah optimasi atau menulis ulang sistem.

**Keputusan baik yang dipertahankan:** simulasi murni dengan RNG terinjeksi, waktu beku saat jeda, transaksi kepala/ekor/kargo terurut, journal hasil idempoten, kontrol bersama, dua tema decoded dalam cache, loop native dengan frame eksak, dan rendering tanpa mengubah state.

### Audio: proses dan hasil pengukuran

`npm run build:audio` benar-benar dieksekusi ulang. FFmpeg mengukur loudness lalu menerapkan boost terukur dan limiter tertaut pada base, danger, jumlah dan selisihnya; tiga putaran diproses dan putaran tengah dipakai supaya envelope tidak mulai dingin di tepi loop. FLAC mempertahankan jumlah frame. Efek pendek memakai kalibrasi peak sesuai konteks, bukan target LUFS seragam. Lima rekaman lama dikalibrasi terpisah; file yang sudah dekat target tidak di-encode ulang.

| Ukuran | Sebelum | Sesudah |
| --- | --- | --- |
| Jumlah aset audio | 125 | 148: 70 FLAC, 35 MP3 musik, 38 WAV cue, 5 rekaman lama |
| Musik full mix, LUFS integrated | −33,3…−30,7 | −18,7…−17,5 |
| True peak tertinggi full mix MP3 | tidak dipakai sebagai target semata | −2,0 dBFS |
| Batas terukur `abs(base)+abs(danger)` | belum diuji seluruh aset | 0,839996, sekitar −1,51 dBFS; 35 aransemen × 4 intensitas diuji |
| Lompatan sampel terbesar pada sambungan loop | belum diukur menyeluruh | 0,001831; di bawah lompatan sampel internal track yang sama |
| Sampel decode mendekati full scale (`abs >= 0,9999`) | eits 580, poison 2 | 0 pada seluruh 148 file |
| RMS SFX (konteks berbeda, bukan target seragam) | −47,53…−9,79 dBFS | −38,65…−19,44 dBFS |

Musik Delivery menang/kalah berdurasi pendek dan tidak loop. MP3 fallback memakai mix tetap, sehingga lapisan danger tidak adaptif saat fallback; status kompatibilitas tampil di pengaturan. Headroom stem tidak menjadi jaminan absolut untuk setiap campuran output hardware. Verifikasi di sini adalah pengukuran file, pemeriksaan seam, native decode/playback browser, routing dan lifecycle; tidak ada klaim audition pada perangkat fisik.

### Verifikasi rilis dan cakupan

- `npm test`: **425/425 lulus**, 0 gagal, sekitar 188 detik pada run rilis. Termasuk replay 400 varian Dungeon, boss, mode Arkade, Ekspedisi, Rebut Arena, storage, input, audio dan Delivery; pengujian 432 kombinasi Delivery ada dalam satu kasus matriks, bukan 432 test-case terpisah.
- Tinjau akhir audio menambahkan satu regresi cache/status kompatibilitas dan pelepasan node musik hasil yang selesai; ketiga suite audio dijalankan ulang pada source akhir. **27/27 tes audio akhir lulus**, 0 gagal; build produksi dijalankan ulang setelah perbaikan terakhir dan berhasil.
- `npm run build`: berhasil untuk `/`, route `/dungeon` existing, not-found dan manifest. Tidak ada route baru/dependency runtime baru.
- `npm run lint`: **belum dapat dijalankan noninteraktif**, karena repo tidak memiliki konfigurasi/dependency ESLint dan `next lint` meminta setup. Tidak dianggap lulus; dependency baru tidak dipasang hanya untuk menutupi keterbatasan ini.
- Browser: alur Delivery nyata, 75 input per misi pertama, pada 390×844, 844×390, 1366×768 mencapai Rank S/skor 118 yang sama dengan model independen. Dilanjutkan ke misi 2, tabrakan, retry, jeda tanpa deadline berkurang, dan perubahan Master tersimpan. Tidak ada page error yang ditangkap.
- Profil touch terpisah: pointer coarse/maxTouchPoints=1; hold/rem berhenti dan lepas melanjutkan; joystick serta rem tetap berada dalam viewport portrait/landscape; scrollX/scrollY=0 dan lebar dokumen sama dengan viewport. Capture yang diaudit mencakup menu, bermain, overview, hasil dan pengaturan.
- Browser audio: seluruh 14 mode yang terlihat di menu berpindah ke tema masing-masing; Portal sengaja ditahan lalu kedua permintaannya dibatalkan saat pindah Dungeon; kegagalan FLAC Portal memutar `portal.mp3`. Semua 70 FLAC berhasil didekode native dengan sample rate/frame count katalog. Satu AudioContext digunakan per halaman. Route `/dungeon` existing juga diverifikasi mute → suspended dan unmute → running.
- Pemrosesan aset benar-benar diulang dengan script build audio; pengukuran akhir meliputi 148 file. Pemeriksaan headroom dan seam mencakup 35 aransemen × 4 intensitas. MP3 adalah preview/fallback; jalur utama memakai loop native FLAC, tanpa timer restart.

| Scorecard tinjau ulang (subjektif, cakupan teruji) | Nilai / 10 | Batas |
| --- | --- | --- |
| UI / keterbacaan | 8 | HUD/capture di tiga viewport; belum studi pembacaan pada perangkat fisik |
| UX / kontrol | 8 | Keyboard, swipe bersama dan rem/touch teruji; playtest kenyamanan lanjutan masih berguna |
| Logika gameplay | 8 | Bukti antrean + 432 replay; bukan enumerasi semua seed/input |
| Reliabilitas | 8 | Race, retry, lifecycle, persistensi dan regresi teruji; lint belum terkonfigurasi |
| Audio | 8 | Pengukuran, decode, seam dan routing teruji; audition hardware belum |
| Maintainability | 8 | Modul simulasi/routing/misi terpisah, tanpa manager/loop baru; controller lama tetap dipertahankan |
| **Keseluruhan** | **8** | Penilaian reviewer, bukan skor objektif atau jaminan bebas bug |


### Skill, referensi dan batas cakupan

- **App Review Council**, **Web Dev Workflow**, serta Product Design **Index / Get Context / User Context / Audit / Research** dibaca/dijalankan pada tahap yang sesuai. Preflight Product Design tidak menemukan konteks tersimpan; brief memakai prompt dan source/capture aplikasi. GitHub `itsKaizenDev/Eat-eat` dibaca di commit `d8551af93c55dca40eaf20b0da1fc20f965809e6`; file ZIP bersama cocok dengan blob repo. Tujuh file source repo yang tidak ada di ZIP dipertahankan, termasuk route `/dungeon`; backup ZIP bersarang tidak diduplikasi.
- Browser cloud tidak menjangkau server lokal (connection refused). Fallback yang dipakai adalah Chromium lokal melalui Playwright, dengan screenshot baru dan profil pointer desktop/touch; tidak ada klaim browser cloud berhasil menjalankan game. Shared resource `critical-overrides` Product Design tidak tersedia pada locator yang dirujuk. Aturan prompt pengguna tetap diikuti.
- **Ideate** berbasis tiga gambar dan **Design QA** untuk peniruan mockup ditelaah tetapi tidak dipakai sebagai proses persetujuan mockup: tugas ini implementasi pada desain existing dan tidak memiliki mockup baru yang disetujui. Alternatif layout dipertimbangkan pada kode (papan tetap, rail permanen, kamera/HUD adaptif); pilihan kamera/HUD diperiksa lewat audit visual berulang. Tidak diklaim lulus kesetiaan pada gambar rancangan yang tidak ada. Temuan dan perbaikannya disatukan di changelog ini sesuai larangan membuat Markdown tambahan.
- Prinsip referensi: prioritas antrean/dinamika ruang dari [Overcooked 2](https://www.team17.com/news/introducing-overcooked-2), objektif/lingkungan dari [Moving Out 2](https://www.team17.com/games/moving-out-2), imbalan waktu/rute dari [manual Crazy Taxi](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/71230/manuals/DC_CT_PC_MG_EFIGS_FINAL_lr.pdf), dan pendekatan solusi alternatif dari [Good Job!](https://www.nintendo.com/us/store/products/good-job-switch/). Musik, level dan UI spesifik game tersebut tidak disalin.
- Keterbatasan tersisa: belum ada playtest manusia pada Android kelas bawah/Safari iOS, audition speaker/headphone fisik, atau pengujian seluruh kemungkinan seed/input. Uji otomatis tidak menilai apakah kurva kesulitan sudah paling menyenangkan. Roadmap lanjutan: P1 playtest perangkat fisik dan tekanan deadline; P2 kalibrasi skor/bintang memakai hasil playtest; opsional variasi dekorasi kota setelah keterbacaan terbukti.

## Daftar isi

- [Nama K-Snake dan telaah audit — 20 Oktober 2026](#ksnake-dan-audit)
- [Lampiran audit eksternal](#audit-eksternal-20261020)
- [Perapian dokumentasi — 20 Oktober 2026](#perapian-dokumentasi)
- [Riwayat perubahan ringkas](#riwayat-ringkas)
- Revisi produk dan UI
  - [Konsistensi scene Adventure & Arcade — 20 Oktober 2026](#doc-asset-consistency)
  - [Dungeon, movement dan aset menu — 19 Oktober 2026](#doc-dungeon-revision)
  - [Revive Ekspedisi dan Jejak Kunci — arsip sebelum Dungeon](#doc-revive-jejak-kunci)
  - [Revisi Petualangan dan Boss](#doc-adventure-revision)
  - [Boss Kebun — batch pertama](#doc-boss-batch-1)
  - [Desain UI Fokus](#doc-ui-fokus)
- Panduan dan prompt aset
  - [Prompt aset revisi Dungeon](#doc-asset-prompts-dungeon)
  - [Prompt aset Petualangan terdahulu](#doc-docs-assets-adventure)
  - [Prompt aset Boss dan ekspresi terdahulu](#doc-docs-asset-boss-batch-1)
  - [Panduan aset Fokus, maskot dan item](#doc-docs-asset-fokus)
- Catatan teknis tahap 1–9
  - [Tahap 1-2](#doc-docs-tahap-1-2)
  - [Tahap 3](#doc-docs-tahap-3)
  - [Tahap 4](#doc-docs-tahap-4)
  - [Tahap 5](#doc-docs-tahap-5)
  - [Tahap 6](#doc-docs-tahap-6)
  - [Tahap 7](#doc-docs-tahap-7)
  - [Tahap 8](#doc-docs-tahap-8)
  - [Tahap 9](#doc-docs-tahap-9)
- Diff kode historis
  - [Diff Dungeon lengkap per file](#doc-dungeon-diff-per-file)

<a id="touch-controls-v13"></a>
## Kontrol sentuh: joystick halus dan tata letak yang bisa diatur — 24 Oktober 2026

- Joystick Dungeon kini analog halus: arah bebas (bukan 8 sektor), kecepatan naik sesuai jarak dorongan, zona mati turun dari 32% ke 12%, ukuran bawaan 115%. Mode lama 8 arah tetap tersedia.
- Pengaturan > Kontrol sentuh: ukuran joystick (80–160%), ukuran tombol (80–150%), zona mati, transparansi, mode gerak (Halus / 8 arah), joystick melayang (muncul di bawah jempol), Atur posisi kontrol (seret joystick dan tombol aksi), dan Reset kontrol.
- Pilihan disimpan di `localStorage` (`snake-controls-v2`) lewat `lib/controlPrefs.js`; posisi dibatasi agar kontrol tidak keluar layar.
- Tes baru: normalisasi preferensi dan kecepatan analog (dorongan parsial lebih lambat dari penuh).

<a id="dungeon-boss-51"></a>
## Dungeon: level spesial 51 — Penjaga Relik Agung — 24 Oktober 2026

- Level 51 muncul setelah level 50: arena tunggal 23×19 (bukan varian acak), penjaga raksasa 3×3 menjaga satu relik bernilai 50 Apple Coin. Relik terkunci sampai bos tumbang; setelah itu ambil relik dan kembali ke pintu keluar.
- Mekanisme dipinjam dari Adventure: HP bos 26 dalam 5 fase (3/4/5/6/8), serangan bertelegraf (baris, ranjau, koridor), nyawa pemain 5 dengan kebal 2,5 detik setelah terkena, jantung hijau memulihkan 1 nyawa tiap pindah fase, bintang dari sisa nyawa.
- Celah besar: setelah tiap serangan terbuka 1–3 lingkaran bercahaya berjari-jari 1,5 petak di depan bos; menginjaknya memberi 1 pukulan per lingkaran per jendela (7 detik di fase 1 menjadi 5 detik di fase 5). Fase 4–5 melukai 2 nyawa.
- `lib/puzzle/threats.js`: createBoss/updateBoss/BOSS_RULES; `sim.js`: relik terkunci, hadiah koin, rating; `render.js`: tubuh bos, area merah, lingkaran celah, bar HP dan nyawa; `controller.js`: teks status dan total koin; `generator.js`: bossLevel().
- Tes baru di `dungeon-combat.test.mjs`: relik terkunci, telegraf dan kebal, serta bot yang mengalahkan seluruh 5 fase dan menang dengan 50 koin.

<a id="dungeon-polish-v10"></a>
## Dungeon: perapihan posisi item dan monster — 24 Oktober 2026

- Tahap `polishRound` (rounds.js) dijalankan di atas bank yang sudah terverifikasi: `node scripts/build-campaign.mjs --polish`. Tiap varian diverifikasi ulang (rencana, validasi, tes diam, replay); yang gagal tetap memakai versi asli.
- Jebakan, tempat sembunyi, koin, obor, dan lonceng yang bertumpuk digeser ke petak terdekat yang punya jarak cukup dari item lain.
- Jalur Shadow yang menempel dinding dipindah ke jalur dengan ruang terbuka di kedua sisi; jalur tetap dijauhkan dari rute patroli dan objektif.
- Slot monster fleksibel (level 41+) diseimbangkan lintas varian: Peniru dan Laba-laba bergantian, level 45+ juga bisa Shadow kedua. Level 36–39 selalu Peniru, level 40 selalu Laba-laba.
- Varian yang dirapikan ditandai `polished`; tes reproduksi seed dilewati untuk varian itu, sedangkan replay tetap dijalankan.

<a id="dungeon-logic-v8"></a>
## Dungeon: logika peta, penjaga, dan monster — 24 Oktober 2026

Fokus batch ini adalah logika; tampilan monster baru sengaja sederhana. Tidak ada file baru dan tidak ada route/halaman baru.

- **Rencana per level** (`levelPlan`): peran penjaga (Relik, Koridor, Akses, Penyisir), penjaga cepat, anjing, slot monster, dan jumlah kamera mengikuti tabel master prompt. Peta tumbuh dari 13×11 sampai 29×25 dan luas lantai punya target yang naik tiap level (toleransi ±2). Revisi kampanye 7.
- **Generator denah**: sekat dengan pintu dua petak membentuk sektor; bentuk denah diskalakan per level; brankas 5×5 di level awal dan 5×7 mulai level 16; penjaga relik berdiri di samping poros brankas dan menoleh bergantian; kamera menghadap pintu sekat dan menyapu.
- **Simulasi**: alarm terkoordinasi (penjaga terdekat mengejar, lainnya menyisir titik berbeda, penjaga relik dibatasi jarak kejarnya); laporan CCTV diperbarui sekali per detik selama terlihat; penjaga macet kembali ke pos tanpa teleport; Shadow memberi peringatan 1,2 detik; Peniru dan Laba-laba ditambahkan; NPC hanya menghindari monster yang pernah mereka lihat, dan ingatannya memudar.
- **Validasi**: validatePlan, tes diam 45 detik, par dari rute nyata. Mulai level 16 pengumpulan semua apple coin tidak diwajibkan dalam replay; level 1–15 tetap wajib.
- **Kepadatan**: jarak pandang penjaga dipersempit mulai level 25, kamera menjadi berkas sempit mulai level 21 dan dikurangi di level 35+, anjing bebas satu di level 35+, monster dijauhkan dari rute patroli.
- **Kamera pemain** untuk peta besar: bila tile < 18 px CSS, tampilan mengikuti pemain.
- Bank 50 misi × 8 varian dibangun ulang dan lolos replay.

<a id="ksnake-dan-audit"></a>
## Nama K-Snake dan telaah audit — 20 Oktober 2026

Nama resmi game adalah **K-Snake**. Judul/nama paket lama yang masih tercatat dalam arsip menggunakan Eat-eat; itu disimpan sebagai riwayat, bukan nama produk saat ini.

### Perubahan yang diterapkan pada batch ini

- Nama pada header menu, loading, HUD, metadata judul/deskripsi, manifest instalasi, README dan judul changelog menjadi K-Snake.
- Deskripsi metadata tidak lagi menjanjikan lima mode petualangan yang semuanya tampil. Boss standalone tetap tersembunyi; empat pilihan tersedia di desktop, tiga pada perangkat sentuh.
- README menjelaskan engine Arkade dan modul petualangan; klaim port 1:1 dihapus.
- Lampiran audit dan hasil telaah disimpan di changelog yang sama. Tidak dibuat Markdown tambahan di proyek.
- Kode engine, penyimpanan, key localStorage, aturan hasil 2P, mekanisme Boss, gambar dan transparansi area judul belum diubah oleh batch penamaan ini.

### Hasil mencocokkan audit dengan source terakhir

Laporan eksternal dibaca dari `AUDIT-Eat-eat.md` bertanggal 20 Oktober 2026. Ini telaah terhadap audit, bukan pernyataan bahwa semua sarannya sudah diterapkan.

| Temuan | Hasil telaah | Tindak lanjut |
| --- | --- | --- |
| T-01 — rekor global | Direproduksi: `snake_best=5`; Mayhem mendapat 41, selesai lalu nilai menjadi 41 dan Classic membaca 41. | Prioritas tinggi: pisahkan rekor menurut mode serta durasi Time Attack. Rekor lama tidak memiliki metadata asal mode, sehingga migrasi harus menjaga nilainya dan menjelaskan sifat legacy-nya. |
| S-01 — simpan saat keluar | Direproduksi: HUD best 41 tetapi storage masih 5 selama ronde; API belum punya `flush`. | Prioritas tinggi: flush pada siklus hidup halaman, dengan penanganan kegagalan write yang tetap bisa dicoba lagi. |
| T-02 — nyawa terakhir habis bersamaan | Direproduksi: skor 30 vs 2 tetap Seri. Komentar dan tes engine memang menetapkan semua habis = seri. | Ini perubahan aturan permainan, bukan crash atau kesalahan implementasi terhadap kontrak saat ini. Jangan mengganti tiebreak otomatis hanya karena audit menyarankannya. |
| S-03 — papan penuh | Direproduksi pada fixture penuh: `addFood` mengembalikan null dan status tetap playing. | Fix terpisah perlu menghitung arena aktif, penyempitan, ranjau dan occupancy; rumus seluruh COLS×ROWS dalam audit belum cukup untuk semua mode. |
| S-04 — swipe menu samping | Source menunjukkan portal keluar dari ancestor `.no-swipe`; wrapper samping dan guard menu pada swipe belum ada. Satu swipe horizontal pada padding di emulasi Chromium tidak memulai game, sehingga belum terkonfirmasi secara runtime. | Prioritas tinggi untuk uji gesture pada padding menu dan cegah arah memulai ronde dari swipe UI. |
| S-07 — grid tiga mode tablet | Source dan browser Chromium pada viewport 768×1024 menunjukkan tiga tombol dengan data-n=3 tetapi lima kolom CSS. Ini terkonfirmasi pada emulasi tablet. | Fix UI kecil: jumlah kolom mengikuti pilihan yang tampil, sambil menjaga dua kolom di HP kecil/landscape. |
| S-02 — audio | Audio lazy, belum ada mute/unlock pada gesture tombol. Penolakan playback ditelan. | Perlu batch audio dan uji iOS nyata; laporan kode tidak membuktikan semua perangkat pasti bisu. |
| S-05, S-06 — font, preload, varian | Link font eksternal ada; service worker tidak ditemukan; kondisi varian loader berbeda dengan picture. | Satukan kebijakan varian dan strategi preload. Self-host font dapat dikerjakan tanpa harus sekaligus menambah offline/PWA. |
| S-08, R-01, R-11 — render/performa | Resolusi Canvas tetap dan animasi per-frame ditemukan; dampak visual/performa belum diukur pada perangkat fisik. | Ukur DPR dan frame timing sebelum mengubah seluruh controller atau menambah cache render. |
| R-03 — gagal respawn | `tryRespawn` sudah membersihkan ranjau pada percobaan ke-10, lalu menyerah setelah ke-12. | Saran membersihkan ranjau pada audit sebagian sudah ada. Kondisi padat tubuh/occupancy masih perlu reproduksi terarah dan aturan fallback yang jelas. |
| R-05 — flicker media query | Nilai awal false ada, tetapi LoadingScreen menutupi proses boot. | Perlu rekaman frame awal untuk membuktikan flicker benar-benar terlihat; jangan anggap otomatis bug visual. |
| R-06 — inert React 19 | Proyek masih React 18. | Catatan kompatibilitas saat upgrade, bukan bug runtime versi ini. |
| R-07 — dokumentasi/metadata | Nama dan deskripsi aktif diperbaiki pada batch ini. Angka 285 berada di arsip batch Revive; batch Dungeon mencatat 299 dan batch aset mencatat 8 tes terfokus. | Jangan menghapus riwayat hasil tes yang benar pada waktunya atau menyebut semua angka lama sebagai hasil terbaru. |
| R-10 — revive async | Mengecek destroyed hanya sebelum consume tidak menutup race yang terjadi selama await. Kuota offline memakai jam perangkat. | Butuh desain transaksi/cancel/refund yang menjaga kuota lintas tab; jangan menerapkan pengecekan tunggal sebagai jaminan race selesai. |
| R-02, R-04, R-08, R-09 | Tercatat sebagai temuan kode untuk cleanup, lifecycle fokus dan petunjuk kontrol. | Masuk backlog terarah; tidak digabung dengan penggantian nama produk. |

### Keputusan banner

Saran full-bleed tanpa alpha dan gradien di area kiri akan mengubah arahan desain yang sebelumnya meminta area teks transparan. Arahan terakhir itu tetap berlaku. Audit geometri ruang kosong desktop dapat dipakai untuk membenahi ukuran/framing, tetapi bukan izin untuk menggambar ulang 15 scene atau menghapus transparansi.

### Urutan batch fix yang disarankan

1. Rekor per mode/durasi dan flush saat halaman disembunyikan/ditutup.
2. Celah swipe menu samping dan grid tablet tiga mode.
3. Audio, varian/preload scene, lalu font lokal.
4. Kondisi papan penuh, DPR/animasi dan fallback respawn dengan tes regresi yang sesuai.
5. Aturan tiebreak 2P dan perubahan arah visual diputuskan terpisah.

### Verifikasi batch ini

- `npm test`: **299/299 lolos**, tanpa skip; dijalankan satu kali pada batch ini.
- `npm run build`: produksi Next.js berhasil, compile serta pemeriksaan lint/type bawaan lolos.
- Browser Chromium: judul halaman, loading SSR, menu, HUD Arkade dan Dungeon, serta manifest menampilkan K-Snake. Pada HP 360 px tidak ditemukan overflow horizontal akibat nama baru.
- Probe rekor global, best yang belum disimpan saat ronde berjalan, hasil seri 2P dan papan penuh dijalankan. Ini membuktikan perilaku saat ini, bukan bahwa bug sudah diperbaiki.
- Grid tablet 768×1024 direproduksi: 3 tombol dalam 5 kolom. Satu percobaan swipe pada padding menu samping belum memulai game; temuan swipe tetap perlu verifikasi lebih lanjut.
- Tidak ada error JavaScript pada alur browser yang diperiksa. Uji dilakukan dengan emulasi, bukan iPhone/HP fisik.
- `git diff --check` bersih. Engine, storage, key, aset, konfigurasi dan dependency sama dengan basis; perubahan kode dibatasi pada lima file UI/metadata untuk penamaan.

Klaim pengujian pada lampiran audit adalah milik penulis audit dan tidak dihitung sebagai tes ulang batch ini. Temuan gameplay tetap menjadi backlog yang ditandai di atas, bukan perubahan yang terselip dalam paket penamaan.

<a id="perapian-dokumentasi"></a>
## Perapian dokumentasi — 20 Oktober 2026

- Menggabungkan 19 dokumen revisi/prompt/diff dengan riwayat `CHANGELOG.md` menjadi satu `changelog.md`.
- Menghapus berkas Markdown yang telah digabung dari paket proyek dan memperbarui tautan di README serta catatan yang dipindah.
- Menyimpan seluruh isi kode dalam blok diff/prompt; nama path di dalam diff adalah cuplikan historis dan tidak diubah.
- Kode aplikasi, aset, konfigurasi, dependency, data kampanye dan berkas diff mentah tetap sama dengan ZIP sebelumnya.
- Pemeriksaan hanya mencakup keutuhan isi dokumen, tautan, isi ZIP dan perbandingan byte berkas non-Markdown. Build dan tes gameplay tidak diulang untuk perubahan dokumentasi ini.

<a id="riwayat-ringkas"></a>
## Riwayat perubahan ringkas

Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Rilis dinamai menurut **tahap kerja**, bukan nomor versi.
Catatan tahap 0–9 berikut adalah arsip. Hasil verifikasi untuk setiap revisi dicatat pada bagian revisi yang bersangkutan.

### Revisi — Konsistensi Aset Adventure & Arcade (20 Oktober 2026)

- Menyamakan gaya 7 scene: Dungeon, Kurir Apel, Ekspedisi, Rebut Arena, Penjaga Kebun, Time Attack dan Mayhem biasa.
- Memakai Mayhem+ / Hard sebagai acuan garis, warna, proporsi maskot dan framing. Aset acuan tidak diubah.
- Mengganti 14 WebP desktop/HP; area judul transparan, latar berwarna di dalam scene tetap ada.
- Semua kode aplikasi dan gameplay tetap identik dengan basis Dungeon terakhir.
- Detail perubahan, verifikasi dan prompt: [ASSET_CONSISTENCY.md](#doc-asset-consistency).

### Revisi — Dungeon, Movement & Aset Menu (19 Oktober 2026)

- Jejak Kunci menjadi Dungeon; id mode, key progres, unlock dan saldo koin tetap kompatibel.
- Hold keyboard/DPad memakai repeat aplikasi; arah terbaru menggantikan input lama. Keyup, jeda, blur dan perpindahan mode membersihkan hold. Repeat Esc di dialog jeda diabaikan.
- Gerbang kampanye memakai tuas permanen. Slime 1 HP, penjaga batu 2 HP; tiga hati pemain, sasaran serangan satu giliran, heal dan combat opsional.
- LOS mengikuti tembok/sudut, penjaga tidak menumpuk. Ruang 35–42 tepat satu musuh; 43–50 tepat dua. Semua 50 ruang punya solusi optimum yang diuji ulang.
- Save tertunda digabungkan dengan hasil ruang berikutnya; UI memberi tombol coba simpan lagi.
- 15 pasang scene WebP desktop/HP: Day dan cutout lama didesain ulang; Mayhem/variasi serta 2P Lokal dibersihkan area teksnya. Judul outlined tanpa bidang warna.
- Detail aturan, batasan, diff per file dan verifikasi: [DUNGEON_REVISION.md](#doc-dungeon-revision).

### Revisi — Revive Ekspedisi & Jejak Kunci

- Revive Ekspedisi 3 kali, kuota bersama lintas run/kecepatan; kembali penuh 72 jam setelah pemakaian pertama. Lanjut rute/fase yang sama; kebun kembali dengan 3 hati. Kuota dan hitung mundur muncul di menu/hasil.
- Jejak Kunci memakai maskot ular satu petak, animasi langkah 120 ms, antrean input, dan sakelar permanen. Koleksi menambah penghitung, tidak menambah panjang.
- Apel menjadi koin bonus opsional, disimpan saat keluar. Replay hanya memberi selisih koleksi terbaik per level. Skin masih rencana.
- Penjaga memiliki patroli 3–5 petak, peringatan satu giliran, pengejaran posisi terakhir yang terlihat, dan perilaku kembali ke patroli. Tombol Tunggu/Spasi memajukan giliran.
- Batu krem dengan retakan kuat, pagar kayu dengan panah/palang, dan jejak patroli menggantikan objek yang sulit dikenali.
- Semua 50 level memakai revisi 3 dengan par/solusi baru; unlock lama tetap ada, rekor versi lama ditandai.
- Layar kalah Ekspedisi di HP landscape memakai dua kolom agar revive, main lagi, dan kembali ke menu terlihat tanpa scroll.
- 285/285 tes lolos, build produksi lolos. Pemeriksaan Chromium mencakup menu 360/390/768/1366 px dan permainan landscape 844×390. Penyimpanan masih lokal; belum ada backend atau toko skin.

---

| Tahap | Isi | Test | Ukuran rute `/` (First Load JS) | Berkas serah |
|---|---|---|---|---|
| 0 | Audit & rencana | — | 140 kB (baseline) | — |
| 1–2 | Stabilisasi engine | 37 | — | `Eat-eat-main-tahap-1-2.zip` |
| 3 | Registry mode + Puzzle | 95 | 151 kB | `…-tahap-3.zip`, `tahap-3.diff` |
| 4 | Perbaikan uji coba + Delivery | 134 | 158 kB | `…-tahap-4.zip`, `tahap-4.diff` |
| 5 | Roguelite "Ekspedisi Mayhem" | 156 | 166 kB | `…-tahap-5.zip`, `tahap-5.diff` |
| 6 | Territory "Rebut Arena" + info dua kolom laptop | 191 | — | `…-tahap-6.zip`, `tahap-6.diff` |
| 7 | Boss Battle "Penjaga Kebun" | 216 | 180 kB | `…-tahap-7.zip`, `tahap-7.diff` |
| 8 | Menu laptop 2 kolom + kartu statistik disembunyikan di menu awal | 216 | 180 kB | `…-tahap-8.zip`, `tahap-8.diff` |
| 9 | Jejak Kunci 50 level buatan sistem + rintangan, power-up, penjaga | 253 | 187 kB | `…-tahap-9.zip`, `tahap-9.diff` |

---

### Tahap 9 — Jejak Kunci 50 level

Rincian: [docs/TAHAP-9.md](#doc-docs-tahap-9). Level 1-5 tutorial, 6-50 dibuat generator (data tetap lewat `npm run build:campaign`); duri/Perisai, tembok retak/Palu, gerbang genap-ganjil, penjaga (idle/kejar/pulang) dan semak; tersengat = game over; menu level per 10 + kartu pengantar; bantuan diperbarui. Engine mode lain tidak berubah.

---

### Tahap 8 — Menu laptop 2 kolom

Rincian: [docs/TAHAP-8.md](#doc-docs-tahap-8). Hanya UI: menu awal arkade dua kolom di laptop, menu Petualangan lima mode satu baris, kartu statistik mode disembunyikan saat menu awal, teks "Tujuan:" diperbaiki. Engine dan aturan tidak berubah.

---

### Tahap 7 — Boss Battle "Penjaga Kebun"

Rincian aturan, angka, dan keterbatasan: [docs/TAHAP-7.md](#doc-docs-tahap-7).

#### Ditambahkan
- Mode **Penjaga Kebun**: 1 boss, 3 HP/fase, 3 nyawa, tanpa batas waktu; sentuh + keyboard. Apel energi (3 energi = 1 pukulan) dan titik lemah yang terbuka bergantian dengan serangan.
- Tiga pola serangan (baris berbahaya, ranjau kebun, koridor menyempit), masing-masing peringatan → aktif → pemulihan, peringatan dihitung dari waktu tempuh rute aman; fallback ke baris bila pola tidak valid.
- Pukulan sekali per jendela; transisi fase (fase baru aktif setelah transisi); respawn aman + kebal 2,5 dtk; pukulan final menang walau ada kerusakan pada tick yang sama; hasil dan rekor sekali.
- Rekor `boss|hp:3|lives:3|speed:<pref>`: kerusakan terbesar, menang/main, kemenangan tercepat (`bestSecs` opsional).
- `lib/boss/{sim,controller,render}.js`, latar `bg-boss.svg`, HUD boss, menu (5 mode petualangan: grid 3 kolom di laptop).
- Tanpa kedipan; hormati `prefers-reduced-motion`; bahaya dibedakan oleh pola (arsir/X/bom), bukan hanya warna.

#### Verifikasi
- 216 test; 15 mutasi aturan inti tertangkap (satu mutan lolos → test pemendekan tubuh diperketat). SSR menu/HUD diperiksa.
- **Belum diverifikasi**: browser nyata (rasa gerak, balance, keterbacaan di layar kecil, geser layar, suara).

---

### Tahap 6 — Territory "Rebut Arena" + info dua kolom

Rincian: [docs/TAHAP-6.md](#doc-docs-tahap-6). (Catatan: versi changelog sebelumnya menulis tahap ini "belum terintegrasi / belum dikirim" — itu sudah tidak benar; tahap 6 selesai dan diserahkan dengan 191 test.)

#### Ditambahkan
- Mode **Rebut Arena** (2P lokal keyboard): jejak + flood fill, 3 nyawa, target 60% atau wilayah terbanyak dalam 90 dtk. Keputusan dari snapshot (hasil tidak bergantung urutan P1/P2); kematian mengalahkan klaim; dua klaim serentak atas petak sama = petak tetap netral; respawn aman + base darurat 3x3.
- `lib/territory/{sim,controller,render}.js`, latar `bg-territory.svg`; rekor `territory|match:90|target:60|speed:<pref>` (kemenangan P1/P2, seri; skema kompatibel).
- Tidak tersedia di layar sentuh (disembunyikan dengan catatan).

#### Diubah
- **Layar Petualangan dua kolom di laptop** (lebar viewport ≥ 640 px, bukan panel samping HP): kiri deskripsi/tujuan/pratinjau, kanan pengaturan/rekor/kontrol/PLAY; kartu HUD Delivery dan Ekspedisi juga dua kolom. Tampilan visual belum diperiksa di browser.
- Jumlah kolom tombol mode memakai CSS (`data-n`), bukan gaya inline.

#### Verifikasi
- 191 test; 9 mutasi aturan inti tertangkap (dua celah, tepi atas dan kiri/kanan, ditutup test baru).
- **Batasan disengaja**: area yang hanya berbatas tepi papan tidak direbut.

---

### Tahap 5 — Roguelite "Ekspedisi Mayhem"

#### Ditambahkan
- Mode **Ekspedisi Mayhem**: satu run = 5 ronde pendek (target 28, 40, 52, 64, 76 poin). Target tercapai → simulasi dibekukan → pilih 1 dari 3 upgrade. Ronde 5 tuntas = run menang. Menabrak = run kalah; upgrade tidak dibawa ke run baru. Run yang sedang berjalan tidak disimpan.
- Isi ronde: apel normal +4, besar +10, racun −6 (ekor −2), keberuntungan +4 dan efek sementara; ranjau mematikan (2/3/4/4/5 per ronde). Efek: Waktu Melambat, Skor Ganda (untung); Terburu-buru, Kontrol Terbalik (rugi).
- **Enam upgrade** (maks 2 tingkat): Tubuh ringkas, Langkah berani, Kulit tebal, Racikan penawar, Bekal manis, Napas panjang — masing-masing dengan manfaat **dan** harga tertulis.
- Aturan yang didokumentasikan dan diuji: stacking (pengali multiplikatif, hitungan aditif), urutan kalkulasi nilai apel, clamp (panjang awal ≥ 3, interval 70–300 ms, durasi efek ≤ 20 dtk, peluang rugi ≤ 80%, ranjau ≤ 10), dan **kombinasi terlarang** (upgrade tidak ditawarkan bila membuat apel normal < 3 poin).
- **Kulit tebal**: dinding/tubuh → ular berbelok ke sisi aman (kiri dulu, lalu kanan); buntu → direlokasi ke garis lurus bebas (kepala tidak pernah di dalam tembok); ranjau → hancur dan ular lanjut.
- `UpgradeDialog`: dialog modal aksesibel — fokus terkunci, tombol 1–3, Esc tidak menutup, setelah satu pilihan semua kartu dinonaktifkan.
- Ronde menunggu arah pertama pemain; arah tidak memulai run dari menu.
- Determinisme: satu aliran RNG per run (spawn, efek, penawaran). Seed + input + pilihan sama = run identik.
- Ilustrasi latar `bg-roguelite.svg`; HUD ronde/target/total/perisai/penawar/upgrade; rekor `roguelite|rounds:5|speed:<pref>`.
- Arsitektur: `lib/roguelite/{upgrades,sim,controller,render}.js`, `components/UpgradeDialog.jsx`.

#### Diubah
- Skema rekor `snake-records-v1` diperluas **kompatibel ke belakang**: `bestRounds` opsional, entri Delivery lama tetap valid.

#### Diperbaiki
- Menekan arah yang sama dengan hadap awal (kanan) diabaikan sebagai duplikat sehingga ronde tidak pernah mulai (ditemukan test controller).
- Impor ikon `Zap` ganda ditangkap test sebelum build.
- Apel dan ranjau diperbesar sedikit di renderer agar terbaca di sel 40 px.

#### Verifikasi
- 156 test; mutasi pada aturan inti (batas tingkat, kombinasi terlarang, pembekuan menu, belok aman, skor tidak negatif, reset perisai) tertangkap semua. Satu mutan sempat lolos karena test pembekuan menu kurang tajam, lalu diperketat.
- 20 pemeriksaan SSR (menu, HUD, dialog dengan atribut aksesibilitas); gambar arena dan latar.
- **Belum diverifikasi**: balance (semua angka adalah parameter awal), rasa gerak, dialog di layar kecil/landscape HP, navigasi keyboard dan pembaca layar nyata, fokus kembali ke game sesudah memilih upgrade.

---

### Tahap 4 — Perbaikan uji coba + Delivery "Kurir Apel"

#### Diperbaiki (dari uji coba di browser)
- **Ular Puzzle kaku** → tiap segmen kini meluncur (120 ms, ease-out), tikungan melengkung, efek pop (makan/kunci) dan riak (portal), undo ikut meluncur. Loop RAF hanya hidup selama ada animasi; menghormati `prefers-reduced-motion`; simulasi tetap berbasis langkah.
- **Suara "eits" di Puzzle tidak cocok** (itu suara bahaya, padahal Puzzle tidak bisa mati) → bunyi sintetis lembut: tumbukan, pintu terkunci, menang (WebAudio, tanpa file audio). Berbalik arah senyap.
- **Latar mode baru "polos"** (hanya gradien cadangan) → ilustrasi SVG: aula dungeon (Puzzle) dan jalan kota senja (Delivery). Dalam proses ditemukan dan diperbaiki: cahaya pintu tampil sebagai cakram hitam, obor dan jendela tidak muncul (`<use>`/`<symbol>` diganti inline).
- **Arena Sempit tanpa animasi di Mayhem/Mayhem+** → semua mode kini menyempit **1 ubin demi 1 ubin** (`SHRINK.tileMs` 1,5 dtk, ring merah peringatan), bertahan **15 dtk** (tidak termasuk animasi), lalu melebar. HUD hanya menghitung lama bertahan. Makanan di luar arena dipindah tiap ubin menutup.
- Label "ANTAR" di rumah tujuan Delivery menimpa ikon paket → diberi pita label sendiri.

#### Ditambahkan
- Mode **Kurir Apel**: ambil paket (A/B/C) di titik pickup, antar ke rumah dengan huruf sama. Pesanan aktif maks 2, kapasitas kargo 3; tiap paket = 1 segmen kargo di ekor (tubuh dasar dan kargo dicatat terpisah, invarian `panjang = baseLen + kargo`). Rumah menerima **paket tertua yang cocok, satu per kali masuk**. Paket punya umur (jarak rute × interval × 2,2 + 5 dtk); basi = kargo dibuang, skor −5 (min 0). Shift 120 dtk, target 5; skor 10/pengantaran (+5 bila cepat).
- **Prioritas event** terdokumentasi: `deadline == t` masih sah (antar menang atas basi); langkah tepat di akhir shift diproses sebelum hasil dievaluasi; pause membekukan semuanya.
- `lib/records.js` + `snake-records-v1`: rekor dipisah per mode **dan** konfigurasi (`delivery|shift:120|target:5|speed:<pref>`), disimpan sekali per shift.
- Modul pakai-ulang: `lib/sim/anim.js` (interpolasi), `lib/render/snakePath.js` (jalur halus).
- Menu Petualangan menampilkan tujuan, pratinjau 3 aturan, kontrol, durasi shift **tetap** (bukan chip palsu), chip kecepatan, dan rekor.

#### Diubah
- Mode Hard/Impossible memakai mekanisme penyempitan yang sama (sebelumnya linear selama 0,85 × durasi) — rasa di sana berubah.
- `EFFECTS.shrink.dur` menjadi 15000 ms (sesuai ceritamu).

#### Verifikasi
- 134 test; 6 mutasi pada aturan inti Delivery (paket tertua, batas deadline, pemendekan ekor, detik terakhir, skor negatif, kapasitas) tertangkap semua.
- **Belum diverifikasi**: rasa gerak, balance (umur paket, target 5/120 dtk, jarak pickup), kenyaringan bunyi sintetis, tampilan HP.
- **Batasan yang diketahui**: titik pickup dipilih dari sel yang terjangkau secara *statis*; itu bukan jaminan terhadap tubuh yang bergerak (ular panjang bisa menutup jalur sementara).

---

### Tahap 3 — Registry mode + Puzzle "Jejak Kunci"

#### Ditambahkan
- **Registry mode** (`lib/modes/registry.js`): id stabil, label, grup, pemain, dukungan sentuh, deskripsi, kontrol, jenis kecepatan, kondisi selesai. Sepuluh mode lama didaftarkan sebagai adapter (perilaku tidak berubah; teks menu dijaga test).
- **Puzzle**: simulasi murni berbasis langkah (`lib/puzzle/sim.js`) — kunci, pressure plate yang ditahan tubuh, portal berpasangan dua arah, makanan penambah panjang, pintu keluar bersyarat. Urutan evaluasi langkah terdokumentasi; syarat pintu diperiksa pada **okupansi akhir** langkah. Gerakan tertahan tidak memakai langkah dan tidak bisa "kalah". Undo berulang sampai awal (state dipulihkan persis), ulang level.
- **Lima level buatan tangan** (par 15, 16, 13, 6, 19) dengan solusi beku yang diputar ulang di test dan par = optimum solver BFS. Ablasi membuktikan tiap mekanik benar-benar dibutuhkan.
- Validator level (15 jenis kesalahan); level tidak valid ditolak.
- Progres `snake-progress-v1` (JSON ber-versi, divalidasi); level terbuka berurutan (rantai penuh); rekor = langkah minimum.
- Menu **Petualangan** (tombol terpisah + tombol Kembali), pemilih level, HUD (langkah/par, kunci, plate, Undo/Ulang), Canvas renderer dengan status terbaca tanpa warna (gembok vs panah, huruf plate, angka + cincin portal).
- Tombol Z (undo) dan R (ulang level); satu gesekan layar = satu langkah.

#### Diperbaiki
- (Dari Tahap 1) restart saat guncangan canvas bisa menyisakan geseran posisi — `killVisualTweens` kini mereset posisi canvas DOM.
- Engine arkade baru (setelah berpindah dari Puzzle) kembali ke kecepatan default — preferensi kini diterapkan saat engine dibuat.
- `bgFiles()` melempar error untuk mode tanpa aset gambar.
- Level terbuka bisa "melompat" dari progres hasil edit manual — kini rantai penuh.
- Plate yang tertutup tubuh hampir tak terlihat → digambar di atas ular dengan lencana huruf + centang (centang berupa path, bukan glyph font).

#### Verifikasi
- 95 test; mutasi (aturan ekor, plate pada okupansi akhir, undo, rekor minimum) tertangkap; satu mutan sempat lolos karena skenario "replay lebih panjang" ternyata tidak benar-benar lebih panjang, lalu diperketat.
- 18 pemeriksaan SSR; gambar Canvas level.

---

### Tahap 1–2 — Stabilisasi engine

#### Ditambahkan
- API lifecycle eksplisit pada engine: `startRun`, `pauseRun(reason)`, `resumeRun`, `releasePause`, `togglePause`, `returnToMenu`, `destroy`. `startRun` hanya berhasil sekali (tidak lagi toggle pause).
- **Jam simulasi** (`lib/sim/clock.js`) yang membeku saat pause: efek, makanan, ranjau, respawn, dan Time Attack memakainya. Langkah game dijadwalkan dari RAF terhadap jam itu (tanpa `setInterval`).
- Injeksi RNG dan jam (`lib/sim/rng.js`) untuk test deterministik; modul grid murni (`lib/sim/grid.js`); `lib/storage.js` dengan validasi allowlist.
- **Kebijakan pause**: alasan `user | help | hidden | orientation`. Bantuan/tab/orientasi menjeda dan melepasnya **tidak** melanjutkan otomatis. Tombol Jeda ikon di HUD sentuh; `visibilitychange`/`blur` menjeda.
- `HelpModal` menjadi dialog aksesibel (fokus, Esc); tombol "Kembali ke menu" (jeda) dan "Pilih mode" (hasil); fokus pindah ke tombol utama di layar jeda/hasil; keyboard tidak lagi mencuri Spasi/Enter dari kontrol UI.
- Antrean input 2 langkah (menggantikan satu `nextDir`).
- Layer offscreen untuk dark veil (lubang `destination-out` tidak lagi menghapus dunia).
- Test runner bawaan Node (`npm test`, tanpa dependensi baru) + hook inspeksi yang tidak aktif di produksi.

#### Diperbaiki (temuan audit Tahap 0)
- **P0** — efek yang habis *setelah* game over menghidupkan tick lagi (suara kematian dan overlay terputar ulang).
- **P0** — `spawnFood()` hang di papan penuh (kini mengembalikan `null`).
- **P0** — tick 2P tidak transaksional (hasil ganda; pemenang bergantung urutan pemain) → snapshot → collision bersama → commit → hasil sekali. Tembus skor 50 bersamaan: skor lebih tinggi menang, sama = seri.
- **P1** — resume Time Attack lewat arah memotong waktu (0:19 vs seharusnya 0:29).
- **P1** — efek/makanan/ranjau tetap berjalan saat pause.
- **P1** — masuk sel ekor yang akan dilepas dianggap tabrakan (kini legal bila ular tidak tumbuh).
- **P1** — arah pertama hilang saat memulai dari kondisi berhenti.
- **P1** — makanan pengganti shrink bisa muncul di luar arena; spawn mengabaikan ranjau; respawn 2P berkoordinat tetap.
- **P1** — `snake_best` rusak menjadi `NaN`; rekor kini disimpan saat ronde selesai, bukan tiap apel.
- **P1** — klik PLAY lalu menekan panah sebelum timer 320 ms habis membuat ronde langsung ter-pause.
- **P2** — interval langkah vs interpolasi memakai sumber berbeda; timer HUD di-emit tiap frame; garis tubuh 2P melintasi papan saat wrap.

#### Diubah
- Teks bantuan Classic/Portal/Time Attack/Malam dikoreksi: apel besar memang tidak pernah muncul di sana (balance tidak diubah).
- Aturan 2P tembus 50 bersamaan ditambahkan ke teks bantuan.

#### Verifikasi
- 37 test; mutasi pada aturan ekor, jam simulasi, dan idempotensi `endRun` tertangkap.
- **Belum diverifikasi**: dark veil di browser, tombol Jeda dan fokus dialog, swipe, `visibilitychange`/`blur`.

---

### Tahap 0 — Audit & rencana

Tidak ada source yang diubah. Hasil:

- **Basis**: Next 14.2.34, React 18, GSAP, Tailwind, tanpa TypeScript; `npm ci` dan `npm run build` lolos (1 rute statis, 52,3 kB / 140 kB First Load). `gameEngine.js` 753 baris dalam satu closure; 13 `Math.random` dan 25 `performance.now` langsung; belum ada test runner; pause hanya lewat Esc (HP tidak bisa menjeda).
- **Audit** dengan harness Node (jam palsu, canvas stub). Status bukti dibedakan: *Reproduksi* (dijalankan), *Baca kode*, *Perlu browser*, *Dugaan*. Temuan P0/P1 sebagian besar direproduksi; dua klaim awal diturunkan (`destroy()` tween → dugaan karena callback dijaga `indexOf`).
- **Keputusan desain (D1–D6)** yang kemudian dipakai: aturan ekor, perbaikan teks apel besar (bukan balance), kebijakan pause, Arena Sempit tetap instan di mode non-Hard (*keputusan ini kemudian dibalik di Tahap 4 setelah uji coba*), navigasi Petualangan terpisah, `node --test` tanpa dependensi.
- **Batasan lingkungan** dicatat sejak awal: sandbox tidak punya Chromium, sehingga uji visual/viewport bergantung pada browser di mesinmu.

---

### Catatan lintas-tahap

- **Penyimpanan**: key lama (`snake_best`, `snake-speed`, `snake-ta`, `snake-lefty`) tidak pernah disentuh. Key baru: `snake-progress-v1` (Puzzle) dan `snake-records-v1` (Delivery, Roguelite, Territory, Boss). Run Roguelite yang sedang berjalan tidak disimpan.
- **Konvensi bukti**: tiap tahap diuji dengan mutasi (merusak aturan inti dengan sengaja dan memastikan test memerah). Mutan yang lolos dilaporkan beserta perbaikan test-nya.
- **Pola temuan**: sebagian besar bug nyata ditemukan oleh test/render yang saya tulis, bukan oleh membaca kode — mis. arah pertama Roguelite, preferensi kecepatan yang hilang saat berpindah controller, komentar yang menelan properti HUD.
- **Yang selalu belum diverifikasi**: perilaku di browser nyata (HP, landscape, keyboard/pembaca layar), kenyaringan suara, dan balance semua mode baru.

## Catatan lengkap

Bagian-bagian berikut mempertahankan detail dokumen asal. Buka bagian yang diperlukan.

### Revisi produk dan UI

<a id="doc-asset-consistency"></a>
<details>
<summary><strong>Konsistensi scene Adventure & Arcade — 20 Oktober 2026</strong></summary>

Sumber arsip sebelum penggabungan: ASSET_CONSISTENCY.md.

### Konsistensi Scene Adventure dan Arcade

Tanggal: 20 Oktober 2026. Basis: ZIP Dungeon terakhir yang dikirim, dengan revisi kampanye 4.

#### Yang diperbaiki

Aset sebelumnya sudah digambar ulang, tetapi belum cukup seragam dengan Arcade: detail dan shading Adventure lebih padat, bentuk wajah/garis berbeda, serta tepi lingkungan dan skala karakter belum konsisten. Batch ini menyamakan gaya, bukan mengubah mekanik permainan.

Acuan visual tetap **Mayhem+ dan Hard** yang sudah ada: garis tebal gelap, bentuk kartun sederhana, warna flat dengan bayangan ringan, mata putih besar, perut krem bersegmen, pipi merah, dan ekspresi yang jelas. Kedua aset acuan tidak diubah. Classic, Night, Portal, Impossible dan Duo juga tidak diubah pada batch ini.

#### Scene yang disesuaikan

| Mode | Penyesuaian |
| --- | --- |
| Mayhem biasa | Proporsi wajah, garis, warna dan framing mengikuti Mayhem+. Ekspresi panik, pose, bom dan apel tetap menjadi identitas scene. |
| Time Attack | Gaya maskot, jam pasir, jalan dan kebun disederhanakan agar satu keluarga dengan Arcade. Ekspresi mengejar waktu tetap. |
| Dungeon | Batu besar dan ruang biru abu, obor serta lumut lebih sederhana. Maskot, kunci, slime dan penjaga mengikuti bahasa gambar Arcade. |
| Kurir Apel | Dua paket, rumah dan kotak pos dipertahankan; garis dan bentuk lebih sederhana dan seragam. |
| Ekspedisi | Maskot bertualang, tas, gerbang dan boss kebun dipertahankan; siluet lebih jelas dan detail latar dikurangi. |
| Rebut Arena | Dua rival dan bendera tetap kompetitif; latar berwarna dan garis mengikuti Arcade. |
| Penjaga Kebun | Boss, antek dan ular mengikuti shading serta outline yang sama. Mode standalone tetap tersembunyi sesuai basis. |

Semua scene memakai komposisi kanan yang lebih seragam. **Latar berwarna di dalam ilustrasi tetap ada**; area kiri tempat judul dan bagian luar scene tetap transparan. Judul masih teks HTML ber-outline. Tidak ada teks yang dibakar ke gambar.

#### File yang berubah

14 file biner di `public/assets/game/` diganti. Nama file serta pemetaan mode tetap sama, sehingga pemilihan sub-mode dan pemilihan versi HP tetap memakai kode yang telah diuji.

| Desktop | HP | Ukuran file desktop / HP |
| --- | --- | --- |
| `bg-mayhem.webp` | `bg-mayhem-m.webp` | 113,248 / 57,378 byte |
| `bg-timeattack.webp` | `bg-timeattack-m.webp` | 127,220 / 65,684 byte |
| `bg-puzzle.webp` | `bg-puzzle-m.webp` | 121,202 / 62,120 byte |
| `bg-delivery.webp` | `bg-delivery-m.webp` | 124,280 / 65,522 byte |
| `bg-roguelite.webp` | `bg-roguelite-m.webp` | 132,962 / 70,326 byte |
| `bg-territory.webp` | `bg-territory-m.webp` | 136,338 / 69,912 byte |
| `bg-boss.webp` | `bg-boss-m.webp` | 150,476 / 78,570 byte |

Desktop: **1672×941**. HP: **960×540**. Semua WebP memiliki alpha dan berada di bawah budget 300 KB per file. Aset di-encode ke ukuran tujuan tanpa crop kreatif tambahan; tampilan tetap memakai `object-fit: contain`.

Dokumentasi tambahan: `README.md`, [changelog.md](#riwayat-ringkas), dan dokumen ini. Kode aplikasi, CSS, seluruh engine/controller, kampanye, input, localStorage, revive, formula boss, dependency dan lockfile identik dengan ZIP basis. Perbaikan Dungeon dan movement dari batch sebelumnya tetap ikut dalam ZIP lengkap.

#### Verifikasi

- Delapan tes registry/aset lolos, tanpa skip.
- `npm run build` produksi berhasil; compile serta pemeriksaan lint/type bawaan build lolos.
- Dimensi, alpha, budget ukuran dan checksum file revisi diperiksa.
- Browser Chromium: menu dicek pada laptop 1366×768, HP/tablet 360×800, 390×844, 768×1024, dan landscape 844×390. Tidak ditemukan overflow horizontal atau error JavaScript pada alur yang diperiksa.
- 32 pemeriksaan gambar: pemilihan scene menu dan decoding langsung. Checksum respons HTTP cocok dengan berkas baru, sehingga varian HP/desktop yang tampil terkonfirmasi bukan berkas lama.
- Rebut Arena tetap memerlukan keyboard dan tidak tampil pada menu HP; kedua ukuran asetnya diperiksa lewat decoding langsung. Penjaga Kebun standalone tetap tersembunyi, kedua ukuran asetnya juga diperiksa langsung.
- Judul tetap ber-outline dan container teks transparan; rasio gambar memakai `contain`.
- Pemeriksaan ini memakai emulasi browser, bukan perangkat HP fisik.
- `git diff --check`: bersih. Perbandingan ZIP memastikan hanya 14 aset dan dokumentasi yang berubah.

Tes gameplay lengkap tidak diulang karena tidak ada perubahan kode gameplay. Hasil 299 tes pada revisi sebelumnya tetap dicatat sebagai hasil batch sebelumnya, bukan klaim tes ulang batch ini.

#### Prompt aset

Metode: penyuntingan gambar melalui alat imagegen bawaan, dengan Mayhem+ sebagai referensi utama, Hard sebagai referensi pendukung, dan gambar mode sebelumnya sebagai target. Berikut prompt lengkap per scene untuk revisi lanjutan.

##### Mayhem biasa

```text
Use case: style-transfer.
Asset type: Snake game menu scene, wide 16:9.
Input images: Image 1 (Mayhem+) is the PRIMARY locked style and composition reference. Image 2 (Hard) is a supporting style reference. Image 3 is the EDIT TARGET and supplies the mode subject, action and expression.
Primary request: redraw the edit target so it looks drawn by the exact same artist as Images 1 and 2. Match their thick dark green/brown clean contour weight, simple flat 2D colors, large white expressive eyes with dark pupils, lime green snake with cream segmented belly and rosy cheeks. Use just one simple shadow shade, minimal highlights. Match the mascot head/body proportions of image 1. Simple rounded plants and scenery shapes like image 1, not highly detailed painterly foliage.
Composition: use the same right-side banner framing as image 1. The LEFT 43% of the complete canvas is empty genuinely transparent alpha for live text. The RIGHT 57% is an integrated colorful scene with its own COLORED backdrop, not an isolated character sticker. The background meets the top and right edge similarly to the references, with a rounded irregular illustrated boundary on the left and a grassy or stone bottom edge. Keep key face/props comfortably inside the right area; consistent character scale with image 1. No opaque plate or rectangle under the left title.
Text: none. No labels, letters, title, UI or watermark.
Avoid: glossy 3D, airbrush, cinematic lighting, intricate texture, tiny clutter, different mascot design, large black background blocks, transparent void behind the right scene.
Change the visual style and framing only; preserve the mode's identity and described action.
Mode-specific invariants: Keep the edit target's same panicked open mouth, worried eyebrows, curled pose, nearby black round bomb with lit fuse, red apples flying around. Keep warm orange sky and green shrubs. Do not redesign the expression or invent a new pose; simplify and match the Mayhem+ drawing language.
```

##### Time Attack

```text
Use case: style-transfer.
Asset type: Snake game menu scene, wide 16:9.
Input images: Image 1 (Mayhem+) is the PRIMARY locked style and composition reference. Image 2 (Hard) is a supporting style reference. Image 3 is the EDIT TARGET and supplies the mode subject, action and expression.
Primary request: redraw the edit target so it looks drawn by the exact same artist as Images 1 and 2. Match their thick dark green/brown clean contour weight, simple flat 2D colors, large white expressive eyes with dark pupils, lime green snake with cream segmented belly and rosy cheeks. Use just one simple shadow shade, minimal highlights. Match the mascot head/body proportions of image 1. Simple rounded plants and scenery shapes like image 1, not highly detailed painterly foliage.
Composition: use the same right-side banner framing as image 1. The LEFT 43% of the complete canvas is empty genuinely transparent alpha for live text. The RIGHT 57% is an integrated colorful scene with its own COLORED backdrop, not an isolated character sticker. The background meets the top and right edge similarly to the references, with a rounded irregular illustrated boundary on the left and a grassy or stone bottom edge. Keep key face/props comfortably inside the right area; consistent character scale with image 1. No opaque plate or rectangle under the left title.
Text: none. No labels, letters, title, UI or watermark.
Avoid: glossy 3D, airbrush, cinematic lighting, intricate texture, tiny clutter, different mascot design, large black background blocks, transparent void behind the right scene.
Change the visual style and framing only; preserve the mode's identity and described action.
Mode-specific invariants: Keep the edit target's determined gritted-teeth racing snake, tiny sweat drop, red apple ahead and hourglass beside the path. Keep the active forward-racing body pose. Redraw the sunny race path and orchard as simple flat rounded shapes, with a warm yellow-orange sky so it has its own Time Attack identity. Match the reference snake, outlines and object scale.
```

##### Dungeon

```text
Use case: style-transfer.
Asset type: Snake game menu scene, wide 16:9.
Input images: Image 1 (Mayhem+) is the PRIMARY locked style and composition reference. Image 2 (Hard) is a supporting style reference. Image 3 is the EDIT TARGET and supplies the mode subject, action and expression.
Primary request: redraw the edit target so it looks drawn by the exact same artist as Images 1 and 2. Match their thick dark green/brown clean contour weight, simple flat 2D colors, large white expressive eyes with dark pupils, lime green snake with cream segmented belly and rosy cheeks. Use just one simple shadow shade, minimal highlights. Match the mascot head/body proportions of image 1. Simple rounded plants and scenery shapes like image 1, not highly detailed painterly foliage.
Composition: use the same right-side banner framing as image 1. The LEFT 43% of the complete canvas is empty genuinely transparent alpha for live text. The RIGHT 57% is an integrated colorful scene with its own COLORED backdrop, not an isolated character sticker. The background meets the top and right edge similarly to the references, with a rounded irregular illustrated boundary on the left and a grassy or stone bottom edge. Keep key face/props comfortably inside the right area; consistent character scale with image 1. No opaque plate or rectangle under the left title.
Text: none. No labels, letters, title, UI or watermark.
Avoid: glossy 3D, airbrush, cinematic lighting, intricate texture, tiny clutter, different mascot design, large black background blocks, transparent void behind the right scene.
Change the visual style and framing only; preserve the mode's identity and described action.
Mode-specific invariants: Keep Dungeon: cheeky brave snake with a raised eyebrow and golden key held by its curled tail, stone arch gate, one little teal slime and a squat gray stone warden peeking from behind a column. Simplify dungeon stones to large clear flat gray-blue blocks, a warm simple torch and a few moss shapes. Keep a COLORED cool blue-gray chamber background in the right scene, not a black cave. No skull/bones. Make the snake the same character and scale as the primary Arcade reference, rather than a different long-faced mascot.
```

##### Kurir Apel

```text
Use case: style-transfer.
Asset type: wide 16:9 Snake menu background.
Inputs: Image 1 (Mayhem+) is the PRIMARY locked drawing-style and framing reference. Image 2 (Hard) is the supporting style reference. Image 3 is the EDIT TARGET; preserve its mode identity and described action.
Redraw target as the same artist as Images 1 and 2: thick dark green/brown clean contours, simple flat colored shapes, a lime green snake mascot with cream segmented belly, round/oval head, large white eyes with dark pupils, rosy cheek dots, expressive eyebrows and mouth. One simple shadow shade, restrained highlights. The same head/body proportions as the Arcade reference. No glossy 3D or painterly detail. Simplify foliage, stones and background into large rounded shapes like the Arcade references.
Framing: LEFT 43% of full canvas genuinely transparent empty alpha for live title. RIGHT 57% is a cohesive COLORED environment, sky/interior and ground together, not a character sticker. Colored background reaches top and right edge similarly to reference 1; irregular rounded illustrated left edge and clear grassy/stone bottom edge. Keep faces and key props inside safe right-side margins. Main foreground snake is about the same scale as the primary reference. No color panel in the left text area.
No text, letters, labels, UI, logos or watermark. Avoid intricate tiny textures, black voids, airbrush and inconsistent mascot designs.
Only harmonize drawing style, palette treatment and framing; keep each mode's distinct subject and mood.
Mode invariants: Keep a concentrating, slightly struggling courier snake moving along a village path with two cardboard apple parcels stacked on its coiled body, sweat bead and tongue out with effort. No human hands or arms. A small cottage, mailbox and apple orchard behind it, reduced to simple flat rounded forms. Warm apricot/yellow sky, green shrubs and a few cream flowers. The snake's face must use the same white-eye dark-pupil design as the primary Arcade reference, and parcels are secondary. Parcel decoration is a small apple symbol, no letters.
```

##### Ekspedisi

```text
Use case: style-transfer.
Asset type: wide 16:9 Snake menu background.
Inputs: Image 1 (Mayhem+) is the PRIMARY locked drawing-style and framing reference. Image 2 (Hard) is the supporting style reference. Image 3 is the EDIT TARGET; preserve its mode identity and described action.
Redraw target as the same artist as Images 1 and 2: thick dark green/brown clean contours, simple flat colored shapes, a lime green snake mascot with cream segmented belly, round/oval head, large white eyes with dark pupils, rosy cheek dots, expressive eyebrows and mouth. One simple shadow shade, restrained highlights. The same head/body proportions as the Arcade reference. No glossy 3D or painterly detail. Simplify foliage, stones and background into large rounded shapes like the Arcade references.
Framing: LEFT 43% of full canvas genuinely transparent empty alpha for live title. RIGHT 57% is a cohesive COLORED environment, sky/interior and ground together, not a character sticker. Colored background reaches top and right edge similarly to reference 1; irregular rounded illustrated left edge and clear grassy/stone bottom edge. Keep faces and key props inside safe right-side margins. Main foreground snake is about the same scale as the primary reference. No color panel in the left text area.
No text, letters, labels, UI, logos or watermark. Avoid intricate tiny textures, black voids, airbrush and inconsistent mascot designs.
Only harmonize drawing style, palette treatment and framing; keep each mode's distinct subject and mood.
Mode invariants: Keep the bold expedition snake with a small satchel and rolled map, confident determined grin and raised brow, facing a looming vegetable garden boss with two little minions beyond a simple ruined gate. Foreground snake should be larger and easier to read than in the target, about half scene height; the boss sits behind it as the destination. Flat leafy greens and warm sky, simple mossy stone blocks. Preserve the adventure story but remove dense foliage detail. Same mascot as Arcade, no extra arms.
```

##### Rebut Arena

```text
Use case: style-transfer.
Asset type: wide 16:9 Snake menu background.
Inputs: Image 1 (Mayhem+) is the PRIMARY locked drawing-style and framing reference. Image 2 (Hard) is the supporting style reference. Image 3 is the EDIT TARGET; preserve its mode identity and described action.
Redraw target as the same artist as Images 1 and 2: thick dark green/brown clean contours, simple flat colored shapes, a lime green snake mascot with cream segmented belly, round/oval head, large white eyes with dark pupils, rosy cheek dots, expressive eyebrows and mouth. One simple shadow shade, restrained highlights. The same head/body proportions as the Arcade reference. No glossy 3D or painterly detail. Simplify foliage, stones and background into large rounded shapes like the Arcade references.
Framing: LEFT 43% of full canvas genuinely transparent empty alpha for live title. RIGHT 57% is a cohesive COLORED environment, sky/interior and ground together, not a character sticker. Colored background reaches top and right edge similarly to reference 1; irregular rounded illustrated left edge and clear grassy/stone bottom edge. Keep faces and key props inside safe right-side margins. Main foreground snake is about the same scale as the primary reference. No color panel in the left text area.
No text, letters, labels, UI, logos or watermark. Avoid intricate tiny textures, black voids, airbrush and inconsistent mascot designs.
Only harmonize drawing style, palette treatment and framing; keep each mode's distinct subject and mood.
Mode invariants: Keep two competing snakes, lime versus teal, fierce determined brows and gritted teeth, lunging toward a small spark between their tails. They guard red and blue flags on a simple red/blue grid arena. No affection, hugging or hearts. Keep both faces large and readable. Rounded green shrubs, low wooden fence and an orange/gold sky like the Arcade reference provide the integrated background. Simplify the grid/landscape, use the exact same face and outline language for both snakes.
```

##### Penjaga Kebun

```text
Use case: style-transfer.
Asset type: wide 16:9 Snake menu background.
Inputs: Image 1 (Mayhem+) is the PRIMARY locked drawing-style and framing reference. Image 2 (Hard) is the supporting style reference. Image 3 is the EDIT TARGET; preserve its mode identity and described action.
Redraw target as the same artist as Images 1 and 2: thick dark green/brown clean contours, simple flat colored shapes, a lime green snake mascot with cream segmented belly, round/oval head, large white eyes with dark pupils, rosy cheek dots, expressive eyebrows and mouth. One simple shadow shade, restrained highlights. The same head/body proportions as the Arcade reference. No glossy 3D or painterly detail. Simplify foliage, stones and background into large rounded shapes like the Arcade references.
Framing: LEFT 43% of full canvas genuinely transparent empty alpha for live title. RIGHT 57% is a cohesive COLORED environment, sky/interior and ground together, not a character sticker. Colored background reaches top and right edge similarly to reference 1; irregular rounded illustrated left edge and clear grassy/stone bottom edge. Keep faces and key props inside safe right-side margins. Main foreground snake is about the same scale as the primary reference. No color panel in the left text area.
No text, letters, labels, UI, logos or watermark. Avoid intricate tiny textures, black voids, airbrush and inconsistent mascot designs.
Only harmonize drawing style, palette treatment and framing; keep each mode's distinct subject and mood.
Mode invariants: Keep a brave expressive foreground lime snake opposing a big orange garden beetle boss with leafy armor and two small beetle minions. Boss brows fierce but funny; snake determined with a mischievous tongue and raised brow. Make the foreground snake about half scene height and the boss loom behind without swallowing the whole composition. Warm orange sky, rounded shrubs, a few tomato vines, simple stones and garden ground. All characters are flat cartoons with thick dark outlines matching Arcade; remove detailed textures and multiple lighting layers.
```

</details>

<a id="doc-dungeon-revision"></a>
<details>
<summary><strong>Dungeon, movement dan aset menu — 19 Oktober 2026</strong></summary>

Sumber arsip sebelum penggabungan: DUNGEON_REVISION.md.

### Dungeon, Movement & Aset Menu

Tanggal: 19 Oktober 2026. Basis: ZIP revisi Revive & Jejak Kunci yang terakhir dikirim. Ini source lengkap Next.js, bukan merge dengan versi lobby kartu lama.

#### Hasil revisi

Jejak Kunci diganti menjadi **Dungeon**. Pemain tetap maskot satu petak; tujuan utama mengumpulkan kunci/sakelar dan mencapai pintu, dengan pilihan menyelinap atau bertarung. Menu Arkade tetap dua tingkat: Classic, Mayhem, 2P Lokal lalu sub-mode.

##### Kontrol

- Satu pemilik input untuk keyboard dan DPad. Repeat OS tidak lagi menumpuk gerakan; arah terbaru menggantikan repeat lama.
- Ketuk = satu langkah; tahan = berjalan berulang setelah 190 ms, interval 135 ms. Animasi per langkah 120 ms. Semua gerak tetap empat arah.
- Keyup, zona netral DPad, pointer cancel, kehilangan capture, jeda, blur, bantuan, pergantian mode, undo dan ulang membersihkan hold yang relevan.
- Input arah yang tertahan tembok tidak memakai giliran dan tidak menghambat belokan valid setelahnya.
- DPad memakai satu pointer utama dan toleransi sudut agar jempol tidak mudah berganti sektor tanpa sengaja.
- Animasi tidak lagi menggeser kepala naik ketika bergerak horizontal. Squash kecil tetap ada, tanpa mengubah posisi grid.
- Repeat Spasi, Z, R dan Esc tidak menggandakan aksi. Esc yang ditahan di dialog jeda tidak lagi melanjutkan permainan.

##### Aturan Dungeon

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

##### Kampanye dan ruang 37

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

#### Progres dan kompatibilitas

Id mode tetap `puzzle`; id ruang tetap `jk-1`…`jk-5`, `gen-6`…`gen-50`. Key `snake-progress-v1` dan semua key lama (`snake-speed`, `snake-ta`, `snake-lefty`, `snake_best`) tetap sama.

Revisi kampanye menjadi 4. Unlock dan koin dari versi lama tetap terbaca; rekor langkah versi lama diberi label versi lama, sehingga tidak dibandingkan dengan par layout baru. Penyimpanan gagal tidak lagi menimpa hasil ruang sebelumnya: progres dalam memori digabung dengan data disk ketika ruang berikutnya selesai atau pemain menekan **Coba simpan lagi**. UI menampilkan status save tertunda.

Batas: progres yang belum berhasil disimpan tetap hanya ada dalam sesi terbuka. Jika tab ditutup saat storage masih menolak penulisan, data dalam memori tidak dapat dipulihkan. Ini belum sinkronisasi backend atau transaksi lintas tab secara atomik.

#### Aset dan menu

| Kelompok | Tindakan batch ini |
| --- | --- |
| Mayhem, Mayhem+, Hard, Impossible, Mayhem Duo | Edit area kiri teks menjadi transparan. Pose/ekspresi dan lingkungan di kanan dijadikan referensi yang dipertahankan, tanpa brief redesign baru. |
| 2P Lokal | Perlakuan pembersihan area teks yang sama. |
| Classic / Day | Desain ulang: wajah jahil dan ekspresif, mengejar apel, kebun cerah. |
| Night, Portal, Time Attack | Desain ulang cutout lama menjadi scene berwarna di kanan, dengan ekspresi berbeda sesuai mode. |
| Dungeon | Ruang batu/obor, kunci, slime, penjaga berhelm; sesuai tema gameplay baru. |
| Kurir Apel, Ekspedisi, Rebut Arena, Penjaga Kebun | Desain ulang cutout menjadi scene utuh di kanan. Arena menampilkan rival bertarung. Boss standalone tetap tersembunyi sesuai basis. |

Seluruh 15 scene memiliki WebP desktop **1672×941** dan HP **960×540**, dengan alpha. Bagian luar/area teks transparan; warna langit, tanah, ruangan dan tumbuhan di dalam ilustrasi tetap ada. Seluruh file di bawah 300 KB. Gambar memakai `contain`, tanpa memotong wajah untuk memaksa rasio. Prompt per aset ada di [ASSET_PROMPTS_DUNGEON.md](#doc-asset-prompts-dungeon).

Judul tetap teks HTML Bahasa Indonesia dengan outline, bukan tulisan hasil gambar. Container hijau di belakang judul dihapus pada semua mode. Animasi nama dari kiri, drift, serta zoom/flash PLAY tetap ada. Tab grup, sub-mode berikon, kecepatan, durasi Time Attack, dan penjelasan 2P butuh keyboard tetap tersedia. Bantuan tetap dua kolom. Portrait HP tetap memakai RotatePrompt sesuai versi basis; panel menu landscape tetap melalui portal.

Papan Dungeon menyesuaikan tinggi laptop karena HUD lebih tinggi. HUD landscape diringkas; legenda lengkap tetap tersedia di bantuan dan pada layout desktop.

#### Perubahan per file

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
| `README.md`, [changelog.md](#riwayat-ringkas), dokumen revisi/prompt/diff | Petunjuk terbaru dan jejak perubahan. |

Diff teks lengkap, dipisah per file: [DUNGEON_DIFF_PER_FILE.md](#doc-dungeon-diff-per-file). Aset biner disediakan langsung dalam ZIP.

#### Verifikasi

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

#### Yang dipertahankan dan pekerjaan berikutnya

`lib/gameEngine.js`, dependency/lockfile, struktur aplikasi, pengaturan kecepatan/durasi, serta logika Delivery, Ekspedisi, revive 3 kali/72 jam, Boss dan Territory tidak diubah. Layar hasil tetap memakai maskot, tint dan confetti dari basis; hanya teks hasil Dungeon dan notice gagal simpan yang bertambah.

Belum ada online multiplayer, backend baru, pembelian skin atau perubahan formula damage/shield Boss. Revisi ini menyiapkan saldo koin dan mempertahankan mekanik yang sudah ada; integrasi backend/skin perlu batch tersendiri ketika memang diminta.

#### Menjalankan

```bash
npm ci
npm test
npm run build
npm start
```

Untuk mengubah generator kemudian membangun ulang data kampanye: `npm run build:campaign`, lalu jalankan tes. Ekstrak ZIP ke folder baru agar build/cache lama tidak ikut tercampur.

</details>

<a id="doc-revive-jejak-kunci"></a>
<details>
<summary><strong>Revive Ekspedisi dan Jejak Kunci — arsip sebelum Dungeon</strong></summary>

Sumber arsip sebelum penggabungan: REVIVE_JEJAK_KUNCI.md.

### Revisi Ekspedisi & Jejak Kunci

Revisi ini melanjutkan `Eat-eat-Adventure-Revision.zip`. Fokusnya adalah revive Ekspedisi dan kritik terhadap lima screenshot Jejak Kunci/menu Ekspedisi. Source lengkap disertakan, termasuk aset dari revisi sebelumnya.

#### 1. Hasil revisi berdasarkan screenshot

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

#### 2. Revive Ekspedisi

##### Aturan kuota

- Pemain mendapat **3 revive**. Kuota dipakai bersama oleh semua run dan semua pilihan kecepatan Ekspedisi pada browser/origin yang sama.
- Penggunaan pertama memulai jendela **72 jam**. Penggunaan kedua/ketiga tidak menggeser waktu reset.
- Saat waktu reset tercapai, kuota kembali menjadi 3. Sisa kuota tidak ditumpuk menjadi 4, 5, atau 6.
- Setelah reset, pemakaian pertama berikutnya memulai jendela 72 jam berikutnya.
- Memulai run baru, kembali ke menu, atau refresh tidak mengisi ulang kuota.
- Reset dihitung berdasarkan waktu yang tersimpan; aplikasi tidak perlu tetap terbuka selama tiga hari.
- Tombol menjadi nonaktif saat kuota habis atau saat pemakaian sedang disimpan. Klik ganda tidak memotong dua jatah.

Contoh: revive pertama dipakai Senin pukul 10.00. Jatah kembali menjadi 3 pada Kamis pukul 10.00, meskipun revive terakhir dipakai Rabu malam.

##### Apa yang terjadi ketika hidup lagi

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

##### Penyimpanan dan batasannya

Key baru: `snake-expedition-revives-v1`, berisi versi data, sisa kuota, waktu reset, dan waktu pemakaian terakhir. Web Locks dipakai bila tersedia untuk menyelaraskan pemakaian antar-tab. Browser tanpa Web Locks memakai fallback penyimpanan lokal, sehingga perlindungan dari pemakaian serentak antar-tab lebih terbatas.

Ini **belum menggunakan backend**. Menghapus data browser, mengubah penyimpanan secara manual, pindah origin/perangkat, atau memanipulasi jam dapat memengaruhi kuota. Refresh hanya mempertahankan kuota; run yang sedang berlangsung belum menjadi save game yang bisa dimuat ulang.

#### 3. Jejak Kunci: aturan yang disesuaikan

##### Maskot satu petak dan sakelar

Maskot boleh berbalik arah. Mengambil item tidak lagi menambah tubuh. Karena mekanisme lama mengharuskan tubuh menahan pressure plate, sakelar sekarang **tetap aktif setelah diinjak sekali**, sampai level selesai/diulang. Undo mengembalikan status sakelar, barang, posisi, dan penjaga ke langkah sebelumnya.

Pintu tetap memerlukan jumlah kunci serta sakelar yang ditentukan level. Koin tidak menjadi syarat keluar. Tutorial, teks bantuan, generator, solusi, dan par diperbarui mengikuti aturan ini.

##### Penjaga

1. Penjaga berpatroli pada rute 3–5 petak yang terhubung, menghadap arah langkah patroli berikutnya.
2. Ketika melihat pemain, muncul `!` dan penjaga menunda gerak pengejaran satu giliran. Pemain mendapat kesempatan untuk kabur atau bersembunyi.
3. Pada giliran berikutnya, penjaga mengejar posisi terakhir yang terlihat. Posisi sasaran diperbarui hanya saat pemain terlihat.
4. Jika kehilangan pandangan, ingatan posisi bertahan hingga tiga giliran. Setelah itu penjaga kembali ke titik awal patrolinya. Masuk semak memutus pengejaran.
5. Kontak dengan penjaga tetap berbahaya. Perisai dapat menahan sengatan dan membuat penjaga pingsan sementara.

Gerakan penjaga tetap **berbasis giliran**, bukan berjalan sendiri saat pemain sedang berpikir. Tombol **Tunggu** atau **Spasi** memajukan satu giliran tanpa berpindah tempat; berguna untuk mengatur pagar dan patroli. Gerakan yang tertahan tembok tidak memajukan giliran. Menunggu di portal tidak mengaktifkan teleport ulang.

##### Gerakan dan kontrol

- Satu langkah dianimasikan selama sekitar 120 ms.
- Input cepat ditampung maksimal dua langkah, lalu dijalankan berurutan agar posisi tidak meloncat di tengah animasi.
- Pause membekukan animasi; resume melanjutkannya. Undo, restart, dan kembali ke menu membersihkan input yang masih mengantre.
- Pengaturan `prefers-reduced-motion` tetap dihormati.
- HUD menampilkan kunci, sakelar, apel bonus, palu/perisai yang dibawa, dan status penjaga.

#### 4. Koin apel dan fondasi skin

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

#### 5. Kampanye dan kompatibilitas

- Semua **50 level** memakai revisi 3; generator menghasilkan ulang 45 level non-tutorial dan par/solusi diperhitungkan kembali.
- Level tetap memakai ID yang sama. Level yang sudah terbuka tidak dikunci ulang.
- Rekor dari aturan lama ditandai **Versi lama**. Menyelesaikan level dengan aturan baru mencatat rekor revisi saat ini.
- Rekor koleksi koin tidak berkurang ketika level dimainkan ulang atau revisinya berubah.
- Level generated tetap deterministik berdasarkan seed. Tidak ada pengacakan ulang kampanye setiap membuka aplikasi.
- Semua level diuji dapat diselesaikan tanpa mengambil koin bonus.

#### 6. File yang berubah

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
| `README.md`, [changelog.md](#riwayat-ringkas), [REVIVE_JEJAK_KUNCI.md](#doc-revive-jejak-kunci) | Dokumentasi revisi dan petunjuk penggunaan. |

Diff per file tersedia dalam `REVIVE_JEJAK_KUNCI.diff` di ZIP. Diff dibandingkan dengan paket revisi sebelumnya; apply patch hanya pada basis tersebut.

#### 7. Yang tetap dipertahankan

- `lib/gameEngine.js` tidak berubah.
- Tidak ada dependency baru, perpindahan ke TypeScript, atau perubahan struktur folder aplikasi.
- Dua tingkat pilihan mode Arkade, scene/aksen per mode, pengaturan kecepatan dan Time Attack tetap ada.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, dan `snake_best` tidak diganti.
- HP portrait tetap dapat memilih menu; RotatePrompt untuk mulai bermain tetap seperti basis sebelumnya. Panel samping landscape dan kontrol kidal dipertahankan.
- Kurir Apel, Rebut Arena, dan mode Arkade tidak mendapat perubahan aturan di batch ini.
- Boss tetap menggunakan aturan fase, shield, damage orb, dan variasi serangan dari revisi sebelumnya; tambahan di sini adalah jalur revive.
- Belum ada multiplayer online, backend akun/kuota, toko skin, atau pembelian.

#### 8. Verifikasi

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

#### 9. Menjalankan paket

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

</details>

<a id="doc-adventure-revision"></a>
<details>
<summary><strong>Revisi Petualangan dan Boss</strong></summary>

Sumber arsip sebelum penggabungan: ADVENTURE_REVISION.md.

### Eat-eat — Revisi Petualangan & Boss

Basis kerja: hasil **Boss Batch 1**, dilanjutkan dengan tujuh revisi UI/gameplay dan revisi mekanisme boss terbaru. Ini implementasi yang sudah terpasang di source, bukan prompt untuk dikerjakan lagi.

#### Perubahan utama

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

#### Alur Ekspedisi gabungan

1. Mulai dari rute 1. Setiap rute menunggu input arah pertama.
2. Capai target **28 / 40 / 52 / 64 / 76** poin.
3. Setelah setiap rute, termasuk rute kelima, simulasi berhenti dan pemain mengambil satu upgrade dari pilihan yang sah. Klik ganda tidak mengambil dua upgrade.
4. Setelah upgrade kelima, masuk kebun dengan bekal yang terkumpul. Awal kebun juga menunggu input arah pertama.
5. Gelombang kebun 1–3: satu antek per gelombang; 4–6: dua; 7–9: tiga. Antek datang bergiliran, total 18.
6. Gelombang kebun 10: salah satu dari tiga varian boss acak. Pola serangan mengikuti varian dan fase.
7. Menang hanya setelah fase 3 boss habis. Kalah di kebun mengakhiri seluruh perjalanan; retry kembali ke rute 1.

Ronde pengumpulan dan gelombang kebun merupakan dua bagian dalam satu run, **bukan** lima ronde yang masing-masing memunculkan boss.

##### Bekal dari upgrade

| Upgrade | Efek saat masuk kebun |
|---|---|
| Tubuh ringkas | Panjang awal mengikuti upgrade, minimal 3 segmen. |
| Langkah berani | Pengali interval gerak ikut dibawa. |
| Kulit tebal | Tambahan 2 hati per tingkat. |
| Racikan penawar | Tambahan 1 hati per tingkat. |
| Bekal manis | Tambahan 2 energi awal per tingkat. |
| Napas panjang | Durasi kebal setelah terkena serangan dikali 1,4 per tingkat. |

Efek apel sementara dibuang saat masuk kebun. Skor rute tetap dibawa. Setiap antek memberi 5 poin, kerusakan HP boss memberi 10 poin per HP; mengikis shield tidak menghasilkan poin tambahan.

#### Mekanisme boss terbaru

##### HP dan pergantian fase

| Fase | HP fase | Celah per jendela | Damage serangan boss |
|---|---:|---:|---:|
| 1 | 3 | 1 | 1 hati |
| 2 | 5 | 2 | 1 hati |
| 3 | 10 | 3 | 2 hati |

Total HP sepanjang pertarungan adalah **18**. HP fase aktif harus habis sebelum transisi ke fase berikutnya. Damage berlebih tidak melompati fase. HP fase berikutnya diisi sesuai tabel. Setelah fase 3 habis, hasil menang diproses satu kali.

Serangan semakin cepat tiap fase; batas waktu peringatan yang mempertimbangkan jarak tempuh tetap dipertahankan. Saat titik lemah terbuka, bahaya serangan dihentikan. Setiap titik lemah hanya bisa dipukul sekali per jendela. Biaya energi: 1 untuk antek, 3 untuk boss.

##### Shield fase 3

Tafsir yang digunakan untuk kalimat “maksimal 3 kali”: **tiga penambahan per serangan boss yang selesai**.

- Satu serangan selesai pada waktu `T`.
- Shield bertambah **10** pada `T + 5 detik`, `T + 10 detik`, dan `T + 15 detik`.
- Serangan berikutnya membuat rangkaian tiga penambahan baru. Rangkaian bisa bertumpuk secara waktu.
- Total shield saat ini dibatasi **100**. Kelebihan di atas batas tidak ditabung.
- Shield tidak mulai sebelum fase 3 dan tidak bertambah saat pause/menu upgrade.
- HUD menampilkan jumlah shield dan waktu menuju penambahan berikutnya.
- Kematian/menang/retry membersihkan jadwal shield yang tersisa.

Ini bukan “tiga kali sepanjang seluruh pertarungan”. Bila yang dimaksud adalah tiga kali total, aturan jadwal perlu diubah; implementasi sekarang mengikuti tafsir per serangan di atas.

##### Orb heal dan damage

Saat fase 3 dimulai dan setiap serangan fase 3 selesai, muncul hadiah **heal +1 hati** dan **satu tingkat orb damage ×2** di petak aman yang tersedia.

- Hati bisa ditumpuk melebihi jumlah awal, ditampilkan sebagai `♥ × jumlah`.
- Orb damage bersifat permanen sampai run berakhir; mengambil lagi menambah tingkat pengali.
- Orb tidak menambah panjang tubuh maupun energi.
- Heal merah berbentuk hati; orb damage jingga bertuliskan ×2; apel energi berwarna kuning. Bentuk berbeda agar mudah dibedakan.
- Maksimal tiga objek heal dan tiga objek damage di arena. Hadiah berikutnya digabung nilainya, bukan dibuang. Jika tidak ada petak kosong, hadiah ditunda.
- Hadiah tidak menimpa tubuh, apel, boss, titik lemah, atau pickup lain ketika diletakkan.

Hadiah heal dari antek dan transisi fase sebelumnya tetap ada.

##### Rumus damage pemain

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

#### Penjaga dan kampanye Jejak Kunci

Penjaga yang arah depannya terhalang sekarang memilih lorong terbuka terpanjang dalam jarak pandang, dengan urutan tie-break tetap. Perilaku tetap deterministik untuk undo dan solver. Penjaga tetap bergerak berdasarkan langkah pemain, bukan mengejar dengan timer real-time.

Perubahan ini membuat sebagian layout lama tidak lagi cocok. Kampanye dibuat ulang dari seed yang sama, lalu divalidasi solver. Layout/data yang berubah: **38, 41, 46, 47, 48, 49**. Seluruh 50 level tetap dapat diselesaikan; par disesuaikan dengan solusi hasil validasi.

Progres buka-kunci lama tetap dipertahankan. Level dengan penjaga memakai penanda revisi 2. Rekor lama tetap tersimpan dan ditandai **Versi lama** di menu; percobaan pertama pada revisi baru mencatat rekor baru tanpa dibandingkan dengan angka dari aturan/peta lama.

#### Aset dan UI

Delapan scene × dua ukuran = **16 WebP** baru, masing-masing di bawah 300 KB:

- `bg-classicnight`, `bg-portal`, `bg-timeattack`
- `bg-puzzle`, `bg-delivery`, `bg-roguelite`, `bg-boss`, `bg-territory`

Versi desktop berlebar 1672 px, versi `-m` berlebar 960 px; alpha dipertahankan. Komposisi menyediakan ruang kiri untuk judul dan menjaga karakter di kanan. Prompt lengkap ada di [docs/ASSETS_ADVENTURE.md](#doc-docs-assets-adventure).

Objek gameplay memakai Canvas native agar tetap ringan dan tajam: wajah ular bersama, kumbang penjaga, dinding kebun membulat, palet sage/krim, orb dan indikator shield. Animasi tidak mengubah koordinat collision.

#### Kompatibilitas dan ruang lingkup

- `lib/gameEngine.js` tidak berubah.
- Pemilihan mode Arkade tetap grup → sub-mode. Label Time Attack ditulis lengkap.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, `snake_best` tetap.
- Rekor Ekspedisi gabungan memakai entri konfigurasi v2, boss memakai v3; entri lama tetap tersimpan di key `snake-records-v1`.
- Boss standalone tetap memiliki adapter internal untuk kompatibilitas dan pengujian, tetapi tidak muncul sebagai pilihan terpisah.
- Tidak menambah dependency, TypeScript, backend, atau multiplayer online.
- Bom/roket Rebut Arena masih belum diimplementasikan; tetap batch berikutnya.
- RotatePrompt portrait dan pemindahan menu ke panel samping HP landscape dipertahankan.
- Mascot hasil, tint mood, dan confetti tidak diganti.

#### Validasi

- **275 tes, 14 berkas uji, seluruhnya lolos.** Meliputi fase/HP, shield 5/10/15 detik dan cap 100, stacking orb, penyerapan shield sebelum HP, pause/reset, paket campuran, lima apel, bekal upgrade, kampanye solver, serta regresi Arkade.
- `npm run build`: berhasil.
- Browser Chromium: start, pause/resume, bantuan, game over, retry, kembali ke menu; halaman penjaga level 35; aset mode Malam/Portal/Time Attack.
- Tampilan diperiksa pada **360, 390, 768, 1366 px** dan HP landscape **844 × 390**. Tidak ditemukan horizontal overflow; tombol mulai pada portal menu landscape tetap terjangkau.
- Dialog bantuan dua kolom telah diperiksa di desktop dan HP; fokus tidak melompat ke bagian bawah.
- Render Canvas fase 3 diperiksa dengan fixture visual shield/orb; transisi seluruh fase diuji lewat simulasi otomatis, bukan klaim menyelesaikan seluruh run dengan tangan di browser.
- `git diff --check`: bersih.

Uji browser memakai emulasi. Balancing kesulitan/durasi perjalanan dan performa di HP fisik masih memerlukan playtest.

#### Menjalankan

```bash
npm ci
npm run dev
npm test
npm run build
```

Test dijalankan serial karena helper test menyiapkan cache modul bersama. Arsip tidak menyertakan `node_modules`, `.next`, atau folder `.git`.

#### Berkas yang berubah

Daftar lengkap di bawah dibuat dari diff terhadap Boss Batch 1. `ADVENTURE_REVISION.diff` di dalam ZIP berisi diff source; penggantian gambar tersedia sebagai file WebP langsung.

- [ADVENTURE_REVISION.md](#doc-adventure-revision)
- [BOSS_BATCH_1.md](#doc-boss-batch-1)
- [changelog.md](#riwayat-ringkas)
- `README.md`
- `app/globals.css`
- `components/BackgroundLayer.jsx`
- `components/HelpModal.jsx`
- `components/Hud.jsx`
- `components/Overlay.jsx`
- [docs/ASSETS_ADVENTURE.md](#doc-docs-assets-adventure)
- [docs/TAHAP-5.md](#doc-docs-tahap-5)
- [docs/TAHAP-9.md](#doc-docs-tahap-9)
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

</details>

<a id="doc-boss-batch-1"></a>
<details>
<summary><strong>Boss Kebun — batch pertama</strong></summary>

Sumber arsip sebelum penggabungan: BOSS_BATCH_1.md.

> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](#doc-adventure-revision).

### Eat-eat — Batch 1: Penjaga Kebun

Basis: **Eat-eat Fokus UI**, kelanjutan dari `Eat-eat-main-tahap-9.zip`. Tidak ada ZIP unggahan lebih baru yang tersedia pada saat pengerjaan. Perubahan ini berisi implementasi, bukan hanya rancangan.

#### Yang sudah dikerjakan

- Ronde 1–9 berisi antek; boss baru tampil pada ronde 10.
- Tiga varian boss acak dengan warna, nama, dan kecenderungan pola berbeda.
- Tiga fase boss dengan HP 3 → 4 → 5; total 12 HP.
- Jeda serangan makin pendek, ranjau makin banyak, dan fase terakhir memberi damage 2 hati.
- Celah untuk menyerang bertambah dari 1 → 2 → 3 target.
- Heal dapat dikumpulkan menjadi simpanan hati di atas jumlah awal. HUD menggunakan satu ikon hati × jumlah.
- Enam ilustrasi menu diperbarui: Mayhem, Mayhem+, Hard, Impossible, 2P Lokal, dan Mayhem Duo. Masing-masing memiliki WebP desktop dan HP.
- Aturan bantuan, deskripsi menu, HUD, hasil permainan, dan rekor disesuaikan.

**Batch 2 belum diimplementasikan:** bom/roket untuk Rebut Arena. Perubahan ilustrasi Duo pada batch ini tidak menambah senjata pada gameplay.

#### Alur permainan

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

#### RNG boss

Varian dipilih saat run dibuat. Pemilihan varian dan pola menggunakan RNG yang diinjeksi; test dapat mengulang seed yang sama.

| Boss | Pola favorit |
| --- | --- |
| Akar Gahar | Baris berbahaya |
| Raja Spora | Ranjau kebun |
| Sulur Liar | Koridor menyempit |

Ketiga boss dapat menggunakan ketiga pola. Pola favorit mendapat bobot tambahan ketika tersedia. Pola yang baru digunakan dikeluarkan dari pilihan berikutnya. Jika generator pola tidak dapat menghasilkan kondisi aman, sistem memakai baris sebagai fallback; fallback dapat menjadi pengecualian larangan pengulangan.

Ini bukan tiga boss dengan sistem AI yang sepenuhnya terpisah. Variasinya berada pada identitas visual, bobot pola, posisi bahaya, dan urutan serangan. Pendekatan ini menjaga aturan tetap mudah dibaca pemain.

#### Fase dan keseimbangan awal

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

#### Hati, heal, dan energi

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

#### Perbaikan logic

1. **Fase tidak lagi sama dengan jumlah pukulan.** `phaseHp` memisahkan lapisan fase dari `hp` total sehingga boss dapat lebih tebal.
2. **Serangan tidak lagi memakai urutan modulo tetap.** RNG berbobot memilih pola dan generator memilih posisi.
3. **Hadiah dipicu sekali.** Transisi ronde/fase idempoten; menunggu tidak menduplikasi heal.
4. **Multi-target tidak bisa difarm.** Setiap jendela menyimpan target yang sudah terkena.
5. **Damage dibawa oleh serangan.** Collision biasa tidak ikut berubah menjadi 2 hati; hasil tidak membuat hati negatif.
6. **Pause memakai jam simulasi.** Sisa telegraph/transisi tetap saat pause/help/orientasi.
7. **Hasil terminal aman.** HUD tidak membaca serangan yang sudah dibersihkan setelah kalah.
8. **Rekor baru terpisah.** Key konfigurasi menjadi `boss|v:2|hp:12|lives:5|rounds:10|speed:normal` untuk kecepatan Normal. Penyimpanan tetap `snake-records-v1`; entri boss lama tidak dihapus atau dimigrasikan.
9. **Rekor menyimpan progres ronde.** Selain kerusakan boss, kemenangan, dan waktu tercepat, menu menampilkan ronde tertinggi.

#### Aset

Ilustrasi mempertahankan ukuran/aspek 16:9, area tenang di kiri, dan aksi karakter di kanan. Tampilan menu tetap memakai `contain`, sehingga gambar tidak dipotong untuk memenuhi panel.

- Mayhem: mata asimetris, ekspresi panik, apel/bom berhamburan.
- Mayhem+: ekspresi nekat dan overconfident dengan gerak tubuh lebih aktif.
- Hard: rahang tegang, alis tajam, menghindari racun/duri.
- Impossible: panik berlebihan dengan tubuh kusut dan bom.
- 2P Lokal: dua rival berebut apel; tubuh terpisah dan ekspresi kompetitif.
- Mayhem Duo: rival saling menyerang sambil berebut apel di antara bom.

Lokasi aset: `public/assets/game/bg-{mode}.webp` dan `bg-{mode}-m.webp`. Desktop lebar 1672 px, HP lebar 960 px. Prompt lengkap dan metode generasi ada di [docs/ASSET_BOSS_BATCH_1.md](#doc-docs-asset-boss-batch-1).

Antek/boss di papan digambar melalui Canvas 2D, dengan siluet, palet, ekspresi, label, serta bilah HP per fase. Tidak memerlukan request gambar tambahan ketika bermain.

#### File yang berubah

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

#### Yang tetap

`lib/gameEngine.js`, gameplay Arcade, semua controller mode lain, logika Rebut Arena, struktur menu dua tingkat, localStorage `snake-speed`, `snake-ta`, `snake-lefty`, dan `snake_best` tetap. Tidak menambah dependency, tidak mengubah JavaScript ke TypeScript, dan tidak menambah backend atau multiplayer online.

#### Menjalankan

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

#### Validasi

- Build produksi: **lolos**.
- Suite test: **265/265 lolos**.
- Test baru mencakup 18 antek/9 ronde, boss ronde 10, HP 3/4/5, tiga target, RNG, cadence, damage 2, stack heal, pause/transisi, reset, dan kompatibilitas rekor.
- Uji transisi penuh menggunakan fixture simulasi; ini bukan klaim menyelesaikan seluruh run secara manual dengan keyboard.
- Browser Chromium: desktop 1366 × 768; menu HP 360 × 800, 390 × 844, 768 × 1024; landscape 844 × 390. Tidak ada overflow horizontal pada menu yang diuji.
- Alur browser: start → pause/resume → bantuan → game over → retry/reset → kembali ke menu; portrait → rotasi → landscape dan CTA portal. Semuanya lolos.
- Keenam scene baru termuat; tidak ada error JavaScript selama pemeriksaan browser.
- Pengujian HP menggunakan emulasi browser, bukan perangkat fisik.

Angka keseimbangan merupakan setelan awal. Kelayakan logic sudah diuji; durasi dan tingkat kesulitan tetap perlu dirasakan lewat sesi bermain nyata sebelum dianggap final untuk semua pemain.

#### Arah batch 2 — Rebut Arena

Belum dieksekusi. Sasaran berikutnya: bom atau roket untuk duel lokal, kontrol aksi terpisah untuk P1/P2, tanda serangan yang terbaca, cooldown/amunisi, dan aturan dampak pada jejak/wilayah/nyawa. Sebelum mengubahnya, tetapkan apakah ledakan merusak jejak saja atau juga mengurangi hati, serta aturan self-damage dan hasil seri. Pertahankan hasil deterministik untuk kejadian serentak dan jangan mengubah mode boss yang sudah diuji.

</details>

<a id="doc-ui-fokus"></a>
<details>
<summary><strong>Desain UI Fokus</strong></summary>

Sumber arsip sebelum penggabungan: UI_FOKUS.md.

### Eat-eat — UI Fokus

Tanggal: 18 Oktober 2026. Basis: `Eat-eat-main-tahap-9.zip`.

Rombakan ini menerapkan pilihan desain **Fokus** ke aplikasi Next.js asli. Menu menggunakan latar krem, teks hijau gelap, kontrol sederhana, dan satu keluarga ilustrasi kartun. Versi lama dan ZIP sumber tetap terpisah dari hasil ini.

#### Perubahan utama

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

#### Aset baru

| Aset | Jumlah | Format dan penggunaan |
| --- | ---: | --- |
| Scene mode | 15 desain × 2 resolusi | WebP desktop 1672 × 941; HP 960 × 540 |
| Maskot mood | 5 | PNG transparan 320 × 320 |
| Apel, bom, portal | 10 | PNG transparan 128 × 128 |
| Ikon aplikasi | 2 | PNG 192 × 192 dan 512 × 512 |

Aset siap aplikasi berada di `public/assets/game/`; ikon aplikasi di `public/`. Seluruh file yang dipakai aplikasi sudah berada di ZIP, tanpa bergantung pada lokasi gambar sementara. Aset raster dibuat menggunakan image generation bawaan, dikurasi, lalu diperkecil dan dikompresi. Ini bukan klaim ilustrasi buatan tangan. Prompt dan aturan konsistensi ada di [docs/ASSET_FOKUS.md](#doc-docs-asset-fokus).

#### File yang berubah

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

#### Yang sengaja tidak diubah

- `lib/gameEngine.js`, seluruh simulasi/controller/renderer mode, dan `components/GameCanvas.jsx`.
- Aturan collision, skor, spawn, nyawa, timer, difficulty, generator/solver, serta 50 level Puzzle.
- Warna papan dan logika gerakan joystick. Joystick hanya mendapat gaya CSS baru.
- Key `snake-speed`, `snake-ta`, `snake-lefty`, `snake_best`, serta penyimpanan progres lain.
- Dependency, lockfile, bahasa JavaScript, susunan folder aplikasi, dan backend. Tidak ada fitur online multiplayer.
- Perilaku bantuan/visibility-pause yang sudah ada pada tahap 9 dipertahankan, bukan ditambahkan dari versi redesign lama.

#### Menjalankan

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

#### Verifikasi

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

#### Catatan logika untuk pekerjaan berikutnya

Temuan review tahap 9 berikut **belum diperbaiki** karena tahap ini berfokus pada UI. Jangan menganggap aset/UI baru menyelesaikannya.

1. **Collision 2P saat respawn.** Pisahkan daftar pemain yang bergerak dari occupancy tubuh. Pemain yang baru respawn tidak bergerak pada tick itu, tetapi tubuhnya tetap perlu masuk pemeriksaan collision. Tambahkan tes lawan memasuki kepala/tubuh/ekor respawn.
2. **Timestamp makanan setelah Main Lagi.** Audit urutan `reset()` dan `clock.reset()` pada engine arkade. Dunia baru harus membuat deadline relatif terhadap jam ronde baru. Uji retry setelah ronde 60 detik, termasuk reveal racun dan expiry item.
3. **Race cache test.** Helper test memakai folder cache bersama. `npm test` default masih berisiko bentrok saat file berjalan paralel. Perintah serial di atas dipakai untuk validasi ini; perbaikan permanen sebaiknya memberi cache terisolasi per proses atau build fixture sekali sebelum test.

Backend dan pengembangan gameplay sebaiknya menjadi perubahan terpisah dengan spesifikasi serta pengujian tersendiri.

</details>

### Panduan dan prompt aset

<a id="doc-asset-prompts-dungeon"></a>
<details>
<summary><strong>Prompt aset revisi Dungeon</strong></summary>

Sumber arsip sebelum penggabungan: ASSET_PROMPTS_DUNGEON.md.

### Prompt aset menu — revisi Dungeon

Setiap aset dibuat/diedit terpisah. Encoding WebP desktop 1672×941 dan mobile 960×540 mempertahankan alpha, tanpa pemotongan kreatif tambahan.

#### boss

Tindakan: redesign.

Redesign the attached Snake menu scene in a cohesive cute hand-drawn 2D cartoon style, lime-green snake with cream belly, warm dark outlines, rosy cheeks, bold expressive eyebrows, simple flat 2–3 shades. Strong small-size silhouette, no 3D, gloss or airbrush. No text, lettering, logos or UI. Wide 16:9. Leave the LEFT 42% fully transparent empty alpha for the title. Compose a miniature environment in the RIGHT 58% with its own colored backdrop, ground and props, not only a floating sticker character. Outer area and left stay transparent. Important faces and props sit safely inside the right vignette for phone display. Keep a consistent mascot identity and avoid unnecessary tiny detail. A tiny brave lime snake faces a large cartoon garden beetle boss with tough leafy armor and angry eyebrows. Two smaller beetle minions approach first. Fierce but funny expressions, big readable silhouettes, warm dusty garden arena, mossy stones, tomato vines and a colored warm woodland backdrop inside the right vignette. The boss looks like a formidable garden guardian, not horror. Match the reference subject with richer consistent expressive staging.

#### classic

Tindakan: redesign.

Create a polished but modest hand-drawn 2D cartoon game scene for Snake. Use the same lime green snake mascot with cream belly, dark warm outlines, little rosy cheeks, expressive asymmetrical eyebrows and mouth, 2–3 flat shades. No glossy 3D, no airbrush, no text or letters, no UI or logo. Wide 16:9 canvas. The LEFT 42% must be genuinely transparent empty space for live menu title; on the RIGHT 58% compose one cohesive colorful miniature environment with its own colored sky/background, ground and plants (not a floating character sticker). Irregular soft illustrated outer silhouette on right, external canvas transparent. Keep all important features inside the right scene with generous safe margins so the whole wide image works on a phone. Preserve the art direction of the reference but redesign the scene and expression as instructed. Do not put an opaque rectangle or plate behind the future title. Sunny day: a mischievous, determined snake with a raised eyebrow, wide crooked grin, focused eyes, dynamic coiled body lunging after a tumbling red apple. A little dust trail, spring orchard meadow, tiny flowers, warm blue sky. Funny expressive action and strong character, rather than a bland idle smile.

#### classicnight

Tindakan: redesign.

Create a polished but modest hand-drawn 2D cartoon game scene for Snake. Use the same lime green snake mascot with cream belly, dark warm outlines, little rosy cheeks, expressive asymmetrical eyebrows and mouth, 2–3 flat shades. No glossy 3D, no airbrush, no text or letters, no UI or logo. Wide 16:9 canvas. The LEFT 42% must be genuinely transparent empty space for live menu title; on the RIGHT 58% compose one cohesive colorful miniature environment with its own colored sky/background, ground and plants (not a floating character sticker). Irregular soft illustrated outer silhouette on right, external canvas transparent. Keep all important features inside the right scene with generous safe margins so the whole wide image works on a phone. Preserve the art direction of the reference but redesign the scene and expression as instructed. Do not put an opaque rectangle or plate behind the future title. Night forest: the expressive snake peeks around a mossy log, startled and curious with lifted eyebrows, wide alert eyes and a tiny open mouth, reacting to a glowing firefly. A crescent moon, dark teal and blue trees, fireflies and a patch of moonlit grass establish a real colored night backdrop in the right vignette. Cute suspense.

#### delivery

Tindakan: redesign.

Redesign this Snake menu illustration into a cohesive small scene in a consistent hand-drawn 2D cartoon style: lime-green snake, cream belly, dark warm outlines, pink cheeks, expressive eyebrows and mouth, simple two or three flat shades. Cute and funny with clear action, not shiny 3D or airbrushed, no text, no letters, no UI. Wide 16:9. LEFT 42% genuinely transparent and empty for a live title. RIGHT 58% contains a colorful scene vignette WITH an internal colored environment/background and ground, not an isolated sticker. Outside that vignette is alpha transparency. Keep important faces and props comfortably inside the right scene to read at phone size. A determined little snake struggling comically to deliver two small cardboard apple parcels stacked on its coiled body, brows pinched and tongue poking out in concentration. No human arms. A curving village path, tiny red-roof cottage, wooden mailbox and an apple orchard with warm blue sky create the right-side colored environment. Parcels have a simple apple picture only, no lettering.

#### impossible

Tindakan: Bersihkan bidang teks, pertahankan scene.

Use case: precise-object-edit / background-extraction. Edit ONLY the provided impossible wide cartoon game banner. Preserve the existing right-hand character(s), exact pose(s), facial expression(s), props, action strokes, colors and drawing style. Keep the colored sky, clouds, bushes, ground and other environmental artwork that forms the scene BEHIND the characters on the right. Remove only the dark empty LEFT text area, left framing tree and its left foreground ground, replacing it with true alpha transparency. This is a preservation edit, not a redesign. Keep a complete miniature environment on the right 55–60% of the wide canvas, with an organic irregular left edge; do not isolate just the characters. Reserve the left 42% around the middle-height title area as completely empty transparency for live HTML copy. Do not move, crop, shrink, or replace any character/prop. Keep the original wide 1672x941 composition. No lettering, no labels, no drawn checkerboard, no white background. Output true transparency outside the right-hand scene.

#### mayhem

Tindakan: cleanup.

Edit the existing Mayhem scene. Make the left title area fully transparent. Preserve the right-side colored environment and the existing snake expression, pose and composition. No text, UI, or new illustration.

#### mayhemduo

Tindakan: Bersihkan bidang teks, pertahankan scene.

Use case: precise-object-edit / background-extraction. Edit ONLY the provided mayhemduo wide cartoon game banner. Preserve the existing right-hand character(s), exact pose(s), facial expression(s), props, action strokes, colors and drawing style. Keep the colored sky, clouds, bushes, ground and other environmental artwork that forms the scene BEHIND the characters on the right. Remove only the dark empty LEFT text area, left framing tree and its left foreground ground, replacing it with true alpha transparency. This is a preservation edit, not a redesign. Keep a complete miniature environment on the right 55–60% of the wide canvas, with an organic irregular left edge; do not isolate just the characters. Reserve the left 42% around the middle-height title area as completely empty transparency for live HTML copy. Do not move, crop, shrink, or replace any character/prop. Keep the original wide 1672x941 composition. No lettering, no labels, no drawn checkerboard, no white background. Output true transparency outside the right-hand scene.

#### mayhemhard

Tindakan: Bersihkan bidang teks, pertahankan scene.

Use case: precise-object-edit / background-extraction. Edit ONLY the provided mayhemhard wide cartoon game banner. Preserve the existing right-hand character(s), exact pose(s), facial expression(s), props, action strokes, colors and drawing style. Keep the colored sky, clouds, bushes, ground and other environmental artwork that forms the scene BEHIND the characters on the right. Remove only the dark empty LEFT text area, left framing tree and its left foreground ground, replacing it with true alpha transparency. This is a preservation edit, not a redesign. Keep a complete miniature environment on the right 55–60% of the wide canvas, with an organic irregular left edge; do not isolate just the characters. Reserve the left 42% around the middle-height title area as completely empty transparency for live HTML copy. Do not move, crop, shrink, or replace any character/prop. Keep the original wide 1672x941 composition. No lettering, no labels, no drawn checkerboard, no white background. Output true transparency outside the right-hand scene.

#### mayhemplus

Tindakan: Bersihkan bidang teks, pertahankan scene.

Use case: precise-object-edit / background-extraction. Edit ONLY the provided mayhemplus wide cartoon game banner. Preserve the existing right-hand character(s), exact pose(s), facial expression(s), props, action strokes, colors and drawing style. Keep the colored sky, clouds, bushes, ground and other environmental artwork that forms the scene BEHIND the characters on the right. Remove only the dark empty LEFT text area, left framing tree and its left foreground ground, replacing it with true alpha transparency. This is a preservation edit, not a redesign. Keep a complete miniature environment on the right 55–60% of the wide canvas, with an organic irregular left edge; do not isolate just the characters. Reserve the left 42% around the middle-height title area as completely empty transparency for live HTML copy. Do not move, crop, shrink, or replace any character/prop. Keep the original wide 1672x941 composition. No lettering, no labels, no drawn checkerboard, no white background. Output true transparency outside the right-hand scene.

#### multiplayer

Tindakan: Bersihkan bidang teks, pertahankan scene.

Use case: precise-object-edit / background-extraction. Edit ONLY the provided multiplayer wide cartoon game banner. Preserve the existing right-hand character(s), exact pose(s), facial expression(s), props, action strokes, colors and drawing style. Keep the colored sky, clouds, bushes, ground and other environmental artwork that forms the scene BEHIND the characters on the right. Remove only the dark empty LEFT text area, left framing tree and its left foreground ground, replacing it with true alpha transparency. This is a preservation edit, not a redesign. Keep a complete miniature environment on the right 55–60% of the wide canvas, with an organic irregular left edge; do not isolate just the characters. Reserve the left 42% around the middle-height title area as completely empty transparency for live HTML copy. Do not move, crop, shrink, or replace any character/prop. Keep the original wide 1672x941 composition. No lettering, no labels, no drawn checkerboard, no white background. Output true transparency outside the right-hand scene.

#### portal

Tindakan: redesign.

Create a polished but modest hand-drawn 2D cartoon game scene for Snake. Use the same lime green snake mascot with cream belly, dark warm outlines, little rosy cheeks, expressive asymmetrical eyebrows and mouth, 2–3 flat shades. No glossy 3D, no airbrush, no text or letters, no UI or logo. Wide 16:9 canvas. The LEFT 42% must be genuinely transparent empty space for live menu title; on the RIGHT 58% compose one cohesive colorful miniature environment with its own colored sky/background, ground and plants (not a floating character sticker). Irregular soft illustrated outer silhouette on right, external canvas transparent. Keep all important features inside the right scene with generous safe margins so the whole wide image works on a phone. Preserve the art direction of the reference but redesign the scene and expression as instructed. Do not put an opaque rectangle or plate behind the future title. Portal garden: a surprised snake bursts halfway through a luminous purple swirling portal, body curved dynamically, eyes wide with one eyebrow higher, cheeks puffed. Whimsical little stone ruins, violet plants and a teal sky form the colored backdrop on the right. A red apple is just out of reach. The portal and snake must read clearly at small phone size.

#### puzzle

Tindakan: redesign.

Redesign this Snake menu illustration into a cohesive small scene in a consistent hand-drawn 2D cartoon style: lime-green snake, cream belly, dark warm outlines, pink cheeks, expressive eyebrows and mouth, simple two or three flat shades. Cute and funny with clear action, not shiny 3D or airbrushed, no text, no letters, no UI. Wide 16:9. LEFT 42% genuinely transparent and empty for a live title. RIGHT 58% contains a colorful scene vignette WITH an internal colored environment/background and ground, not an isolated sticker. Outside that vignette is alpha transparency. Keep important faces and props comfortably inside the right scene to read at phone size. DUNGEON adventure. A brave, sly, expressive lime snake coiled in front of a small stone arch doorway, holding a golden key in the curve of its tail. Looking sideways with a cheeky half-grin and raised brow toward a tiny teal slime and a squat gray stone warden hiding behind a column. Warm torch-lit stone walls, cobblestones, a gate, moss and tiny golden apple coin. A rich muted teal/brown dungeon environment behind the characters. Strong readable shapes, cute tension, not a garden scene.

#### roguelite

Tindakan: redesign.

Redesign the attached Snake menu scene in a cohesive cute hand-drawn 2D cartoon style, lime-green snake with cream belly, warm dark outlines, rosy cheeks, bold expressive eyebrows, simple flat 2–3 shades. Strong small-size silhouette, no 3D, gloss or airbrush. No text, lettering, logos or UI. Wide 16:9. Leave the LEFT 42% fully transparent empty alpha for the title. Compose a miniature environment in the RIGHT 58% with its own colored backdrop, ground and props, not only a floating sticker character. Outer area and left stay transparent. Important faces and props sit safely inside the right vignette for phone display. Keep a consistent mascot identity and avoid unnecessary tiny detail. A daring expedition snake with a small satchel and rolled map, leaning forward with a confident crooked grin and one raised brow. Across a little ruined garden gate, a giant comically stern vegetable monster peers from the foliage with two small minions. A winding forest trail, mossy stone gate, colorful warm green forest sky and a few apple plants form the scene. Cute adventure with a real boss destination, not just a solo snake sticker.

#### territory

Tindakan: redesign.

Redesign the attached Snake menu scene in a cohesive cute hand-drawn 2D cartoon style, lime-green snake with cream belly, warm dark outlines, rosy cheeks, bold expressive eyebrows, simple flat 2–3 shades. Strong small-size silhouette, no 3D, gloss or airbrush. No text, lettering, logos or UI. Wide 16:9. Leave the LEFT 42% fully transparent empty alpha for the title. Compose a miniature environment in the RIGHT 58% with its own colored backdrop, ground and props, not only a floating sticker character. Outer area and left stay transparent. Important faces and props sit safely inside the right vignette for phone display. Keep a consistent mascot identity and avoid unnecessary tiny detail. Two rival snakes, lime green versus teal blue, fiercely disputing a small grid arena, each guarding a tiny triangular flag. Competitive scowling brows, gritted teeth, determined opposing lunges, a spark where their tails clash. No hugging, no heart motifs, no affectionate pose. A grassy arena with red and blue claimed patches, low wooden fence, tiny distant hills and colored sky inside the right vignette.

#### timeattack

Tindakan: redesign.

Redesign this Snake menu illustration into a cohesive small scene in a consistent hand-drawn 2D cartoon style: lime-green snake, cream belly, dark warm outlines, pink cheeks, expressive eyebrows and mouth, simple two or three flat shades. Cute and funny with clear action, not shiny 3D or airbrushed, no text, no letters, no UI. Wide 16:9. LEFT 42% genuinely transparent and empty for a live title. RIGHT 58% contains a colorful scene vignette WITH an internal colored environment/background and ground, not an isolated sticker. Outside that vignette is alpha transparency. Keep important faces and props comfortably inside the right scene to read at phone size. A frantic, determined snake racing along a winding dirt track toward a red apple, eyebrows lowered, cheek puffed, mouth in a crooked competitive grin. A big little hourglass is beside the track, speed dust and a couple flying leaves. A warm yellow-green orchard landscape with blue sky behind it, all within the right vignette.

</details>

<a id="doc-docs-assets-adventure"></a>
<details>
<summary><strong>Prompt aset Petualangan terdahulu</strong></summary>

Sumber arsip sebelum penggabungan: docs/ASSETS_ADVENTURE.md.

### Revisi aset Petualangan

Dibuat dengan imagegen bawaan; delapan banner diedit dari aset sebelumnya. WebP desktop 1672 px, HP 960 px, alpha transparan dipertahankan.

#### classicnight

File: public/assets/game/bg-classicnight.webp dan bg-classicnight-m.webp

Prompt:

Use case: style-transfer. Edit target: attached existing Snake game banner. Redraw in the SAME simple hand-drawn flat cartoon style, green snake identity, thick dark organic outlines, cream belly, limited colors. Make the acting MUCH more expressive. Night adventure: snake sneaks low, eyes very wide and looking sideways at a tiny glowing firefly, raised worried eyebrows and small nervous open mouth. Crescent moon and a few dark teal leaves. Landscape banner 16:9. All illustration occupies RIGHT 62% of canvas with generous safe margins. LEFT 38% completely empty and TRANSPARENT for live UI title. Remove the solid dark rectangular background; use actual alpha transparency around an isolated vignette of character and minimal mode props, no enclosing frame. No text, letters, watermark, gradients, 3D, glossy rendering, extra limbs. Preserve the coherent cute game aesthetic.

#### portal

File: public/assets/game/bg-portal.webp dan bg-portal-m.webp

Prompt:

Use case: style-transfer. Edit target: attached existing Snake game banner. Redraw in the SAME simple hand-drawn flat cartoon style, green snake identity, thick dark organic outlines, cream belly, limited colors. Make the acting MUCH more expressive. Portal: snake bursts halfway through a purple swirling portal, body twisting, shocked wide eyes with unequal eyebrows and a surprised round open mouth. Clearly energetic and startled. Landscape banner 16:9. All illustration occupies RIGHT 62% of canvas with generous safe margins. LEFT 38% completely empty and TRANSPARENT for live UI title. Remove the solid dark rectangular background; use actual alpha transparency around an isolated vignette of character and minimal mode props, no enclosing frame. No text, letters, watermark, gradients, 3D, glossy rendering, extra limbs. Preserve the coherent cute game aesthetic.

#### timeattack

File: public/assets/game/bg-timeattack.webp dan bg-timeattack-m.webp

Prompt:

Use case: style-transfer. Edit target: attached existing Snake game banner. Redraw in the SAME simple hand-drawn flat cartoon style, green snake identity, thick dark organic outlines, cream belly, limited colors. Make the acting MUCH more expressive. Time race: snake races forward urgently, sharply determined eyebrows, clenched toothy mouth, two sweat drops, tail trailing backward, a tilted nearly-empty hourglass and a rolling apple. Landscape banner 16:9. All illustration occupies RIGHT 62% of canvas with generous safe margins. LEFT 38% completely empty and TRANSPARENT for live UI title. Remove the solid dark rectangular background; use actual alpha transparency around an isolated vignette of character and minimal mode props, no enclosing frame. No text, letters, watermark, gradients, 3D, glossy rendering, extra limbs. Preserve the coherent cute game aesthetic.

#### puzzle

File: public/assets/game/bg-puzzle.webp dan bg-puzzle-m.webp

Prompt:

Use case: style-transfer. Edit target: attached existing Snake game banner. Redraw in the SAME simple hand-drawn flat cartoon style, green snake identity, thick dark organic outlines, cream belly, limited colors. Make the acting MUCH more expressive. Key puzzle: clever sneaking snake with narrowed focused eyes, crooked mischievous grin and one raised eyebrow, holding a gold key toward a little locked garden gate; an alert little orange beetle sentry watches in the opposite direction. Landscape banner 16:9. All illustration occupies RIGHT 62% of canvas with generous safe margins. LEFT 38% completely empty and TRANSPARENT for live UI title. Remove the solid dark rectangular background; use actual alpha transparency around an isolated vignette of character and minimal mode props, no enclosing frame. No text, letters, watermark, gradients, 3D, glossy rendering, extra limbs. Preserve the coherent cute game aesthetic.

#### delivery

File: public/assets/game/bg-delivery.webp dan bg-delivery-m.webp

Prompt:

Use case: style-transfer. Attached image is the edit target for a Snake game menu banner. Preserve its green snake identity, cream belly, simple thick dark outlines and cute flat cartoon aesthetic. Redraw with MUCH stronger acting: An energetic snake courier speeding toward a tiny garden cottage, tail curled around two matching apple parcels, determined brows, big focused eyes, small clenched smile, two sweat drops, parcels tilting and dust puffs. Clearly delivering in a hurry. Landscape 16:9. All action and props on the RIGHT 62%, LEFT 38% empty and truly transparent for live UI text. Remove the flat colored rectangular background completely. Actual alpha transparency outside an isolated character-and-props vignette, minimal foliage. No text, logos, frames, watermarks, 3D, glossy gradients. Consistent with a hand-drawn cartoon mobile game. Keep subjects inside safe margins.

#### roguelite

File: public/assets/game/bg-roguelite.webp dan bg-roguelite-m.webp

Prompt:

Use case: style-transfer. Attached image is the edit target for a Snake game menu banner. Preserve its green snake identity, cream belly, simple thick dark outlines and cute flat cartoon aesthetic. Redraw with MUCH stronger acting: A brave green snake adventurer with tiny backpack confronts a large angry garden root-beetle boss behind a small stone garden gate. Snake has determined narrowed eyes and fierce grin. Boss scowls with exaggerated brows. Gold apples and a little map make expedition story clear. Two opponents, not friends. Landscape 16:9. All action and props on the RIGHT 62%, LEFT 38% empty and truly transparent for live UI text. Remove the flat colored rectangular background completely. Actual alpha transparency outside an isolated character-and-props vignette, minimal foliage. No text, logos, frames, watermarks, 3D, glossy gradients. Consistent with a hand-drawn cartoon mobile game. Keep subjects inside safe margins.

#### boss

File: public/assets/game/bg-boss.webp dan bg-boss-m.webp

Prompt:

Use case: style-transfer. Attached image is the edit target for a Snake game menu banner. Preserve its green snake identity, cream belly, simple thick dark outlines and cute flat cartoon aesthetic. Redraw with MUCH stronger acting: Large angry garden beetle boss faces a determined green snake challenger, both fierce competitive eyes, beetle raised claws and clenched teeth, snake coiled ready to dodge. Two tiny seed minions. Clear dramatic confrontation, cute cartoon rather than scary. Landscape 16:9. All action and props on the RIGHT 62%, LEFT 38% empty and truly transparent for live UI text. Remove the flat colored rectangular background completely. Actual alpha transparency outside an isolated character-and-props vignette, minimal foliage. No text, logos, frames, watermarks, 3D, glossy gradients. Consistent with a hand-drawn cartoon mobile game. Keep subjects inside safe margins.

#### territory

File: public/assets/game/bg-territory.webp dan bg-territory-m.webp

Prompt:

Use case: style-transfer. Attached image is the edit target for a Snake game menu banner. Preserve its green snake identity, cream belly, simple thick dark outlines and cute flat cartoon aesthetic. Redraw with MUCH stronger acting: Two rival snakes, lime green and teal, aggressively compete for a little tiled garden with orange and blue flags. Both have sharp competitive brows, fierce open mouths and dynamic lunging poses in opposite directions; a spark between flags. Sporting rivalry, NOT romantic, no hearts. Landscape 16:9. All action and props on the RIGHT 62%, LEFT 38% empty and truly transparent for live UI text. Remove the flat colored rectangular background completely. Actual alpha transparency outside an isolated character-and-props vignette, minimal foliage. No text, logos, frames, watermarks, 3D, glossy gradients. Consistent with a hand-drawn cartoon mobile game. Keep subjects inside safe margins.

</details>

<a id="doc-docs-asset-boss-batch-1"></a>
<details>
<summary><strong>Prompt aset Boss dan ekspresi terdahulu</strong></summary>

Sumber arsip sebelum penggabungan: docs/ASSET_BOSS_BATCH_1.md.

### Aset ekspresi — Batch boss kebun

Metode: imagegen built-in, edit dari scene Fokus yang sudah ada. Setiap hasil dipakai pada file desktop dan varian HP; konversi WebP memakai Sharp tanpa menambah dependency proyek.

#### mayhem

Target: `public/assets/game/bg-mayhem.webp` dan `bg-mayhem-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this Snake game menu background. Preserve the exact wide 16:9 layout, quiet dark foliage on the left 48%, green snake identity, thick hand-drawn dark outlines, flat warm cartoon shading, cream belly, green orchard, orange sky, bomb and apples. Change the snake's expression and pose to comically unhinged Mayhem: huge asymmetric startled eyes, one raised eyebrow and one lowered, wide zigzag open grin with tiny tooth, a sweat drop, head recoiling and tail whipping as the lit cartoon bomb bounces and apples fly nearby. Strong slapstick energy, readable at phone size. It should look like a mischievous hand-illustrated game, not a happy baby smiling for a portrait. All action stays inside the right half with generous safe margins. No text, no letters, no UI, no gore, no extra characters. Keep the landscape and palette consistent.
```

#### multiplayer

Target: `public/assets/game/bg-multiplayer.webp` dan `bg-multiplayer-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this Snake game menu background. Keep the wide 16:9 landscape, quiet dark green foliage left 45%, flat storybook cartoon style, thick dark outlines, green and teal snake identities, cream bellies, sunny orchard palette. Completely change the two snake poses and expressions into a competitive face-off: green snake from lower-left of the right-half lunging diagonally up toward a contested airborne red apple, teal snake on right lunging diagonally down to intercept, glaring at each other with sharply angled eyebrows, stubborn cheeky gritted smiles, energetic curved bodies kept SEPARATE, dust puffs and one small impact star between them. Visual reads as heated arcade rivals fighting for the apple. NO blushing cheeks, no cute mutual smiles, no touching noses, no intertwined tails, no hearts, no romance. All characters stay right-half, no cropping at edges. No text or letters or UI. Preserve the handcrafted cute style.
```

#### mayhemplus

Target: `public/assets/game/bg-mayhemplus.webp` dan `bg-mayhemplus-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this exact Snake game menu scene. Keep 16:9 landscape dimensions, quiet dark foliage on left 44%, original green snake identity and teal rival if present, cream bellies, bold hand-drawn outlines and simple flat storybook cartoon style. Replace the static smiling pose/expression as follows: Comically overconfident manic grin, wildly asymmetric eyes, one eyebrow cocked high; snake whips tail through the air while two lit cartoon bombs and the purple apple tumble around it, exaggerated frantic slapstick, warm red-orange orchard. Action readable at phone size. Keep action in right half with safe margins, no cropped heads or tails, no text or UI or letters, no gore, no extra characters. Stay consistent with the existing illustration family.
```

#### mayhemhard

Target: `public/assets/game/bg-mayhemhard.webp` dan `bg-mayhemhard-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this exact Snake game menu scene. Keep 16:9 landscape dimensions, quiet dark foliage on left 44%, original green snake identity and teal rival if present, cream bellies, bold hand-drawn outlines and simple flat storybook cartoon style. Replace the static smiling pose/expression as follows: Determined strained expression: sharply furrowed brows, gritted teeth, sweat beads and narrowed focused eyes. Snake recoils dramatically from the existing purple poison apple while avoiding curling thorn vines. Danger feels challenging yet funny. Golden amber orchard. Action readable at phone size. Keep action in right half with safe margins, no cropped heads or tails, no text or UI or letters, no gore, no extra characters. Stay consistent with the existing illustration family.
```

#### impossible

Target: `public/assets/game/bg-impossible.webp` dan `bg-impossible-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this exact Snake game menu scene. Keep 16:9 landscape dimensions, quiet dark foliage on left 44%, original green snake identity and teal rival if present, cream bellies, bold hand-drawn outlines and simple flat storybook cartoon style. Replace the static smiling pose/expression as follows: Maximum panic: bulging asymmetric eyes, zigzag screaming mouth, two sweat drops, snake tangled in its own separate loose zigzag body curve as two cartoon lit bombs bounce close by and the red warning flag waves. Crimson-purple dusk orchard, readable funny desperation. Action readable at phone size. Keep action in right half with safe margins, no cropped heads or tails, no text or UI or letters, no gore, no extra characters. Stay consistent with the existing illustration family.
```

#### mayhemduo

Target: `public/assets/game/bg-mayhemduo.webp` dan `bg-mayhemduo-m.webp`.

Prompt final:

```text
Use case: precise-object-edit. Edit this exact Snake game menu scene. Keep 16:9 landscape dimensions, quiet dark foliage on left 44%, original green snake identity and teal rival if present, cream bellies, bold hand-drawn outlines and simple flat storybook cartoon style. Replace the static smiling pose/expression as follows: Two fierce arcade rivals, green snake and teal snake lunging toward each other and a contested airborne red apple, glaring eyes, sharply angled eyebrows, stubborn gritted teeth, competitive smug fury. A cartoon lit bomb bounces between their separate curved bodies, with dust clouds and impact stars. Green snake low left within right-half, teal high right. No blushing, no romance, no shared smiles, no touching noses, no entwined tails. Warm sunset orchard. Action readable at phone size. Keep action in right half with safe margins, no cropped heads or tails, no text or UI or letters, no gore, no extra characters. Stay consistent with the existing illustration family.
```

</details>

<a id="doc-docs-asset-fokus"></a>
<details>
<summary><strong>Panduan aset Fokus, maskot dan item</strong></summary>

Sumber arsip sebelum penggabungan: docs/ASSET_FOKUS.md.

### Panduan aset Fokus

#### Identitas visual

Satu ular hijau gemuk, perut krem, mata gelap, pipi koral, garis luar zaitun. Hindari anggota tubuh tambahan, tekstur rumit, neon dominan, tipografi dalam gambar, atau gaya 3D fotorealistis. Tombol, judul, angka, dan teks dibuat di React, tidak ditanam di ilustrasi.

Metode: image generation bawaan dengan satu referensi karakter Classic. Gambar yang salah dikoreksi melalui image generation: apel normal dibuat tanpa maskot, dan kunci Puzzle diletakkan di tanah agar ular tidak mempunyai tangan. Sharp hanya dipakai untuk resize/kompresi/konversi format, bukan menggambar aset.

#### Rasio dan penempatan

- Scene: rasio sekitar 16:9, karakter utama di kanan, area kiri tenang untuk teks. Seluruh karakter masuk frame.
- HP: banner mengikuti rasio gambar asli. Desktop: gambar tetap utuh di sisi kanan banner lebar dengan transisi halus ke warna dasar di kiri.
- Nama file desktop `bg-{id}.webp`; varian HP `bg-{id}-m.webp`. Mode ID mengikuti registry.
- Desktop 1672 × 941, WebP kualitas 82. HP 960 × 540, kualitas 78. Budget tiap file < 300 KB.
- Maskot transparan 320 × 320; item transparan 128 × 128. Ikon aplikasi menggunakan maskot idle pada 192 dan 512 px.
- Jangan mengganti object-fit menjadi cover tanpa mengecek posisi karakter pada 360 px dan landscape.

#### Prompt dasar scene

```text
Production background illustration for eat-eat Snake game. One wide 16:9 image. No UI, text, logo, borders or watermark. Reference defines exact mascot identity, proportions, eyes, cream belly, coral cheeks and olive outline. Friendly 2D cartoon with clear color regions and restrained shading. Important characters and props fully within the right half with safe margins; left half low-detail dark muted scenery reserved for text. Sage ground, sparse simple bushes, readable on a 390px mobile banner. No arms or hands on the snake. No glossy 3D, painterly clutter or cinematic lighting.
```

Tambahkan tema berikut pada prompt dasar:

| Mode ID | Tema | Berkas |
| --- | --- | --- |
| `classic` | Kebun hijau, apel merah dan kupu-kupu kecil | `public/assets/game/bg-classic.webp` dan `bg-classic-m.webp` |
| `classicnight` | Kebun malam biru, bulan dan kunang-kunang | `public/assets/game/bg-classicnight.webp` dan `bg-classicnight-m.webp` |
| `portal` | Kebun ungu, satu gerbang portal | `public/assets/game/bg-portal.webp` dan `bg-portal-m.webp` |
| `timeattack` | Kebun hangat, jam pasir | `public/assets/game/bg-timeattack.webp` dan `bg-timeattack-m.webp` |
| `mayhem` | Kebun oranye, apel spesial dan bom kecil | `public/assets/game/bg-mayhem.webp` dan `bg-mayhem-m.webp` |
| `mayhemplus` | Oranye-koral, kekacauan lebih kuat namun tetap ramah | `public/assets/game/bg-mayhemplus.webp` dan `bg-mayhemplus-m.webp` |
| `mayhemhard` | Warna amber, tanda tantangan | `public/assets/game/bg-mayhemhard.webp` dan `bg-mayhemhard-m.webp` |
| `impossible` | Kebun merah gelap, suasana tantangan ekstrem | `public/assets/game/bg-impossible.webp` dan `bg-impossible-m.webp` |
| `multiplayer` | Dua ular hijau dan teal, apel untuk diperebutkan | `public/assets/game/bg-multiplayer.webp` dan `bg-multiplayer-m.webp` |
| `mayhemduo` | Dua ular, bom dan apel spesial | `public/assets/game/bg-mayhemduo.webp` dan `bg-mayhemduo-m.webp` |
| `puzzle` | Pintu kayu dengan lubang kunci, kunci emas di tanah, ular tanpa tangan | `public/assets/game/bg-puzzle.webp` dan `bg-puzzle-m.webp` |
| `delivery` | Paket apel dan kotak pengantaran | `public/assets/game/bg-delivery.webp` dan `bg-delivery-m.webp` |
| `roguelite` | Ransel cokelat dan peta gulung | `public/assets/game/bg-roguelite.webp` dan `bg-roguelite-m.webp` |
| `boss` | Ular hijau dan kumbang emas ramah | `public/assets/game/bg-boss.webp` dan `bg-boss-m.webp` |
| `territory` | Dua ular di petak hijau/teal dengan bendera daun | `public/assets/game/bg-territory.webp` dan `bg-territory-m.webp` |

#### Prompt maskot dan item

Setiap prompt menghasilkan satu gambar, bukan lembar sprite. Semua dipakai dari `public/assets/game/{nama}.png`.

##### mascot-idle

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green snake from reference, coiled upright, friendly closed-mouth smile, curious black eyes, cream belly, coral cheeks. NO arms, legs, hands. No props. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

##### mascot-win

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, joyful closed crescent eyes and happy open smile, three small gold celebratory stars above head. No limbs. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

##### mascot-sick

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, queasy expression half closed eyes, tiny purple bubble above head, still cute not scary. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

##### mascot-shock

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, round surprised eyes and small O mouth, two short orange surprise marks above head. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

##### apple-normal

```text
One isolated coral-red apple with a small green leaf and thick dark olive outline; same shape and shading as apple-big. No plus sign, no face, no snake, no mascot, no scenery. Centered, fully visible, transparent background. Readable at 24 pixels.
```

##### mascot-dizzy

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, small spiral eyes, two little yellow stars above head, harmless dizzy expression. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

##### apple-big

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE large golden yellow apple with green leaf and bold simple PLUS symbol on center, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-poison

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE purple apple with green leaf and bold simple skull symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-dark

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE dark navy apple with green leaf and bold simple cream crescent moon centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-lucky

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE pink apple with green leaf and bold simple four leaf clover symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-teleport

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE cyan apple with green leaf and bold simple spiral symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-bomb

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE orange-red apple with green leaf and bold simple bomb symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### apple-time

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE cyan-green apple with green leaf and bold simple clock symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### bomb

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE round charcoal cartoon bomb with a short curved fuse and tiny orange spark. Friendly cartoon style. Clear silhouette. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

##### portal

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE thick purple oval magical portal ring seen upright, cyan inner edge, transparent center, two tiny simple sparkles. No base, no scenery. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

#### Pembaruan berikutnya

Pertahankan nama file dan alpha PNG supaya kontrak renderer tidak berubah. Periksa item pada ukuran 24 px, maskot pada 64–120 px, dan seluruh scene pada HP. Penggantian aset tidak memerlukan perubahan aturan engine.

</details>

### Catatan teknis tahap 1–9

<a id="doc-docs-tahap-1-2"></a>
<details>
<summary><strong>Tahap 1-2</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-1-2.md.

### Tahap 1–2: Stabilisasi engine

Cakupan: lifecycle eksplisit, jam & RNG injeksi, perbaikan P0/P1/P2 dari audit. Tidak ada mode baru, tampilan lama utuh.

#### API engine (`createSnakeGame`)
`startRun` · `pauseRun(reason)` · `resumeRun` · `releasePause(reason)` · `togglePause` · `returnToMenu` · `setDir` · `setDirMP` · `getState` · `destroy`.
State: `menu | playing | paused | won | lost`. `startRun` hanya berhasil dari `menu/won/lost` (tidak lagi toggle pause).
Opsi injeksi: `rng`, `now`, `inspect` (hook test; tidak dipakai di produksi).

#### Aturan yang diputuskan (D1–D6)
- **Ekor:** boleh masuk sel ekor bila ular tidak tumbuh di langkah itu (single & 2P).
- **Apel besar:** teks bantuan Classic/Portal/Time Attack/Malam dikoreksi (apel besar memang tidak pernah muncul di sana). Balance tidak berubah.
- **Pause:** alasan `user | help | hidden | orientation`. Bantuan/tab/orientasi menjeda; melepasnya TIDAK melanjutkan. Lanjut = Lanjut / Esc / tombol Jeda / arah (selama tidak ada penghalang). Tombol Jeda ikon di HUD sentuh.
- **2P:** tick transaksional (snapshot → collision bersama → commit → hasil sekali). Tembus 50 bersamaan: skor lebih tinggi menang, sama = seri. Respawn mencari 3 sel lurus yang bebas; retry terbatas.
- **Arena Sempit non-hard:** tetap instan (identitas mode); makanan pengganti kini dipilih di dalam arena baru.
- **Waktu:** semua deadline gameplay memakai jam simulasi yang membeku saat pause. Langkah game dijadwalkan dari RAF terhadap jam itu (tanpa `setInterval`).
- **Storage:** nilai divalidasi (allowlist); skor terbaik disimpan saat ronde selesai, bukan tiap apel.

#### Bug → test
| Temuan | Test |
|---|---|
| Efek habis setelah game over menghidupkan tick | `P0: efek yang habis SETELAH game over…` |
| `spawnFood` hang di papan penuh | `P0: spawnFood di papan penuh…` |
| 2P hasil ganda / pemenang bergantung urutan | `P0: kematian serentak…`, `P0: dua pemain tembus 50…` |
| Efek/makanan/ranjau jalan saat pause | `P1: pause membekukan…` |
| Time Attack resume via arah | `P1: Time Attack — resume…`, `…berakhir tepat sekali` |
| Arah pertama hilang; antrean input | `P1: arah pertama…`, `P1: dua input cepat…` |
| Aturan ekor | `P1: masuk sel ekor…` |
| Shrink: makanan di luar arena | `P1: shrink biasa…` |
| Spawn menimpa tubuh/ranjau; respawn 2P | `P1: spawn tidak menimpa…`, `P1: respawn 2P aman…` |
| `snake_best` rusak → NaN | `P1: best rusak…`, `storage: …` |
| PLAY terlambat menjeda ronde; alasan pause | `lifecycle: …` |
| Interval vs interpolasi; timer HUD per frame | `interval langkah…`, `HUD: timer…` |
| Regresi 10 mode | `fuzz <mode>` ×10 |

#### Menjalankan test
`npm test` (Node ≥ 20, tanpa dependensi tambahan). Helper menyalin `lib/` ke `node_modules/.cache/snake-tests` sebagai `.mjs`.

#### Belum diverifikasi di browser
Dark veil (layer offscreen), garis tubuh 2P saat wrap, tombol Jeda & fokus dialog, swipe, `visibilitychange`/`blur`, tampilan di viewport nyata. Lihat laporan checkpoint.

</details>

<a id="doc-docs-tahap-3"></a>
<details>
<summary><strong>Tahap 3</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-3.md.

### Tahap 3: Registry mode + Puzzle "Jejak Kunci"

#### Cakupan
- **Registry mode** (`lib/modes/registry.js`): satu sumber untuk id stabil, label, grup, jumlah pemain, dukungan sentuh, deskripsi, kontrol, jenis kecepatan (`pref | locked | pref+duration | none`), dan kondisi selesai. Sepuluh mode lama didaftarkan sebagai adapter (`kind: 'arcade'`); perilakunya tidak berubah. Menu membaca grup, sub-mode, dan deskripsi dari registry.
- **Puzzle** sebagai mode mandiri (`kind: 'puzzle'`, grup `adventure`) dengan lima level buatan tangan.
- **Menu "Petualangan"** (keputusan D5): tombol terpisah di layar arkade → layar mode petualangan dengan tombol **Kembali** (kembali ke mode arkade sebelumnya). Layar tiga grup lama tidak diubah.

#### Arsitektur (empat tanggung jawab terpisah)
| Tanggung jawab | Berkas |
|---|---|
| Simulasi (murni; tanpa React/GSAP/storage/jam/RNG) | `lib/puzzle/sim.js` |
| Data level | `lib/puzzle/levels.js` |
| Lifecycle/state + progres + emit ke UI | `lib/puzzle/controller.js`, `lib/progress.js` |
| Render Canvas | `lib/puzzle/render.js` |

`GameCanvas` memilih controller menurut `kindOf(mode)`: `createSnakeGame` (arkade) atau `createPuzzleGame` (puzzle). API lifecycle keduanya sama (`startRun/pauseRun/resumeRun/releasePause/togglePause/returnToMenu/setDir/destroy`).

#### Aturan Puzzle
Urutan evaluasi satu langkah (juga tertulis di `sim.js`):
1. Level sudah selesai → tolak. 2. Berbalik ke leher → tolak. 3. Luar papan/tembok → tolak.
4. Portal: masuk salah satu ujung pasangan = kepala muncul di ujung satunya (**dua arah**; berbeda dari mode Portal lama yang membungkus tepi papan).
5. Tumbuh? (ada makanan di sel tujuan) menentukan nasib ekor: tumbuh → ekor tetap; tidak → ekor dilepas di langkah yang sama.
6. Tabrak tubuh pada okupansi akhir → tolak.
7. Pintu keluar: syarat diperiksa pada **okupansi akhir langkah itu** — kunci yang dipegang ≥ syarat, dan semua plate syarat tertutup tubuh/kepala setelah bergerak.
8. Commit: langkah+1, ambil makanan/kunci, status `won` bila masuk pintu.

- Gerakan yang ditolak **tidak** memakai langkah, tidak masuk riwayat undo, dan tidak mengubah state (puzzle tidak bisa "kalah").
- Satu input valid = satu langkah; tidak ada gerak otomatis dan tidak ada waktu.
- **Undo** satu langkah, dapat diulang sampai awal, memulihkan state persis. **Ulang level** (R) kembali ke awal.
- Level selesai dicatat **sekali per percobaan**; input dan undo setelah menang diabaikan.
- Input arah **tidak** memulai ronde dari menu/hasil dan tidak melanjutkan dari jeda (hanya tombol PLAY/Lanjut, agar tekanan arah tidak melempar pemain ke level lain). Satu gesekan layar = satu langkah.
- Keputusan lingkup MVP: hanya satu jenis pintu (pintu keluar) yang bisa mensyaratkan beberapa plate sekaligus; tidak ada gerbang perantara.

#### Level (par = optimum BFS, diverifikasi test)
| # | Nama | Par | Mekanik yang terbukti dibutuhkan (ablasi) |
|---|---|---|---|
| 1 | Kunci dan Pintu | 15 | kunci (tanpa syarat kunci: 3 langkah) |
| 2 | Panjang Tubuh | 16 | makanan (tanpa: tak solvable), plate (tanpa syarat: 10) |
| 3 | Dua Plate | 13 | makanan (tanpa: tak solvable), dua plate (tanpa syarat: 9) |
| 4 | Portal Berpasangan | 6 | portal (tanpa portal: tak solvable) |
| 5 | Ekspedisi Kecil | 19 | makanan, portal (tak solvable tanpa), kunci (7), plate (13) |

Format level: peta ASCII (`#` tembok, `.` lantai, `F` makanan, `K` kunci, `E` pintu, `a`–`c` plate, `1`–`3` pasangan portal) + `snake` (kepala dulu), `dir`, `exit: { keys, plates }`, `par`. Level tidak valid **ditolak** oleh `buildLevel`/`loadLevels` (validator memeriksa ukuran, tembok, kontiguitas ular, arah, tumpang tindih objek, portal harus berpasangan, syarat pintu, par). Tidak ada generator acak.

#### Penyimpanan
Key baru `snake-progress-v1` (JSON ber-versi: `{ v: 1, puzzle: { levels: { "<id>": { best } } } }`). Dibaca lewat `parseProgress` (versi asing/rusak → kosong; id/angka liar dibersihkan). Ditulis hanya saat level selesai. Rekor = langkah minimum; replay lebih panjang tidak merusaknya. Level terbuka bila **semua** level sebelumnya selesai. Key lama (`snake_best`, `snake-speed`, `snake-ta`, `snake-lefty`) tidak disentuh.

#### Kontrol
Panah / WASD / geser layar / DPad = satu langkah · **Z** (atau tombol Undo) = undo · **R** (atau tombol Ulang) = ulang level · Esc / tombol Jeda = jeda · Bantuan menjeda.

#### Visual & aksesibilitas
Canvas 2D sederhana tanpa aset baru. Status terbaca tanpa warna: pintu terkunci = gembok, terbuka = panah; plate = huruf A/B/C, putus-putus saat kosong, lencana "A✓" di atas ular saat tertahan; portal = angka + jumlah cincin; kunci = glyph kunci. HUD memuat level, langkah/par, kunci, plate, dan pesan (live region). Latar menu memakai **fallback gradien CSS** (`.bgimg-puzzle`) — belum ada aset gambar final.

#### Perbaikan bug yang ditemukan di tahap ini
- Tahap 1: `killVisualTweens` tidak mereset posisi canvas DOM, sehingga restart saat guncangan bisa menyisakan geseran.
- Integrasi: engine arkade baru (setelah Puzzle) kembali ke kecepatan default; kini preferensi diterapkan saat engine dibuat.
- `bgFiles()` akan melempar untuk mode tanpa aset gambar; kini aman.
- Aturan level terbuka diperketat menjadi rantai penuh.

#### Test
`npm test` (95 test). Puzzle: lima solusi beku diputar ulang, par = optimum BFS, ablasi mekanik, aturan langkah (ekor, plate pada okupansi akhir, portal dua arah, tabrak tubuh), undo persis untuk semua level, validasi 15 jenis level invalid, kemurnian (state beku), progres, controller (lifecycle, selesai sekali, rekor), konsistensi registry ↔ constants/tema/ikon/CSS.

#### Belum diverifikasi
Perilaku di browser nyata: klik/keyboard/swipe pada layar Petualangan, tampilan menu & HUD di 360/390/768/1366 px dan landscape HP, fokus keyboard pada layar hasil, transisi scene ke mode baru, dan pergantian controller arkade ↔ puzzle di React. Yang sudah diperiksa: render SSR komponen baru (18 pemeriksaan markup) dan gambar Canvas level lewat renderer asli.

</details>

<a id="doc-docs-tahap-4"></a>
<details>
<summary><strong>Tahap 4</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-4.md.

### Tahap 4: Delivery "Kurir Apel" + perbaikan dari uji coba

#### A. Perbaikan dari uji coba di browser
| Keluhan | Penyebab | Perbaikan |
|---|---|---|
| Ular Puzzle kaku | Posisi melompat antar-sel tanpa interpolasi | Tiap segmen meluncur (120 ms, ease-out), tikungan dibulatkan, efek pop (makan/kunci) dan riak (portal), undo ikut meluncur. Loop RAF hanya hidup selama animasi. Menghormati `prefers-reduced-motion`. Simulasi tetap berbasis langkah. |
| Suara "eits" tidak cocok | Gerakan tertahan memakai suara peringatan bahaya padahal Puzzle tidak bisa mati | Bunyi sintetis lembut: tumbukan (`playBump`), pintu terkunci (`playLocked`), menang (`playWin`). Berbalik arah senyap. "Eits" tidak lagi dipakai di Puzzle. |
| Latar mode baru "polos" | Hanya gradien CSS cadangan (tidak ada ilustrasi) | Ilustrasi SVG buatan sendiri: `bg-puzzle.svg` (aula dungeon) dan `bg-delivery.svg` (jalan kota senja). Gradien tetap sebagai cadangan. |
| Arena Sempit tanpa animasi | Di mode non-Hard `bi = 3` instan | Semua mode Mayhem: menyempit **1 ubin demi 1 ubin** (`SHRINK.tileMs` = 1,5 dtk/ubin, ring merah sebagai peringatan), bertahan **15 dtk** (`EFFECTS.shrink.dur`, tidak termasuk animasi), lalu melebar. HUD hanya menghitung lama bertahan. Makanan di luar arena dipindah tiap ubin menutup. |

Catatan: durasi 15 dtk kuambil dari ceritamu; kalau di salinan lokalmu sudah kamu ubah, nilainya kini ada di `lib/constants.js`. Mode Hard/Impossible kini memakai mekanisme yang sama (sebelumnya menyempit linear selama 0,85 × durasi), jadi perilakunya berubah di sana.

#### B. Delivery
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

#### C. Test (134 → lihat `npm test`)
Delivery: arena valid/invalid, 200 seed spawn pickup, kelayakan deadline (semua sel × tipe × interval), pickup, **kapasitas penuh**, antar tertua-dulu dan **dua paket identik**, **posisi ekor setelah kargo dihapus**, basi (batas deadline, skor min 0), pengantaran vs basi pada t yang sama, **pengantaran di detik terakhir**, **pause tidak membasikan paket**, hasil/penyimpanan sekali, rekor per konfigurasi, fuzz sim 60 seed × 2500 langkah dan fuzz controller. Mutasi (6) pada aturan inti tertangkap semua.
Puzzle: interpolasi (`animatedPoints`), jalur halus, loop animasi berhenti sendiri, suara tanpa eits.
Mayhem: shrink bertahap (ubin ke-1/2/3, bertahan 15 dtk, melebar), relokasi makanan, HUD.

#### D. Belum diverifikasi di browser
Rasa gerak (kecepatan Delivery, durasi luncur Puzzle 120 ms, kecepatan shrink 1,5 dtk/ubin), keseimbangan (umur paket, target 5 dalam 120 dtk, jarak pickup), kenyaringan bunyi sintetis, tampilan di viewport kecil/landscape HP, dan pergantian controller antar-mode di React. Yang sudah diperiksa: SSR markup menu/HUD, gambar Canvas arena Delivery dan level Puzzle, serta kedua ilustrasi latar lewat renderer SVG.

</details>

<a id="doc-docs-tahap-5"></a>
<details>
<summary><strong>Tahap 5</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-5.md.

> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](#doc-adventure-revision).

### Tahap 5: Roguelite "Ekspedisi Mayhem"

#### Alur run
Satu run = **5 ronde pendek**. Tiap ronde punya target poin (28, 40, 52, 64, 76). Begitu target tercapai, simulasi **dibekukan** dan muncul menu: pilih **1 dari 3 upgrade**. Setelah ronde 5 tuntas run **menang** (tanpa menu upgrade). Menabrak = run **kalah**; upgrade **tidak** dibawa ke run baru. Run yang sedang berjalan tidak disimpan (hanya rekor saat run selesai). Lima ronde bisa diselesaikan tanpa boss.

Ronde baru: arena, posisi, dan panjang awal di-reset; efek sementara dibuang; perisai/penawar diisi ulang; **upgrade dan total skor dibawa**. Tiap ronde menunggu **arah pertama** pemain (tidak ada timer yang menyerang saat menu upgrade baru ditutup); menekan arah yang sama dengan hadap awal (kanan) memulai ronde, berbalik arah diabaikan.

#### Isi ronde
Arena 17×15, tembok luar mematikan. 3 apel aktif: **normal +4**, **besar +10**, **racun −6 (dan ekor −2)**, **keberuntungan +4 + efek sementara**. Ranjau mematikan (2/3/4/4/5 per ronde, ≥ 4 sel dari kepala, tidak di lajur depan kepala). Efek (6 dtk dasar): **menguntungkan** Waktu Melambat (interval ×1,5), Skor Ganda (×2); **merugikan** Terburu-buru (interval ×0,7), Kontrol Terbalik. Peluang efek merugikan dasar 50%. Bentuk apel dibedakan selain warna (apel, apel bercincin emas, apel bersilang, bintang "?").

#### Upgrade (semua angka = parameter awal, balance belum teruji main)
| Upgrade | Manfaat | Harga | Maks |
|---|---|---|---|
| Tubuh ringkas | panjang awal −1/tingkat (min 3) | nilai apel normal ×0,8/tingkat | 2 |
| Langkah berani | skor semua apel ×1,25/tingkat | interval ×0,9/tingkat (min 70 ms) | 2 |
| Kulit tebal | menahan 1 tabrakan per ronde/tingkat | skor semua apel ×0,85/tingkat | 2 |
| Racikan penawar | meniadakan 1 racun pertama per ronde/tingkat | nilai apel besar ×0,8/tingkat | 2 |
| Bekal manis | apel besar ×1,5 lebih sering/tingkat | ranjau +2/ronde dan efek merugikan +15%/tingkat | 2 |
| Napas panjang | efek menguntungkan ×1,4 lebih lama/tingkat | efek merugikan juga ×1,4 | 2 |

**Stacking:** pengali multiplikatif (faktor^n), hitungan aditif. **Urutan nilai apel:** dasar → pengali jenis → pengali skor global → Skor Ganda → round → clamp ≥ 1; racun tetap −6. **Clamp:** panjang awal ≥ 3, interval 70–300 ms, durasi efek ≤ 20 dtk, peluang merugikan ≤ 80%, ranjau ≤ 10. **Kombinasi terlarang:** upgrade tidak ditawarkan bila membuat apel normal (tanpa efek) < 3 poin (mis. Tubuh ringkas ×2 + Kulit tebal); upgrade yang sudah maks tidak ditawarkan lagi. Penawaran: acak tanpa duplikat; bila pool < 3 yang tersedia saja yang tampil; bila kosong ronde lanjut otomatis.

**Kulit tebal saat menahan tabrakan:** dinding/tubuh → ular **berbelok** ke sisi aman (kiri relatif dulu, lalu kanan; hanya ke sel tanpa dinding/tubuh/ranjau); bila buntu → **direlokasi** ke garis lurus bebas (kepala tidak pernah di dalam tembok); ranjau → hancur dan ular lanjut. Tanpa perisai = ronde gagal.

#### Menu upgrade
Dialog modal: fokus pindah ke kartu pertama dan terkunci di dalam dialog (Tab/panah berputar), tombol **1–3** memilih langsung, Esc tidak menutup (wajib memilih). Tiap kartu menulis **Manfaat** dan **Harga**, tingkat, dan nama beraria. Setelah satu pilihan semua kartu dinonaktifkan; controller menolak pilihan kedua. Selama menu terbuka ular, jam, efek, dan RNG tidak berubah; input gameplay, pause, dan bantuan tidak berpengaruh.

#### Determinisme
Satu aliran RNG per run (`seed`): spawn apel/ranjau, efek keberuntungan, dan penawaran upgrade. Seed + input + pilihan sama = run identik (diuji; seed berbeda menghasilkan run berbeda).

#### Penyimpanan
`snake-records-v1`, kunci `roguelite|rounds:5|speed:<pref>`: skor total terbaik, ronde tertinggi, jumlah run, run tuntas. Disimpan sekali per run. Skema rekor diperluas **kompatibel ke belakang** (`bestRounds` opsional; entri Delivery lama tetap valid).

#### Arsitektur
`lib/roguelite/upgrades.js` (data + kalkulasi murni) · `sim.js` (satu ronde, murni) · `controller.js` (run, lifecycle, jam, upgrade, rekor) · `render.js` · `components/UpgradeDialog.jsx`.

#### Test (`npm test`, 156)
Stacking nilai pasti 0/1/2 tingkat, urutan kalkulasi, clamp, **properti kombinasi terlarang** (eksplorasi semua build sah sampai 4 pengambilan: apel normal tidak pernah < 3), penawaran (tanpa duplikat/capped, deterministik, pool < 3, kosong), arena valid (200 seed), makan/racun/penawar/efek, tabrakan, **perisai** (belok aman, relokasi, ranjau, properti 150 seed: kepala selalu valid), alur run lengkap 5 ronde, **menu upgrade membeku** (termasuk RNG dan emisi), klik ganda hanya satu, kematian dan upgrade tidak terbawa, determinisme, fuzz controller, rekor. Mutasi (6 + 1 diperketat) tertangkap semua.

#### Bug yang ditemukan saat menulis tahap ini
Menekan arah yang sama dengan hadap awal diabaikan sebagai duplikat sehingga ronde tidak pernah mulai (ditemukan test controller; diperbaiki). Impor ikon `Zap` ganda ditangkap test sebelum build.

#### Belum diverifikasi di browser
**Balance** (target 28→76, nilai apel, 2 tingkat/upgrade, peluang efek, jumlah ranjau, interval) — semua angka awal; rasa gerak; dialog upgrade di layar kecil/landscape HP dan navigasi keyboard/pembaca layar nyata; fokus kembali ke canvas sesudah memilih. Yang sudah diperiksa: SSR markup menu/HUD/dialog (20 pemeriksaan), gambar Canvas arena dan latar lewat renderer.

</details>

<a id="doc-docs-tahap-6"></a>
<details>
<summary><strong>Tahap 6</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-6.md.

### Tahap 6: Territory "Rebut Arena" + tata letak info dua kolom untuk laptop

#### A. Perubahan tampilan (dari umpan balik)
| Keluhan | Perbaikan |
|---|---|
| Layar Petualangan di laptop: satu kolom panjang, perlu scroll di dalam kanvas ("dipaksa") | Di lebar viewport >= 640 px (bukan panel samping HP) info dibagi **dua kolom**: kiri = deskripsi, tujuan, pratinjau aturan; kanan = pengaturan (level / durasi / kecepatan / rekor), kontrol, tombol PLAY. Layar sempit tetap satu kolom. |
| Kartu HUD Delivery/Ekspedisi: statistik bertumpuk dengan ruang kosong di kanan | `.hud-cols`: dua kolom (statistik + slot | pesanan/upgrade + pesan) pada lebar >= 640 px. HUD panel samping HP tidak berubah. |
| 4 mode Petualangan tidak muat 3 kolom | Jumlah kolom dari CSS (`data-n`), bukan gaya inline, sehingga aturan responsif tetap berlaku. |

#### B. Rebut Arena (Territory, 2P lokal keyboard)
**Alur:** P1 Panah, P2 WASD. Keluar dari wilayahmu = menggambar jejak; kembali ke wilayahmu menutup jejak dan merebut area yang terkurung. Arena 24x21 dengan 9 petak dinding (simetris; dinding bukan wilayah dan tidak masuk penyebut). Basis awal 3x3. Durasi **90 dtk (tetap)**, target **60%**, **3 nyawa** per pemain. Kecepatan: chip Santai/Normal/Ngebut/Konstan (interval tick 200/150/110/150 ms). Tidak tersedia di layar sentuh (disembunyikan, dengan catatan alasannya).

**Urutan satu tick** (semua keputusan dari snapshot awal tick; hasil tidak bergantung urutan P1/P2 — diuji dengan cermin):
1. arah baru (berbalik arah diabaikan) -> 2. niat posisi -> 3. kematian -> 4. penutupan jalur -> 5. klaim (flood fill) -> 6. commit -> 7. respawn -> 8. hasil.

**Kematian (kehilangan 1 nyawa):** keluar papan / dinding; menabrak jejak sendiri; **jejakmu diinjak kepala lawan** (pemilik jejak yang kalah, penyerang selamat); **head-on** dan **tukar kepala** (keduanya). Mati menghapus jejak, wilayah lama dipertahankan, respawn di sel aman wilayah sendiri (terdekat dari titik awal, jauh >= 2 dari kepala lawan, arah keluar valid). Wilayah habis: **base darurat 3x3** terdekat dari titik awal, boleh mengambil sel lawan tetapi tidak menyentuh jejak/kepala lawan; cadangan terakhir 1x1.

**Klaim:** batas = wilayah sendiri + jejak sendiri + dinding; sel yang masih terhubung ke tepi papan lewat sel bebas = "luar". Yang terkurung + jejak menjadi milik penutup (termasuk wilayah lawan yang terkurung = reclaim). Jejak lawan yang **masih hidup** dan terkurung **tidak** diklaim dan **tidak** dipotong (hanya kepala yang memutus jejak). **Kematian mengalahkan klaim** pada tick yang sama. **Dua klaim serentak:** petak yang diklaim keduanya tetap pada pemilik sebelumnya (netral tetap netral); petak yang tidak disengketakan tetap direbut. Invarian: kepala yang berdiri di sel yang baru direbut lawan memulai jejak baru dari sel itu.

**Batasan yang disengaja:** area yang hanya berbatas **tepi papan** tidak direbut (aturan "terhubung ke tepi luar" dari spesifikasi); untuk merebut area di tepi, susuri tepi dengan jejakmu. Ini keputusan desain, bukan bug; mudah diubah di `claimCells` bila tidak disukai.

**Hasil (prioritas):** nyawa habis (keduanya serentak = seri; satu = lawan menang) > mencapai 60% > waktu habis (wilayah terbanyak; sama = seri). Dua pemain tidak mungkin mencapai 60% serentak (jumlah <= 100%). Tick yang jatuh tepat di akhir waktu diproses **sebelum** hasil waktu dievaluasi. Hasil, suara akhir, dan rekor terjadi **sekali**.

**Rekor** (`snake-records-v1`, kunci `territory|match:90|target:60|speed:<pref>`): wilayah tertinggi, jumlah main, kemenangan P1/P2, seri. Skema diperluas kompatibel ke belakang (`p1Wins/p2Wins/draws` opsional; entri mode lain tidak berubah bentuk).

**Aksesibilitas:** P1 = titik + angka "1" + garis tegas; P2 = garis diagonal + angka "2" + garis putus-putus (tidak hanya warna). Kilatan klaim sekali 350 ms dan mati bila `prefers-reduced-motion`. HUD: waktu, target, persen + bilah + nyawa per pemain (kartu dua kolom), pesan `aria-live`. HUD hanya diperbarui saat detik berganti atau ada event (bukan tiap frame).

**Arsitektur:** `lib/territory/sim.js` (murni) · `controller.js` (lifecycle, jam simulasi, tick bersama, antrean input per pemain) · `render.js` · registry `kind: 'territory'` (`needsKeyboard`, `isTwoPlayer`).

#### C. Test (`npm test`, 191)
Arena valid/invalid; basis awal; jejak; klaim loop, bentuk persegi, jalur terbuka; area berbatas tepi atas **dan** kiri; kematian tepi/dinding/jejak sendiri; berbalik arah; jejak diinjak; head-on & tukar kepala; cermin P1<->P2; **death+claim serentak**; **dua klaim serentak** (petak sengketa netral); reclaim + jejak lawan tidak dipotong; **properti 60 permainan acak** (jumlah <= ownable, invarian jejak/kepala/dinding); hasil seri/menang/sekali; target; waktu habis; respawn biasa dan base darurat; flood fill 80x80 < 500 ms; determinisme; rekor; controller (PLAY sekali, pause membeku, hasil + rekor sekali, destroy).
Mutasi (9) tertangkap semua setelah dua test tepi ditambahkan: aturan sengketa, kematian mengalahkan klaim, pengecualian jejak hidup, injak-jejak, dinding, target, seed tepi atas/kiri-kanan.

#### D. Belum diverifikasi di browser
Rasa gerak dan **balance** (60%, 90 dtk, interval, ukuran arena 24x21, jumlah dinding); tata letak dua kolom di lebar nyata laptop (hanya markup SSR dan CSS yang diperiksa, belum screenshot); fokus keyboard dua pemain dengan tombol bersamaan (keyboard ghosting pada beberapa keyboard membatasi tombol serempak); `prefers-reduced-motion` nyata. Bot satu pemain tidak dibuat (pengayaan opsional).

</details>

<a id="doc-docs-tahap-7"></a>
<details>
<summary><strong>Tahap 7</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-7.md.

### Tahap 7: Boss Battle "Penjaga Kebun"

Satu boss, 3 fase, 3 pola serangan, 1 pemain (sentuh + keyboard). Aturan lengkap ada di komentar kepala `lib/boss/sim.js`.

#### Aturan
- Arena 17x15; area boss 5x3 di tengah atas = terlarang (menabraknya = kehilangan nyawa, seperti tepi).
- Boss 3 HP (= 3 fase), pemain 3 nyawa. Apel energi: +1 energi (maks 6), +1 segmen. **Satu pukulan = 3 energi**, tubuh memendek 3 segmen (min 3).
- **Siklus per fase:** jeda 1,5 dtk -> serangan (peringatan -> aktif -> pemulihan) -> **jendela titik lemah** terbuka -> jeda. Serangan dan jendela tidak pernah bersamaan, jadi titik lemah selalu terjangkau.
- **Pukulan:** kepala MASUK tile titik lemah saat jendela terbuka, energi >= 3, dan jendela itu belum kena. Satu jendela = satu pukulan (bukan per frame). Tile terkunci atau energi kurang = hanya dilalui.
- **Transisi:** setelah pukulan non-final semua ancaman dibersihkan, titik lemah terkunci 2,5 dtk; fase baru baru aktif setelah transisi, lalu jeda sebelum serangan.
- **Mati:** -1 nyawa; respawn 3 segmen lurus di tempat aman (bukan di boss/bahaya/apel), ancaman radius 3 dibersihkan, **kebal bahaya 2,5 dtk** (waktu simulasi, cincin putus-putus di kepala). Energi dipertahankan, panjang reset ke 3. Tepi/area boss/tubuh tetap mematikan saat kebal.
- **Prioritas:** pukulan final + bahaya pada tick yang sama = **menang**. Pukulan non-final + mati pada tick yang sama = keduanya berlaku.
- Bahaya hanya mengenai **kepala yang masuk** sel bahaya aktif ("dinilai saat masuk"); tubuh tidak mati oleh bahaya. Tubuh tetap tantangan lewat tabrakan diri dan panjang akibat apel.

#### Tiga pola (tiap pola: peringatan -> aktif -> pemulihan)
| Pola | Fase | Peringatan (min) | Aktif | Keadilan |
|---|---|---|---|---|
| Baris berbahaya | 1-3 | 1,6 dtk | 0,8 dtk | satu baris penuh di luar area boss; peringatan >= (1+3 langkah) x interval + 0,6 dtk; baris yang menjebak kepala dihindari |
| Ranjau kebun | 2-3 (5 / 7 ranjau) | 2,0 dtk | 4,5 dtk | tidak di kepala/depan kepala (jarak >= 3), tubuh, apel, titik lemah, area boss; >= 70% sel bebas tetap terjangkau (maks 12 percobaan) |
| Koridor menyempit | 3 | 2,5 dtk (naik sesuai rute) | 2,5 dtk | koridor 3 kolom yang TERJANGKAU lewat BFS; peringatan >= (langkah + 3) x interval + 0,6 dtk, maks 5 dtk |
Pola tidak valid (koridor terlalu jauh, ranjau mustahil) -> **fallback baris**.

#### Tampilan & aksesibilitas
Peringatan = arsir + garis putus-putus; aktif = merah gelap + **X** (baris/koridor) atau **bom** (ranjau); koridor aman = bingkai hijau putus-putus + "AMAN"; titik lemah terkunci = abu-abu + gembok, terbuka = biru + bintang + "LEMAH". **Tidak ada kedipan**; peringatan menebal pelan, statis bila `prefers-reduced-motion`. HUD: HP boss, fase, nyawa, bilah energi (`progressbar`), status titik lemah (teks + ikon), sisa kebal, tahap serangan, pesan `aria-live`; HUD dikirim hanya saat tampilannya berubah. Menu: tanpa batas waktu (bukan chip palsu), chip kecepatan berlaku, rekor.

#### Rekor
`boss|hp:3|lives:3|speed:<pref>` di `snake-records-v1`: kerusakan boss terbesar, menang/main, **kemenangan tercepat** (`bestSecs`, opsional, kompatibel ke belakang). Disimpan sekali per run.

#### Test (`npm test`, 216; +25)
Arena valid/invalid; penjadwal (tahap, ketepatan waktu, idempoten); serangan tidak bersamaan dengan jendela; pukulan sekali per jendela, terkunci/energi kurang, energi menyusul; shrink tubuh; transisi fase; menang sekali + prioritas menang; pukulan+mati serentak; kematian 4 sebab; respawn aman + pembersihan radius + kebal; nyawa habis sekali; apel/energi; baris/ranjau/koridor (properti 60 seed) dan fallback; **pause di tengah peringatan**; restart tidak membawa serangan lama; HUD tidak dikirim tiap frame; determinisme; properti 80 permainan acak; rekor; registry/ikon/aset.
**Mutasi:** 15 perusakan aturan inti tertangkap (satu lolos awalnya: pemendekan tubuh, test diperketat; satu mutan tidak berarti diabaikan).

#### Belum diverifikasi
Di browser: rasa gerak, **balance** (semua angka di `DEFAULT_CONFIG`: peringatan, 3 energi per pukulan, jumlah ranjau, 2,5 dtk kebal), keterbacaan arsir/X/bom di sel 40 px dan layar kecil, geser layar di HP, suara. Boss tidak punya batas waktu; belum ada integrasi boss ke Roguelite (pengayaan opsional).

</details>

<a id="doc-docs-tahap-8"></a>
<details>
<summary><strong>Tahap 8</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-8.md.

### Tahap 8: Menu laptop 2 kolom + perapian akhir

Tidak ada perubahan aturan game, engine, atau balance. Hanya UI menu/header dan dokumentasi.

#### Yang berubah
- **Menu awal arkade (laptop, layar >= 640 px):** dua kolom. Kiri: pilih grup + mode + deskripsi. Kanan: kecepatan/durasi, tombol Petualangan, PLAY. Di HP, portal samping landscape, dan mode kidal tetap satu kolom seperti sebelumnya.
- **Menu Petualangan (laptop):** lima mode dalam satu baris (bukan 3+2), sehingga PLAY tidak terdorong keluar panel. Teks "Tujuan:" yang sebelumnya patah (flex) diperbaiki.
- **Header HUD saat menu awal:** kartu statistik mode (Puzzle/Delivery/Roguelite/Boss/Rebut Arena) disembunyikan selama menu awal tampil. Sebelumnya kartu itu (Waktu 1:30, P1/P2 0%, dst.) muncul di atas menu dan mendorong kanvas ke bawah. Kartu tetap tampil saat bermain dan di layar hasil.
- Berkas: `components/Overlay.jsx`, `components/Hud.jsx`, `app/page.js` (prop `hideStats`), `app/globals.css` (blok "Tahap 8").

#### Pemeriksaan (Chromium headless, emulasi viewport; bukan HP/laptop fisik)
- Overflow panel menu (`scrollHeight - clientHeight`) = 0 untuk menu arkade dan kelima mode Petualangan di 1366x768 dan 1280x720.
- Screenshot ditinjau: 1366x768, 800x600 (arkade); 1366x768 (Petualangan); 740x360 sentuh (tidak berubah).
- `npm test`: 216 lulus. `npm run build`: sukses, rute `/` 180 kB First Load JS (tidak berubah).

#### Belum diperiksa
Layar fisik (HP/laptop), 360/390/768 px untuk menu baru, 844x390 dan 640x360 landscape secara visual, kontras/fokus keyboard menu 2 kolom (urutan Tab: kolom kiri lalu kanan), rasa main dan balance semua mode baru.

</details>

<a id="doc-docs-tahap-9"></a>
<details>
<summary><strong>Tahap 9</strong></summary>

Sumber arsip sebelum penggabungan: docs/TAHAP-9.md.

> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](#doc-adventure-revision).

### Tahap 9: Jejak Kunci 50 level (buatan sistem) + rintangan, power-up, penjaga

#### Ringkas
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

#### Aturan baru (semua bergerak hanya saat pemain melangkah; tanpa jam/RNG di simulasi)
- **Duri** ditolak tanpa Perisai; Perisai terpakai dan duri hilang. **Tembok retak** sama dengan Palu. **Gerbang**: bertanda 2 terbuka bila nomor langkah yang akan diambil genap, bertanda 1 bila ganjil. Gerakan ditolak **tidak memakai langkah** (aturan lama).
- **Penjaga**: mode `idle` (diam/patroli lurus 3 sel), `chase`, `return`. Area pandang = 1..3 sel di depannya, selebar 3, terhalang tembok/retak/gerbang tertutup. Melihat kepala/tubuh ular (di luar semak) -> `chase` (1 sel per langkahmu, BFS dengan urutan tie-break tetap). **Kepala di semak** = tersembunyi -> `return`; sampai posisi awal -> `idle` lagi. Penjaga sengaja dibuat **tidak lebih cepat** dari ular dan mudah diprediksi (tanpa mode pengejar cerdas).
- **Tersengat = game over** (penjaga menyentuh sel mana pun dari ular, atau kepala masuk sel penjaga). Layar "Tersengat!" -> **Coba Lagi** (level sama dari awal) / Pilih mode. Tidak ada undo setelah kalah; progres tidak disimpan. Perisai menahan **satu** sengatan: penjaga pulang dan pingsan 3 langkah. Masuk pintu pada langkah yang sama dengan sengatan = menang.
- Level 50 selesai: "Semua Level Tamat!".

#### Generator
Papan dibagi 2-4 ruang oleh dinding pembatas; tiap pembatas punya satu penghalang wajib (celah, portal, duri, retak, gerbang); pickup yang dibutuhkan selalu di ruang sebelum penghalangnya. Solver BFS (diperluas untuk penjaga/gerbang/semak) menolak level mustahil dan menghitung par. Beberapa kandidat dibandingkan dengan kurva par target. Bila gagal: turun tier; bila tetap gagal: level cadangan. Semua dengan batas percobaan/state (tidak ada loop tanpa akhir).

#### Tampilan & aksesibilitas
Duri = segitiga, retak = blok bergaris putus + retakan, gerbang = garis + angka (terbuka = putus-putus), semak = gumpalan daun ("SEMBUNYI" saat kepala di dalamnya), Palu/Perisai = ikon + huruf P/S, penjaga = kotak bermata + panah arah dengan penanda `!` (mengejar), `?` (pulang), `zZ` (pingsan); area pandang = kotak bergaris (putus-putus = waspada, solid = mengejar). HUD: Palu, Perisai, status penjaga (teks + ikon). Menu: 50 level per halaman 10, kartu pengantar elemen baru. Bantuan (`?`) memuat aturan baru.

#### Test (`npm test`, 253)
216 lama + 24 (aturan 9a: rintangan, penjaga, semak, solver, generator) + 13 (9b: data kampanye identik dengan keluaran generator, 45 level valid + par = optimum + solusi diputar ulang menang, kurva par naik, controller: 50 level/unlock/tamat, game over sengatan satu kali + Coba Lagi, pesan rintangan, HUD).
**Browser (Chromium headless, viewport emulasi, bukan perangkat fisik):** menu 50 level tanpa overflow di 1366x768 dan 1280x720 (level 1, 13, 20, 28, 35, 50); level 20/28/35/45 dirender; permainan nyata di level 45: penjaga mengejar (`!`, HUD "MENGEJAR!"), tersengat -> "Tersengat!" -> Coba Lagi mengulang dari langkah 0; level 35 diselesaikan lewat solusi solver -> "Level Selesai!". Layar sentuh landscape 740x360 dilihat sekilas.

#### Belum diverifikasi / catatan jujur
- **Balance dan "seru"** tidak bisa dibuktikan test: par, kurva kesulitan, kerapatan musuh, dan tata letak hanya valid secara teknis (bisa diselesaikan). Perlu dimainkan; angka ada di `TIERS` dan `targetPar` (`generator.js`), lalu `npm run build:campaign`.
- Level yang sama untuk semua pemain (seed tetap); belum ada mode acak per-run.
- Hanya level 35 dan 45 yang diselesaikan/diuji lewat browser; level lain divalidasi oleh solver.
- Belum dicek: HP fisik, 360/390/768 px, suara (sengatan memakai `playDeath`, terlihat `playEits`), kontras warna area pandang di layar kecil.
- Progres lama (`jk-1..jk-5`) tetap dipakai; level 6+ memakai id `gen-N`.

</details>

### Diff kode historis

<a id="doc-dungeon-diff-per-file"></a>
<details>
<summary><strong>Diff Dungeon lengkap per file</strong></summary>

Sumber arsip sebelum penggabungan: DUNGEON_DIFF_PER_FILE.md.

### Diff per file — Dungeon, Movement & Aset

Diff dibandingkan basis ZIP terakhir (revive dan Jejak Kunci). File dokumentasi baru dibaca langsung dari ZIP; aset biner diganti sebagai WebP, bukan patch teks.

#### CHANGELOG.md

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 5a3a8c9..2a82fa4 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,6 +3,16 @@
 Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Rilis dinamai menurut **tahap kerja**, bukan nomor versi.
 Catatan tahap 0–9 di bawah adalah arsip dengan cakupan verifikasi masing-masing. Revisi terkini telah diuji di Chromium, melalui build produksi, dan dengan 285 tes otomatis; detail ada di [REVIVE_JEJAK_KUNCI.md](REVIVE_JEJAK_KUNCI.md).
 
+## Revisi — Dungeon, Movement & Aset Menu (19 Oktober 2026)
+
+- Jejak Kunci menjadi Dungeon; id mode, key progres, unlock dan saldo koin tetap kompatibel.
+- Hold keyboard/DPad memakai repeat aplikasi; arah terbaru menggantikan input lama. Keyup, jeda, blur dan perpindahan mode membersihkan hold. Repeat Esc di dialog jeda diabaikan.
+- Gerbang kampanye memakai tuas permanen. Slime 1 HP, penjaga batu 2 HP; tiga hati pemain, sasaran serangan satu giliran, heal dan combat opsional.
+- LOS mengikuti tembok/sudut, penjaga tidak menumpuk. Ruang 35–42 tepat satu musuh; 43–50 tepat dua. Semua 50 ruang punya solusi optimum yang diuji ulang.
+- Save tertunda digabungkan dengan hasil ruang berikutnya; UI memberi tombol coba simpan lagi.
+- 15 pasang scene WebP desktop/HP: Day dan cutout lama didesain ulang; Mayhem/variasi serta 2P Lokal dibersihkan area teksnya. Judul outlined tanpa bidang warna.
+- Detail aturan, batasan, diff per file dan verifikasi: [DUNGEON_REVISION.md](DUNGEON_REVISION.md).
+
 ## Revisi — Revive Ekspedisi & Jejak Kunci
 
 - Revive Ekspedisi 3 kali, kuota bersama lintas run/kecepatan; kembali penuh 72 jam setelah pemakaian pertama. Lanjut rute/fase yang sama; kebun kembali dengan 3 hati. Kuota dan hitung mundur muncul di menu/hasil.
```

#### README.md

```diff
diff --git a/README.md b/README.md
index f9be1ae..257090c 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # Snake (Next.js)
 
-Revisi terbaru: [Revive & Jejak Kunci](REVIVE_JEJAK_KUNCI.md) — revive Ekspedisi 3 kali per 72 jam, maskot satu petak, koin apel, penjaga patroli, dan objek puzzle yang lebih jelas.
+Revisi terbaru: [Dungeon, Movement & Aset Menu](DUNGEON_REVISION.md) — kontrol tahan/belok yang konsisten, tuas permanen, combat tiga hati, kampanye tervalidasi, serta latar teks transparan. Diff tersedia di [DUNGEON_DIFF_PER_FILE.md](DUNGEON_DIFF_PER_FILE.md).
 
 Revisi sebelumnya: [Petualangan & Boss](ADVENTURE_REVISION.md) — UI dua kolom, aset transparan, Ekspedisi gabungan, dan boss HP 3/5/10 dengan shield/orb.
```

#### app/globals.css

```diff
diff --git a/app/globals.css b/app/globals.css
index db7ef00..fd9edc6 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -288,3 +288,26 @@ button:active:not(:disabled) { transform:translateY(1px); }
 @media (max-width:639px) { .focus-stage .adv-modes[data-n="4"] { grid-template-columns:repeat(2,minmax(0,1fr)); } }
 .stage-side.focus-stage .adv-modes[data-n="4"] { grid-template-columns:repeat(2,minmax(0,1fr)); }
 .boss-power { padding:7px 9px; border:1px solid #a8c5c3; border-radius:9px; background:#e7efe2; }
+
+/* Status dungeon dan kegagalan simpan tetap terbaca pada layar kecil. */
+.dungeon-hearts { color:#a04444; font-weight:750; }
+.puzzle-stats [data-guard="windup"] { color:#a03c31; font-weight:750; }
+.puzzle-stats [data-guard="recover"] { color:#487043; }
+.save-notice { margin:10px 0; padding:12px; border:1px solid #c69a53; border-radius:12px; background:#fff1d6; color:#765221; font-size:12px; line-height:1.5; }
+.save-notice p { margin:0 0 8px; color:inherit; }
+.save-notice button { min-height:44px; padding:8px 12px; border:1px solid #a78240; border-radius:9px; font-weight:700; background:#fffaf0; }
+@media (min-width:640px) and (max-height:850px) {
+ .focus-header { padding-bottom:18px; }
+ .menu-hero { height:240px; }
+ .focus-stage .start-menu { padding-top:20px; }
+ .menu-footer { margin-top:16px; }
+}
+
+/* HUD dungeon lebih tinggi; papan menyesuaikan tinggi laptop dan panel HP. */
+@media (hover:hover) and (pointer:fine) {
+ .playing-stage[data-mode="puzzle"] { --gw:min(calc(100vw - 32px),640px,max(260px,calc((100dvh - 320px) * 1.13))); }
+}
+.stage-side[data-mode="puzzle"] .puzzle-legend { display:none; }
+.stage-side[data-mode="puzzle"] .puzzle-stats { font-size:11px; gap:3px 8px; }
+.stage-side[data-mode="puzzle"] { --dpad:clamp(100px,30vh,138px); }
+.stage-side[data-mode="puzzle"] .puzzle-actions button { min-height:40px; padding:5px 8px; }
```

#### app/page.js

```diff
diff --git a/app/page.js b/app/page.js
index d0c0556..c4f64b1 100644
--- a/app/page.js
+++ b/app/page.js
@@ -93,7 +93,7 @@ export default function Page() {
   function handleDpad(x, y) {
     const g = gameRef.current; if (!g) return;
     if (isTwoPlayer(mode)) g.setDirMP(0, x, y);
-    else g.setDir(x, y);
+    else g.setHeldDir(x, y);
   }
 
   return (
@@ -102,7 +102,7 @@ export default function Page() {
       {askRotate && <RotatePrompt onMenu={returnToMenu} />}
       <UpgradeDialog data={hud.roguelite} onChoose={(id) => gameRef.current && gameRef.current.chooseUpgrade(id)} />
       <HelpModal open={helpOpen} mode={mode} onClose={closeHelp} />
-      <main inert={helpOpen || askRotate || hud.roguelite?.offer?.length ? '' : undefined} aria-hidden={helpOpen || askRotate || !!hud.roguelite?.offer?.length || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${side ? 'stage-side' : ''} ${side && lefty ? 'stage-lefty' : ''} ${side && overlay.visible ? 'menu-open' : ''}`}>
+      <main data-mode={mode} inert={helpOpen || askRotate || hud.roguelite?.offer?.length ? '' : undefined} aria-hidden={helpOpen || askRotate || !!hud.roguelite?.offer?.length || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${side ? 'stage-side' : ''} ${side && lefty ? 'stage-lefty' : ''} ${side && overlay.visible ? 'menu-open' : ''}`}>
       {!menuOpen && <Hud
         side={side}
         lefty={lefty}
@@ -148,6 +148,7 @@ export default function Page() {
           onTaChange={changeDuration}
           onPlay={handlePlay}
           onRevive={() => gameRef.current && gameRef.current.reviveRun()}
+          onRetrySave={() => gameRef.current?.retrySave()}
           onMenu={returnToMenu}
           puzzleMenu={hud.puzzleMenu}
           deliveryMenu={hud.deliveryMenu}
@@ -159,7 +160,7 @@ export default function Page() {
       </div>
 
       {side && <div ref={setSideEl} className="side-menu" />}
-      {!overlay.visible && <DPad onMove={handleDpad} />}
+      {!overlay.visible && <DPad onMove={handleDpad} onRelease={() => gameRef.current?.releaseHeldDir()} />}
       {!menuOpen && !side && (mode === 'puzzle'
         ? <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD melangkah • Spasi tunggu • Z undo • R ulang • Esc jeda</div>
         : mode === 'boss'
```

#### components/BackgroundLayer.jsx

```diff
diff --git a/components/BackgroundLayer.jsx b/components/BackgroundLayer.jsx
index f2c9f58..c5645d5 100644
--- a/components/BackgroundLayer.jsx
+++ b/components/BackgroundLayer.jsx
@@ -16,7 +16,7 @@ export default function BackgroundLayer({ mode }) {
     return () => { window.removeEventListener('snake:play-punch', punch); gsap.killTweensOf(el); };
   }, []);
   const src = BG[mode] || BG.classic;
-  return <div ref={ref} className={`focus-scene ${['classicnight', 'portal', 'timeattack', 'puzzle', 'delivery', 'roguelite', 'boss', 'territory'].includes(mode) ? 'scene-cutout' : ''}`} aria-hidden="true"><picture key={mode}>
+  return <div ref={ref} className="focus-scene scene-cutout" aria-hidden="true"><picture key={mode}>
     <source media="(max-width: 768px), (pointer: coarse)" srcSet={src.replace('.webp', '-m.webp')} />
     <img src={src} alt="" width="1672" height="941" draggable={false} />
   </picture></div>;
```

#### components/DPad.jsx

```diff
diff --git a/components/DPad.jsx b/components/DPad.jsx
index 4b61c41..87f7100 100644
--- a/components/DPad.jsx
+++ b/components/DPad.jsx
@@ -7,7 +7,7 @@ import { ICONS } from '@/lib/icons';
 // ikut jempol kayak analog, balik ke tengah pas dilepas.
 const DEAD = 0.32; // proporsi radius yang jadi zona mati
 
-export default function DPad({ onMove }) {
+export default function DPad({ onMove, onRelease }) {
   const padRef = useRef(null);
   const knobRef = useRef(null);
   const st = useRef({ pid: null, dir: null });
@@ -28,7 +28,7 @@ export default function DPad({ onMove }) {
     const ang = Math.atan2(dy, dx);
     placeKnob(Math.cos(ang) * clamped, Math.sin(ang) * clamped);
 
-    if (dist < max * DEAD) { st.current.dir = null; return; }
+    if (dist < max * DEAD) { if (st.current.dir) onRelease?.(); st.current.dir = null; return; }
 
     let dir;
     if (ang > -Math.PI / 4 && ang <= Math.PI / 4) dir = 'r';
@@ -36,6 +36,12 @@ export default function DPad({ onMove }) {
     else if (ang > (3 * Math.PI) / 4 || ang <= -(3 * Math.PI) / 4) dir = 'l';
     else dir = 'u';
 
+    const axes = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 };
+    if (st.current.dir) {
+      const delta = Math.atan2(Math.sin(ang - axes[st.current.dir]), Math.cos(ang - axes[st.current.dir]));
+      if (Math.abs(delta) < Math.PI * .3) dir = st.current.dir;
+    }
+
     if (dir !== st.current.dir) {
       st.current.dir = dir;
       if (dir === 'u') onMove(0, -1);
@@ -43,9 +49,10 @@ export default function DPad({ onMove }) {
       else if (dir === 'l') onMove(-1, 0);
       else onMove(1, 0);
     }
-  }, [onMove]);
+  }, [onMove, onRelease]);
 
   const onDown = (e) => {
+    if (st.current.pid !== null || !e.isPrimary) return;
     e.preventDefault();
     st.current.pid = e.pointerId;
     padRef.current && padRef.current.setPointerCapture(e.pointerId);
@@ -61,6 +68,7 @@ export default function DPad({ onMove }) {
     if (e.pointerId !== st.current.pid) return;
     st.current.pid = null;
     st.current.dir = null;
+    onRelease?.();
     if (knobRef.current) {
       knobRef.current.style.transition = 'transform 150ms ease';
       placeKnob(0, 0);
@@ -78,6 +86,7 @@ export default function DPad({ onMove }) {
       onPointerMove={onMovePtr}
       onPointerUp={onUp}
       onPointerCancel={onUp}
+      onLostPointerCapture={onUp}
     >
       <ICONS.up className={arrow} style={{ top: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
       <ICONS.down className={arrow} style={{ bottom: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
```

#### components/GameCanvas.jsx

```diff
diff --git a/components/GameCanvas.jsx b/components/GameCanvas.jsx
index b819287..79b5ff6 100644
--- a/components/GameCanvas.jsx
+++ b/components/GameCanvas.jsx
@@ -8,6 +8,7 @@ import { createTerritoryGame } from '@/lib/territory/controller';
 import { createBossGame } from '@/lib/boss/controller';
 import { kindOf, isTwoPlayer } from '@/lib/modes/registry';
 import { useSounds } from '@/hooks/useSounds';
+import { createDirectionInput } from '@/lib/input';
 
 const isMPMode = (m) => isTwoPlayer(m);
 const typingTarget = (t) => !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable));
@@ -20,12 +21,13 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
   const modeRef = useRef(mode);
   const prefsRef = useRef({ speedPref, taDuration });
   const kindRef = useRef('arcade');
+  const inputRef = useRef(null);
   const sounds = useSounds();
 
   const kind = kindOf(mode); // 'arcade' (engine lama), 'puzzle' (berbasis langkah), atau 'delivery' (kurir)
   prefsRef.current = { speedPref, taDuration };
   kindRef.current = kind;
-  useEffect(() => { modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);
+  useEffect(() => { inputRef.current?.clear(); modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);
 
   // Satu controller aktif per jenis mode. Berpindah jenis (arkade <-> puzzle) menghancurkan yang lama
   // (timer/RAF/tween ikut dibersihkan) dan membuat yang baru; berpindah antar mode arkade memakai engine yang sama.
@@ -37,25 +39,28 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
     if (prefsRef.current.speedPref) engine.setSpeedPref(prefsRef.current.speedPref);
     if (prefsRef.current.taDuration) engine.setTaDuration(prefsRef.current.taDuration);
     engineRef.current = engine;
-    return () => { engine.destroy(); if (engineRef.current === engine) engineRef.current = null; };
+    return () => { inputRef.current?.clear(); engine.destroy(); if (engineRef.current === engine) engineRef.current = null; };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [kind]);
 
   useImperativeHandle(ref, () => ({
     startRun: () => !!(engineRef.current && engineRef.current.startRun()),
-    pauseRun: (r) => !!(engineRef.current && engineRef.current.pauseRun(r)),
+    pauseRun: (r) => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.pauseRun(r)); },
     resumeRun: () => !!(engineRef.current && engineRef.current.resumeRun()),
     releasePause: (r) => engineRef.current && engineRef.current.releasePause(r),
-    togglePause: () => engineRef.current && engineRef.current.togglePause(),
-    returnToMenu: () => engineRef.current && engineRef.current.returnToMenu(),
+    togglePause: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.togglePause(); },
+    returnToMenu: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.returnToMenu(); },
     setDir: (x, y) => engineRef.current && engineRef.current.setDir(x, y),
     setDirMP: (which, x, y) => engineRef.current && engineRef.current.setDirMP(which, x, y),
+    setHeldDir: (x, y) => inputRef.current?.press('pad', 0, x, y),
+    releaseHeldDir: () => inputRef.current?.release('pad'),
     setSpeedPref: (v) => engineRef.current && engineRef.current.setSpeedPref(v),
     setTaDuration: (s) => engineRef.current && engineRef.current.setTaDuration(s),
     chooseUpgrade: (id) => !!(engineRef.current && engineRef.current.chooseUpgrade && engineRef.current.chooseUpgrade(id)),
     reviveRun: () => engineRef.current && engineRef.current.reviveRun ? engineRef.current.reviveRun() : false,
-    undo: () => !!(engineRef.current && engineRef.current.undo && engineRef.current.undo()),
-    restartLevel: () => !!(engineRef.current && engineRef.current.restartLevel && engineRef.current.restartLevel()),
+    undo: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.undo && engineRef.current.undo()); },
+    restartLevel: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.restartLevel && engineRef.current.restartLevel()); },
+    retrySave: () => engineRef.current?.retrySave?.(),
     setLevel: (i) => !!(engineRef.current && engineRef.current.setLevel && engineRef.current.setLevel(i)),
     isRunning: () => !!(engineRef.current && engineRef.current.isRunning()),
     getState: () => (engineRef.current ? engineRef.current.getState() : 'menu'),
@@ -64,6 +69,13 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
   useEffect(() => {
     const DIRS = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
     const WASD = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
+    const input = createDirectionInput({
+      enabled: () => !!engineRef.current && engineRef.current.getState() === 'playing' && !dialogOpen(),
+      stepMode: () => kindRef.current === 'puzzle',
+      send: (player, x, y, meta) => { const e = engineRef.current; if (!e) return; if (isMPMode(modeRef.current)) e.setDirMP(player, x, y); else e.setDir(x, y, meta); },
+      cancel: (_, source) => engineRef.current?.cancelHeldInput?.(source),
+    });
+    inputRef.current = input;
     function onKeyDown(e) {
       if (e.ctrlKey || e.metaKey || e.altKey) return;
       if (dialogOpen() || typingTarget(e.target)) return; // dialog / input memegang keyboard
@@ -72,30 +84,32 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
       if (!engine) return;
       // Spasi/Enter milik kontrol UI yang sedang fokus; jangan dicuri. Spasi di luar kontrol hanya dicegah agar halaman tidak scroll.
       if (k === ' ' || k === 'enter') {
-        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); if (modeRef.current === 'puzzle') engine.setDir(0, 0); }
+        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); if (!e.repeat && modeRef.current === 'puzzle') engine.setDir(0, 0); }
         return;
       }
-      if (k === 'escape') { e.preventDefault(); engine.togglePause(); return; }
-      if (k === 'z' || k === 'u') { if (engine.undo) { e.preventDefault(); engine.undo(); } return; } // khusus puzzle
-      if (k === 'r') { if (engine.restartLevel) { e.preventDefault(); engine.restartLevel(); } return; }
+      if (k === 'escape') { e.preventDefault(); if (!e.repeat) { input.clear(); engine.togglePause(); } return; }
+      if (k === 'z' || k === 'u') { if (engine.undo) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.undo(); } } return; }
+      if (k === 'r') { if (engine.restartLevel) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.restartLevel(); } } return; }
       const arrow = DIRS[k];
       if (arrow) e.preventDefault();
       if (isMPMode(modeRef.current)) {
-        if (arrow) engine.setDirMP(0, arrow[0], arrow[1]);
-        else if (WASD[k]) engine.setDirMP(1, WASD[k][0], WASD[k][1]);
+        if (arrow) input.press('key:' + k, 0, arrow[0], arrow[1]);
+        else if (WASD[k]) { e.preventDefault(); input.press('key:' + k, 1, WASD[k][0], WASD[k][1]); }
         return;
       }
       const d = arrow || WASD[k];
-      if (d) engine.setDir(d[0], d[1]);
+      if (d) { e.preventDefault(); input.press('key:' + k, 0, d[0], d[1]); }
     }
+    const onKeyUp = e => input.release('key:' + e.key.toLowerCase());
     window.addEventListener('keydown', onKeyDown);
-    return () => window.removeEventListener('keydown', onKeyDown);
+    window.addEventListener('keyup', onKeyUp);
+    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); input.clear(); inputRef.current = null; };
   }, []);
 
   // Tab disembunyikan / jendela kehilangan fokus = jeda. Kembali ke tab TIDAK melanjutkan:
   // pemain harus menekan Lanjut (atau arah) secara eksplisit.
   useEffect(() => {
-    const hide = () => { const e = engineRef.current; if (e) e.pauseRun('hidden'); };
+    const hide = () => { inputRef.current?.clear(); const e = engineRef.current; if (e) e.pauseRun('hidden'); };
     const show = () => { const e = engineRef.current; if (e) e.releasePause('hidden'); };
     const onVis = () => (document.hidden ? hide() : show());
     document.addEventListener('visibilitychange', onVis);
```

#### components/Hud.jsx

```diff
diff --git a/components/Hud.jsx b/components/Hud.jsx
index 5342f3d..2171875 100644
--- a/components/Hud.jsx
+++ b/components/Hud.jsx
@@ -29,7 +29,7 @@ function Hearts({ count }) {
   );
 }
 
-const GUARD_TEXT = { idle: 'patroli', alert: 'terlihat! Kabur sekarang', chase: 'MENGEJAR!', return: 'mencari jalan pulang', stunned: 'pingsan' };
+const GUARD_TEXT = { idle: 'patroli', alert: 'terlihat! Kabur sekarang', chase: 'MENGEJAR!', return: 'mencari jalan pulang', stunned: 'pingsan', windup: 'serangan siap! Hindari petak !', recover: 'celah menyerang' };
 
 // Statistik Puzzle: ikon + teks (status tidak bergantung warna) dan pesan langsung (live region).
 function PuzzleStats({ p }) {
@@ -37,12 +37,14 @@ function PuzzleStats({ p }) {
   return (
     <div className="puzzle-hud">
       <div className="puzzle-stats">
-        <span><StepsI size={14} />Langkah {p.steps} / par {p.par}</span>
+        <span><StepsI size={14} />Langkah {p.steps} · acuan {p.par}</span>
         {p.keys.need > 0 && <span><KeyI size={14} />Kunci {p.keys.have}/{p.keys.need}</span>}
         {p.plates.need > 0 && <span><PlateI size={14} />Sakelar {p.plates.active}/{p.plates.need}</span>}
         <span className="apple-counter"><ICONS.normal size={14} />Apel {p.apples}/{p.applesTotal} <small>bonus</small></span>
         {p.hammer > 0 && <span><ICONS.hammer size={14} />Palu {p.hammer}</span>}
         {p.shield > 0 && <span><ICONS.shield size={14} />Perisai {p.shield}</span>}
+        {p.enemies?.total > 0 && <><span className="dungeon-hearts"><ICONS.heart size={14} fill="currentColor" />{p.hearts}/3 hati</span><span><ICONS.eye size={14} />Musuh {p.enemies.left}/{p.enemies.total}</span></>}
+        {p.levers?.total > 0 && <span><ICONS.lock size={14} />Jeruji {p.levers.active}/{p.levers.total} terbuka</span>}
         {p.guard && <span data-guard={p.guard}><ICONS.eye size={14} />Penjaga: {GUARD_TEXT[p.guard]}</span>}
       </div>
       {!!p.legend?.length && <div className="puzzle-legend">{p.legend.map(l => { const I = ICONS[l.icon]; return <span key={l.icon}><I size={13} />{l.text}</span>; })}</div>}
@@ -196,7 +198,7 @@ export default function Hud({ mode, modeLabel, timerText, effects, score, best,
           {isPuzzle ? (
             <div className="flex items-center gap-1.5 min-w-0">
               <ICONS.puzzle size={20} className="text-[#3b8fb5] shrink-0" />
-              <span className="text-2xl font-bold leading-none tabular-nums">Level {puzzle.levelNo}/{puzzle.levelCount}</span>
+              <span className="text-2xl font-bold leading-none tabular-nums">Ruang {puzzle.levelNo}/{puzzle.levelCount}</span>
             </div>
           ) : (
           <div className="flex items-center gap-1.5 min-w-0">
@@ -262,7 +264,7 @@ export default function Hud({ mode, modeLabel, timerText, effects, score, best,
         <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
           <ICONS.gamepad size={18} className="text-[#5f6368]" />
           <b className="text-[15px] sm:text-[17px] tracking-wide">{String(modeLabel || '').replace(/^Snake/, 'Eat-eat')}</b>
-          {isPuzzle && <span className="text-[13px] font-semibold text-[#3c4043]">Level {puzzle.levelNo}/{puzzle.levelCount} · {puzzle.name}</span>}
+          {isPuzzle && <span className="text-[13px] font-semibold text-[#3c4043]">Ruang {puzzle.levelNo}/{puzzle.levelCount} · {puzzle.name}</span>}
           {mode === 'timeattack' && timerText && (
             <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
               <TimerIcon size={14} />{timerText}
```

#### components/Overlay.jsx

```diff
diff --git a/components/Overlay.jsx b/components/Overlay.jsx
index bf721b6..f27eb5e 100644
--- a/components/Overlay.jsx
+++ b/components/Overlay.jsx
@@ -44,7 +44,7 @@ const CONFETTI_SIZE = '64px 84px, 78px 96px, 90px 70px, 70px 110px';
 const CONFETTI_POS = '6px 10px, 34px 46px, 54px 8px, 20px 70px';
 
 const DESCRIPTION = {
-  puzzle: 'Cari kunci, pecahkan teka-teki, temukan jalan keluar.',
+  puzzle: 'Cari kunci, buka tuas, pilih bertarung atau menyelinap.',
   delivery: 'Antar paket apel sebelum waktunya habis.',
   roguelite: 'Kumpulkan bekal. Tembus antek. Taklukkan boss.',
   boss: 'Tembus 9 ronde antek, lalu taklukkan boss tiga fase.',
@@ -67,7 +67,7 @@ function ReviveInfo({ data }) {
   return <div className="revive-info"><span><ICONS.heart size={15} />Revive <b>{data.left}/3</b></span><small>{data.resetAt ? `Pulih penuh dalam ${days ? days + ' hari ' : ''}${hours ? hours + ' jam ' : ''}${mins} menit` : 'Pulih penuh 72 jam setelah revive pertama'}</small></div>;
 }
 
-export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, onRevive, onMenu, speed, onSpeedChange, taSecs, onTaChange, puzzleMenu, onSelectLevel, deliveryMenu, rogueMenu, territoryMenu, bossMenu, onHelp }) {
+export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, onRevive, onRetrySave, onMenu, speed, onSpeedChange, taSecs, onTaChange, puzzleMenu, onSelectLevel, deliveryMenu, rogueMenu, territoryMenu, bossMenu, onHelp }) {
   const [busy, setBusy] = useState(false);
   const isTouch = useIsTouch();
   const groups = isTouch ? GROUPS.filter(g => g.key !== 'mp') : GROUPS; // 2P Lokal disembunyikan di HP
@@ -178,7 +178,8 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
       {isPuzzleMode && lv && selLevel && (
         <div className="level-info" role="status" aria-live="polite" aria-atomic="true">
           <div className="coin-wallet"><ICONS.normal size={18} /><b>{lv.coins || 0} koin apel</b><span>Skin ular · rencana mendatang</span></div>
-          <p className="start-description"><span><b>Level {lv.selected + 1}{selLevel.tutorial ? ' (tutorial)' : ''} · {selLevel.tier || selLevel.name}:</b> {selLevel.goal} Par {selLevel.par} langkah.</span></p>
+          {lv.savePending && <div className="save-notice" role="status"><p>Progres masih di sesi ini. Simpan sebelum menutup game.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
+          <p className="start-description"><span><b>Ruang {lv.selected + 1}{selLevel.tutorial ? ' (tutorial)' : ''} · {selLevel.tier || selLevel.name}:</b> {selLevel.goal} Acuan {selLevel.par} langkah.</span></p>
           {selLevel.intro && <p className="level-intro">{selLevel.intro}</p>}
         </div>
       )}
@@ -186,21 +187,21 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
       <div className="adv-controls">
       {isPuzzleMode && lv && (
         <div className="start-settings">
-          <div className="start-menu-heading"><span>Level</span><span>{lv.levels.filter(l => l.cleared).length}/{lv.levels.length} selesai</span></div>
+          <div className="start-menu-heading"><span>Ruang</span><span>{lv.levels.filter(l => l.cleared).length}/{lv.levels.length} selesai</span></div>
           {lv.levels.length > LEVEL_PAGE && (
             <div className="level-pager">
-              <button onClick={() => setLvPage(p => Math.max(0, p - 1))} disabled={lvPage === 0} aria-label="Halaman level sebelumnya"><ICONS.left size={14} /></button>
-              <span aria-live="polite">Level {lvPage * LEVEL_PAGE + 1}–{Math.min(lv.levels.length, (lvPage + 1) * LEVEL_PAGE)}</span>
-              <button onClick={() => setLvPage(p => Math.min(Math.ceil(lv.levels.length / LEVEL_PAGE) - 1, p + 1))} disabled={(lvPage + 1) * LEVEL_PAGE >= lv.levels.length} aria-label="Halaman level berikutnya"><ICONS.right size={14} /></button>
+              <button onClick={() => setLvPage(p => Math.max(0, p - 1))} disabled={lvPage === 0} aria-label="Halaman ruang sebelumnya"><ICONS.left size={14} /></button>
+              <span aria-live="polite">Ruang {lvPage * LEVEL_PAGE + 1}–{Math.min(lv.levels.length, (lvPage + 1) * LEVEL_PAGE)}</span>
+              <button onClick={() => setLvPage(p => Math.min(Math.ceil(lv.levels.length / LEVEL_PAGE) - 1, p + 1))} disabled={(lvPage + 1) * LEVEL_PAGE >= lv.levels.length} aria-label="Halaman ruang berikutnya"><ICONS.right size={14} /></button>
             </div>
           )}
-          <div className="level-list" role="group" aria-label="Pilih level">
+          <div className="level-list" role="group" aria-label="Pilih ruang">
             {lv.levels.map((l, i) => ({ l, i })).slice(lvPage * LEVEL_PAGE, (lvPage + 1) * LEVEL_PAGE).map(({ l, i }) => (
               <button
                 key={l.id}
                 disabled={!l.unlocked}
                 aria-pressed={lv.selected === i}
-                aria-label={`Level ${i + 1}: ${l.name}${l.unlocked ? '' : ', terkunci'}${l.cleared ? (l.legacyBest ? ', selesai di versi lama' : `, rekor ${l.best} langkah`) : ''}`}
+                aria-label={`Ruang ${i + 1}: ${l.name}${l.unlocked ? '' : ', terkunci'}${l.cleared ? (l.legacyBest ? ', selesai di versi lama' : `, rekor ${l.best} langkah`) : ''}`}
                 onClick={() => onSelectLevel && onSelectLevel(i)}
                 className="level-btn"
               >
@@ -311,6 +312,7 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
     </div>
   ) : (
     <div className="result-actions">
+      {isPuzzleMode && lv?.savePending && <div className="save-notice" role="status"><p>Progres belum tersimpan.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
       {phase === 'gameover' && rm && rm.revive.eligible && <>
         <button ref={rm.revive.left ? primaryRef : null} onClick={onRevive} disabled={!rm.revive.left || rm.revive.busy} className="revive-button"><ICONS.heart size={18} />{rm.revive.busy ? 'Menyiapkan…' : `Hidup lagi · ${rm.revive.left}/3`}</button>
         <p className="revive-detail">Lanjut dari rute atau fase ini. Upgrade tetap dibawa.</p>
@@ -343,7 +345,7 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
 
   return (
     <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={e => {
-        if (e.key === 'Escape' && phase === 'pause') { e.preventDefault(); onPlay(); }
+        if (e.key === 'Escape' && !e.repeat && phase === 'pause') { e.preventDefault(); onPlay(); }
         if (e.key !== 'Tab') return;
         const buttons = [...e.currentTarget.querySelectorAll('button:not(:disabled)')];
         const index = buttons.indexOf(document.activeElement);
```

#### lib/constants.js

```diff
diff --git a/lib/constants.js b/lib/constants.js
index baf03c5..fa70b4f 100644
--- a/lib/constants.js
+++ b/lib/constants.js
@@ -31,7 +31,7 @@ export const MODE_NAMES = {
   mayhemplus: 'Mayhem+',
   timeattack: 'Time Attack',
   multiplayer: '2P Lokal',
-  puzzle: 'Jejak Kunci',
+  puzzle: 'Dungeon',
   delivery: 'Kurir Apel',
   roguelite: 'Ekspedisi Mayhem',
   territory: 'Rebut Arena',
@@ -103,15 +103,16 @@ export const MODE_RULES = {
     { icon: 'wall', text: 'Tabrak tepi arena = game over untuk pemain itu' },
   ],
   puzzle: [
-    { icon: 'steps', text: 'Satu tekan arah = satu langkah. Tidak ada gerak otomatis dan tidak ada waktu.' },
+    { icon: 'steps', text: 'Ketuk arah untuk satu langkah, tahan untuk berjalan berulang. Belok langsung mengikuti arah terbaru. Tanpa batas waktu.' },
     { icon: 'key', text: 'Ambil kunci yang dibutuhkan pintu keluar' },
     { icon: 'plate', text: 'Injak sakelar A/B/C sekali. Semua sakelar syarat tetap aktif sampai level selesai.' },
     { icon: 'normal', text: 'Maskot ular satu petak. Apel emas = koin bonus opsional, tidak menambah panjang. Koin disimpan saat level selesai; replay hanya memberi selisih koleksi terbaik.' },
     { icon: 'portal', text: 'Portal berangka sama saling berpasangan: masuk satu ujung, muncul di ujung lainnya' },
     { icon: 'exit', text: 'Gembok = pintu belum terbuka; panah = syarat terpenuhi' },
     { icon: 'shield', text: 'Duri (segitiga) hanya bisa dilewati dengan Perisai (S), batu krem retak dengan Palu (P). Keduanya sekali pakai.' },
-    { icon: 'lock', text: 'Pagar kayu bergantian buka/tutup tiap giliran. Panah = bisa lewat di giliran berikut, palang = tertutup. Spasi / Tunggu memajukan satu giliran.' },
-    { icon: 'eye', text: 'Penjaga mengikuti jejak patroli. Masuk area pandangnya memicu ! selama satu giliran sebelum mengejar. Kabur ke semak atau hilang dari pandangan; Perisai menahan satu sengatan.' },
+    { icon: 'lock', text: 'Injak tuas untuk membuka jeruji yang terhubung secara permanen. Spasi / Tunggu melewatkan satu giliran.' },
+    { icon: 'eye', text: 'Slime punya 1 HP dan bergerak tiap dua giliran; penjaga batu punya 2 HP. Arah ke musuh = pukul, tanpa maju. Petak ! adalah sasaran serangan giliran berikutnya. Hindari atau serang dulu; Perisai menahan satu pukulan.' },
+    { icon: 'heart', text: 'Mulai dengan 3 hati. Maksimal satu hati hilang per giliran, lalu kebal satu giliran. Ramuan hati memulihkan 1, maksimal 3. Keluar cukup dengan kunci dan sakelar; mengalahkan musuh opsional.' },
     { icon: 'undo', text: 'Z = undo langkah (bisa berulang), R = ulang level. Gerakan yang tertahan tidak memakai langkah.' },
   ],
   delivery: [
```

#### lib/modes/registry.js

```diff
diff --git a/lib/modes/registry.js b/lib/modes/registry.js
index c6a8674..901efa9 100644
--- a/lib/modes/registry.js
+++ b/lib/modes/registry.js
@@ -26,9 +26,9 @@ export const MODES = [
   { id: 'impossible', label: 'Impossible', short: 'Impossible', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'locked', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Tantangan ekstrem dengan kecepatan Ngebut.' },
   { id: 'multiplayer', label: '2P Lokal', short: '2P Lokal', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Berebut apel berdua dengan satu keyboard.' },
   { id: 'mayhemduo', label: 'Mayhem Duo', short: 'Mayhem Duo', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Duel berdua dengan efek acak dan ranjau.' },
-  { id: 'puzzle', label: 'Jejak Kunci', short: 'Jejak Kunci', group: 'adventure', kind: 'puzzle', players: 1, touch: true, speedMode: 'none', controls: 'Panah / WASD / geser = satu langkah. Z undo, R ulang level.', finish: 'Selesai saat kepala masuk pintu keluar yang syaratnya terpenuhi. Tersengat penjaga = game over.', description: 'Puzzle berbasis langkah, 50 level makin sulit: kunci, sakelar, portal, duri, gerbang, dan patroli penjaga.',
+  { id: 'puzzle', label: 'Dungeon', short: 'Dungeon', group: 'adventure', kind: 'puzzle', players: 1, touch: true, speedMode: 'none', controls: 'Panah / WASD / geser = satu langkah. Z undo, R ulang level.', finish: 'Selesai saat kepala masuk pintu keluar yang syaratnya terpenuhi. Tiga hati habis = game over.', description: 'Jelajahi 50 ruang: cari kunci, buka tuas, hindari jebakan, dan hadapi dua jenis musuh.',
     goal: 'Selesaikan 50 level (5 tutorial, lalu 45 buatan sistem) dengan langkah sesedikit mungkin.',
-    preview: ['Satu tekan arah = satu langkah, tanpa waktu. Gerakan yang tertahan tidak memakai langkah.', 'Ambil kunci dan injak sakelar sekali. Maskot satu petak; apel emas adalah koin bonus untuk rencana skin.', 'Penjaga berpatroli. Tanda ! memberi satu giliran untuk kabur. Sembunyi di semak; Spasi / Tunggu melewatkan giliran.', 'Undo (Z) bisa berulang; R mengulang level.'] },
+    preview: ['Ketuk untuk satu langkah, tahan untuk berjalan; tanpa batas waktu. Gerakan yang tertahan tidak memakai langkah.', 'Ambil kunci dan injak sakelar sekali. Maskot satu petak; apel emas adalah koin bonus untuk rencana skin.', 'Tiga hati. Slime 1 HP, penjaga batu 2 HP. Arah ke musuh = serang. Hindari petak ! sebelum giliran berikutnya; tuas membuka jeruji permanen.', 'Undo (Z) bisa berulang; R mengulang level.'] },
   { id: 'delivery', label: 'Kurir Apel', short: 'Kurir Apel', group: 'adventure', kind: 'delivery', players: 1, touch: true, speedMode: 'pref', controls: 'Panah / WASD, atau geser layar. Esc jeda.', finish: 'Shift berakhir saat waktu habis: menang bila terkirim >= 5, kalah bila kurang atau menabrak.', description: 'Ambil paket, antar ke rumah yang tepat sebelum paket basi. Satu shift penuh.',
     goal: 'Antar minimal 5 paket dalam satu shift tanpa menabrak.',
     duration: { fixedSec: 120, label: '120 detik (tetap)' },
```

#### lib/progress.js

```diff
diff --git a/lib/progress.js b/lib/progress.js
index d72cf53..e66c938 100644
--- a/lib/progress.js
+++ b/lib/progress.js
@@ -30,6 +30,21 @@ export function parseProgress(raw) {
 export const loadProgress = () => parseProgress(read(PROGRESS_KEY));
 export const saveProgress = (p) => write(PROGRESS_KEY, JSON.stringify(p));
 
+// Gabungkan hasil lokal yang belum tersimpan dengan hasil terbaru dari tab lain.
+export function mergeProgress(local, disk) {
+  const a = parseProgress(JSON.stringify(local)), b = parseProgress(JSON.stringify(disk));
+  const levels = { ...a.puzzle.levels };
+  Object.entries(b.puzzle.levels).forEach(([id, record]) => {
+    const old = levels[id];
+    if (!old) { levels[id] = { ...record }; return; }
+    const ar = old.revision || 1, br = record.revision || 1;
+    const best = ar === br ? Math.min(old.best, record.best) : ar > br ? old.best : record.best;
+    const revision = Math.max(ar, br), coins = Math.max(old.coins || 0, record.coins || 0);
+    levels[id] = { best, ...(revision > 1 ? { revision } : {}), ...(coins ? { coins } : {}) };
+  });
+  return { v: 1, puzzle: { levels } };
+}
+
 // Murni: catat hasil level. Replay tidak merusak rekor (best = minimum). `firstClear` hanya benar sekali per level.
 export function recordPuzzleResult(progress, levelId, steps, revision = 1, apples = 0) {
   const prev = progress.puzzle.levels[levelId];
```

#### lib/puzzle/campaign.js

```diff
diff --git a/lib/puzzle/campaign.js b/lib/puzzle/campaign.js
index 717c340..a50a388 100644
--- a/lib/puzzle/campaign.js
+++ b/lib/puzzle/campaign.js
@@ -1,4 +1,4 @@
-// Kampanye "Jejak Kunci": level 1..5 = tutorial buatan tangan (levels.js), level 6..50 = buatan sistem (campaignData.js).
+// Kampanye "Dungeon": level 1..5 = tutorial buatan tangan (levels.js), level 6..50 = buatan sistem (campaignData.js).
 // Seed kampanye TETAP supaya id level (dan progres tersimpan) stabil antar sesi dan antar pemain.
 import { RAW_LEVELS, loadLevels } from './levels';
 import { CAMPAIGN_SPECS } from './campaignData';
@@ -9,6 +9,6 @@ export const CAMPAIGN_SEED = 0;
 const tutorialSpecs = RAW_LEVELS.map(s => ({ ...s, tier: 'Tutorial', intro: null }));
 const loaded = loadLevels([...tutorialSpecs, ...CAMPAIGN_SPECS]);
 // Metadata tampilan (tier, kartu pengantar, tutorial?) ditempel ke objek level hasil build.
-const metaById = Object.fromEntries([...tutorialSpecs, ...CAMPAIGN_SPECS].map((s, i) => [s.id, { tier: s.tier, intro: s.intro || null, tutorial: i < tutorialSpecs.length, revision: 3 }]));
+const metaById = Object.fromEntries([...tutorialSpecs, ...CAMPAIGN_SPECS].map((s, i) => [s.id, { tier: s.tier, intro: s.intro || null, tutorial: i < tutorialSpecs.length, revision: 4 }]));
 export const CAMPAIGN_LEVELS = loaded.levels.map(l => ({ ...l, ...metaById[l.id] }));
 export const CAMPAIGN_REJECTED = loaded.rejected;
```

#### lib/puzzle/campaignData.js

```diff
diff --git a/lib/puzzle/campaignData.js b/lib/puzzle/campaignData.js
index a0f3824..d66fe02 100644
--- a/lib/puzzle/campaignData.js
+++ b/lib/puzzle/campaignData.js
@@ -1,4 +1,4 @@
 // DIBUAT OTOMATIS oleh scripts/build-campaign.mjs dari generator (seed kampanye tetap). Jangan diedit tangan.
 // Level 6..50 "Jejak Kunci". Generator dijalankan di luar runtime karena butuh sampai ~1,5 dtk per level.
-export const CAMPAIGN_SPECS = [{ "id": "gen-6", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 14, "map": ["#############", "#...#...#...#", "##..#...#...#", "#...........#", "#...#.F.#...#", "#...#...#.E.#", "#.K.#.#.#...#", "#############"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-7", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#.....##...#", "#....##.K..#", "#.....#...F#", "#.....#E..##", "#..........#", "#.....#....#", "############"], "snake": [[5, 1]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-8", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#....#.....#", "#..F##.....#", "#........E.#", "#.#..#.....#", "#....#.....#", "#K...#.....#", "#....#.....#", "############"], "snake": [[4, 7]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-9", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["###########", "#.........#", "#.....#...#", "##....#...#", "#.....#...#", "#.....#...#", "#F..K.#.E.#", "###########"], "snake": [[5, 3]], "dir": "U", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-10", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["#############", "#...#.......#", "#...#...E...#", "#FK.#.....#.#", "#.#.#.......#", "#...........#", "#...#.......#", "#...#.......#", "#############"], "snake": [[2, 7]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-11", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 16, "map": ["############", "#.....#....#", "#K.#..#....#", "#..........#", "#....##....#", "#..F..#....#", "#.....#E...#", "############"], "snake": [[5, 2]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-12", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["#############", "#......##...#", "#......#.F.##", "#......#....#", "#........#..#", "#......#....#", "#......#E..K#", "#############"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-13", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": "Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.......#..E#", "#.#.#...#K.##", "#...#.1.#.#.#", "#...#...#...#", "#...#...#...#", "#K..#.F.#.F.#", "#...#...#1..#", "#############"], "snake": [[2, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-14", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["##############", "#...#....#.1.#", "##..#.1..#...#", "#...#....#...#", "#..##....#...#", "#...#....#.K.#", "#...#.#.F#.#.#", "#........#E..#", "##############"], "snake": [[1, 7]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-15", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["############", "#...#.#....#", "##F...#...K#", "#.F...#..K.#", "#.......####", "#.....#.a.E#", "#..#..#.####", "#.....#....#", "############"], "snake": [[1, 6]], "dir": "U", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-16", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["##############", "#...#....#...#", "#...#......#.#", "#K..#....#..##", "#...##...#..E#", "#...#....#...#", "#...#.F.K#...#", "#.F......#...#", "##############"], "snake": [[1, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-17", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#...##..#..E#", "#.......#..K#", "#.F##...#.FK#", "#...#...#...#", "#...#...#...#", "#...#.......#", "#############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-18", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#############", "#...#...#.E.#", "#...#...#...#", "#.....F.#...#", "##..#...#...#", "#...#.......#", "#..##...#...#", "#K..#F#.#K..#", "#############"], "snake": [[1, 3]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-19", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["############", "#..........#", "#.#F#......#", "#...#...####", "#.F.##..a.E#", "#...#K..####", "#...#.....##", "############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-20", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": "Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#...#...#...#", "#K..#.#.#...#", "#.F.#...#..F#", "#.#.^...##.1#", "#...#.#.#..E#", "#...#...#...#", "#.S.#..1#K..#", "#############"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-21", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#.F.#...#.....#", "#...#...#..####", "#...#...#..a.E#", "#..##...#..####", "#K..x...#.....#", "#P..#.#.#.....#", "#...#.......#.#", "###############"], "snake": [[2, 3]], "dir": "U", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-22", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#P......#E..#", "##..#...#...#", "#..K#...##..#", "#...#...x...#", "#K..#...#...#", "#.#F#...#...#", "#############"], "snake": [[2, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-23", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["###############", "#....#..F#..F##", "#....#...#.####", "#....#..##.a.E#", "##..K#...#.####", "#.......1#....#", "#K...#..##..1.#", "###############"], "snake": [[4, 6]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-24", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["#############", "#...#..K#...#", "#...#...#...#", "#..........##", "#...#...#E..#", "#..F#...#...#", "#...#...#..##", "#.#.#...#K..#", "#############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-25", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "##..#....#.F..#", "#...#....#.####", "#...#....#.a.E#", "#K.......#.####", "#...#....#....#", "#.FS#....^..#.#", "###############"], "snake": [[2, 3]], "dir": "D", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-26", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#############", "#...^.K.x...#", "#...#...#...#", "#...#..F#...#", "##S.#...#F..#", "#...###.#...#", "#...##..#...#", "#..P#...#.E.#", "#############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-27", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#...K#...##.#.#", "#....#...K#1..#", "#....#.F..#..##", "#....#1#..#...#", "#.........#E.F#", "###############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-28", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": "Baru: Gerbang bergantian. Pagar terbuka bergantian tiap langkah. Panah = bisa lewat pada giliran berikut; palang = tertutup. Tekan Spasi atau Tunggu untuk menunggu.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["##############", "#...##P..#...#", "#...#....#...#", "##.K##...#...#", "#.F.#....#...#", "#...#....#...#", "###.h....#E..#", "#..K#....x...#", "##############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-29", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["###############", "#....#....#..K#", "#....#....#.K.#", "#....##...#.#.#", "#.S..g....#...#", "#....#....#.F.#", "#....#....#...#", "#....#..#.^.E.#", "#....#.##.#...#", "###############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-30", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#....#...x...F.#", "#....#...#.....#", "#....#.KP#..#..#", "#....#...#.#..##", "#....#...#.....#", "#....#K..#.....#", "#.P..#...#..E..#", "#....#...##....#", "#....x...#.....#", "################"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-31", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 25, "map": ["##############", "##..x.K##.#..#", "#...#..##.K..#", "#.P.#...#.####", "#F..#.#P#.a.E#", "#...#...x.####", "##############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-32", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["################", "#.#..#K........#", "#...##.#...#...#", "#...K#.....#...#", "#....#F....#...#", "#..F.#.....#...#", "#P...x..#..#...#", "#....#.....#..##", "#....#.....#E..#", "################"], "snake": [[1, 7]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-33", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["###############", "#S..#..##...F.#", "#K..#...#.#####", "#...##..#.a..E#", "#...#...#.#####", "#.#.#...^.K...#", "#.......#.....#", "#...#...#F....#", "###############"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-34", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#...#....#.....#", "#...#....#..E..#", "#...#....#...F.#", "#.#S#...K#.....#", "#K..##...#..#..#", "#...#....#.....#", "#...^....#.....#", "#...#..1.#.....#", "#..F#....#....1#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-35", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": "Baru: Penjaga. Ia berpatroli. Tanda ! memberi satu giliran sebelum mengejar posisi terakhirmu. Sembunyi di semak agar ia pulang. Tersengat = game over.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 19, "map": ["################", "#....##.F.F#...#", "#..###.....#...#", "#..F.#v....#...#", "#....#.K.#.#..E#", "#K...^.v.......#", "#....#.....#...#", "#S...#.....#...#", "#....#.v...#...#", "################"], "snake": [[2, 7]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 1, "dir": "D", "range": 3, "patrol": [[13, 1], [13, 2], [14, 2], [14, 1]] }] }, { "id": "gen-36", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["###############", "#.#.#F.......F#", "#...#..F.##...#", "#...#.v..#..#.#", "#........#K...#", "#...#....#...E#", "#..##....#....#", "#...#....#..K.#", "#...#....#...v#", "#...#...v#....#", "###############"], "snake": [[1, 9]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 10, "y": 8, "dir": "U", "range": 3, "patrol": [[10, 8], [10, 7], [11, 7], [11, 6], [11, 5]] }] }, { "id": "gen-37", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#################", "#....#.F..x.....#", "#....#.P#.#..####", "#....#....#..a.E#", "#....#v...#.F####", "#....#....#..#.##", "#....#.K..#.....#", "#....#.K..#v....#", "#.#..#....#.....#", "#....h....#.....#", "#################"], "snake": [[3, 3]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 15, "y": 9, "dir": "L", "range": 3, "patrol": [[15, 9], [14, 9], [13, 9], [12, 9], [11, 9]] }] }, { "id": "gen-38", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#....#F.###.#vE#", "#....^....#....#", "#....#....#....#", "#.F..#....#.v.1#", "#....#....#....#", "#....#K...#.K..#", "#.#..#...1#....#", "#.SF.#....#v...#", "#....#....#...##", "################"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 12, "y": 8, "dir": "R", "range": 3, "patrol": [[12, 8], [13, 8], [14, 8], [14, 7], [14, 6]] }] }, { "id": "gen-39", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["###############", "#...#K...#.a.E#", "#...#...K#.####", "#.F.#....x....#", "#...#....#...##", "#.......F#..#.#", "#...#..#v#.#..#", "#...#v.P.#.v..#", "###############"], "snake": [[2, 4]], "dir": "L", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 10, "y": 7, "dir": "U", "range": 3, "patrol": [[10, 7], [10, 6], [10, 5], [11, 5], [11, 4]] }] }, { "id": "gen-40", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 34, "map": ["###############", "#...#S....#..E#", "#..K#.....^..##", "#...#vv...#...#", "#...#v....##.F#", "#...h.....#...#", "##.##.....#K..#", "#...#F....#...#", "###############"], "snake": [[1, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 12, "y": 6, "dir": "R", "range": 3, "patrol": [[12, 6], [13, 6], [13, 7], [12, 7], [11, 7]] }] }, { "id": "gen-41", "name": "Gerbang Bergantian", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 36, "map": ["################", "#...#...#.#....#", "#...#.....g....#", "#..1#.....#...K#", "#...##....#....#", "#...#.....#.####", "#...#.....#.a.E#", "#.KF#.....#.####", "#..##.....#....#", "#.#.#.#1.F#....#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-42", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["#################", "#F..##...S#.....#", "#....#....#.....#", "#....^....#.....#", "#..#S#....^.....#", "#..#.#v.#.#.F.E.#", "#..K.#.#..#..K..#", "#....#....#.vF..#", "#################"], "snake": [[1, 3]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 15, "y": 7, "dir": "U", "range": 3, "patrol": [[15, 7], [15, 6], [15, 5], [15, 4], [14, 4]] }] }, { "id": "gen-43", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 26, "map": ["################", "#...#....g.#####", "#...#.v..#..a.E#", "#F..#....#######", "#...#....#.....#", "#...#....#.....#", "#...#.F..#.....#", "#.KK#v.v.#.....#", "#1..#.1..#.....#", "################"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 10, "y": 8, "dir": "U", "range": 3, "patrol": [[10, 8], [10, 7], [11, 7], [11, 8], [12, 8]] }] }, { "id": "gen-44", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["#################", "#...#..v#...#...#", "#...#Fv.....##..#", "#...#...#...#.K.#", "#F.F#...#...#v..#", "#..##...#.#.....#", "#...#1#.#...#..E#", "#...#...#...#...#", "#.#.#...#...#...#", "#.1K#...#...#...#", "#################"], "snake": [[2, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 9, "y": 6, "dir": "D", "range": 3, "patrol": [[9, 6], [9, 7], [10, 7], [10, 6], [11, 6]] }] }, { "id": "gen-45", "name": "Penjaga Kebun", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["################", "#....#.#...#...#", "#....#.........#", "#...K#...F.##..#", "#..K.#.v...#...#", "#....#.....#..v#", "#..........#...#", "#....##....#E..#", "#....#.....#...#", "#....#....F#v..#", "################"], "snake": [[2, 8]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 4, "dir": "U", "range": 3, "patrol": [[13, 4], [13, 3], [13, 2], [13, 1], [12, 1]] }] }, { "id": "gen-46", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 31, "map": ["###############", "#....##..v#...#", "#....^....^...#", "#....#...v#..K#", "#....#F.KK#.E.#", "#....#F#..#...#", "##.SF#.S..#.v.#", "#...###...#...#", "###############"], "snake": [[4, 1]], "dir": "R", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 13, "y": 1, "dir": "D", "range": 3, "patrol": [[13, 1], [13, 2], [12, 2], [12, 1], [11, 1]] }] }, { "id": "gen-47", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 40, "map": ["#################", "#...#.#.#...#..v#", "#F.P#...#...#.v.#", "#...#...#.......#", "#...#...x...#...#", "#...#.FK#...#..E#", "#...#...#...#..v#", "#..S#...#..v#..K#", "#F..#...#...#..##", "#...#K..#...#.#.#", "##..#...#...##..#", "#...^...#...#.#.#", "#################"], "snake": [[2, 6]], "dir": "D", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 10, "y": 11, "dir": "L", "range": 3, "patrol": [[10, 11], [9, 11], [9, 10], [9, 9], [10, 9]] }] }, { "id": "gen-48", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#SF.#....F##vKv#", "#...^......#...#", "#.#.#...1..#.vE#", "#...#......#1#.#", "#...#......#...#", "#...#......#.K.#", "#...#..v...#...#", "################"], "snake": [[2, 4]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 5, "dir": "L", "range": 3, "patrol": [[13, 5], [12, 5], [12, 6], [12, 7], [13, 7]] }] }, { "id": "gen-49", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Pakai portal untuk pindah ruang. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#################", "#...##..#.v.#E..#", "#...#..1#.......#", "#..##.F.#..v#...#", "#...#...#...#...#", "#K......#1..#...#", "#...#..K##F.#...#", "#..K#...#...#.v.#", "#...#...#...#...#", "#...#v..#.#.#.F.#", "#################"], "snake": [[2, 7]], "dir": "U", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 13, "y": 8, "dir": "R", "range": 3, "patrol": [[13, 8], [14, 8], [15, 8], [15, 9]] }] }, { "id": "gen-50", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 44, "map": ["#################", "#...#...#...#...#", "#...#...h.#.#...#", "#...##.##...#...#", "#...x...#...#v..#", "#...#v..#...#...#", "#.P.#...#...##..#", "#...#...#...#...#", "#...#...#...#...#", "#...#.F.#...x...#", "#F..#Pv.#.K.#..E#", "#...#...#..K#..v#", "#################"], "snake": [[3, 5]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 14, "y": 4, "dir": "D", "range": 3, "patrol": [[14, 4], [14, 5], [14, 6], [15, 6], [15, 5]] }] }
+export const CAMPAIGN_SPECS = [{ "id": "gen-6", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 14, "map": ["#############", "#...#...#...#", "##..#...#...#", "#...........#", "#...#.F.#...#", "#...#...#.E.#", "#.K.#.#.#...#", "#############"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-7", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#.....##...#", "#....##.K..#", "#.....#...F#", "#.....#E..##", "#..........#", "#.....#....#", "############"], "snake": [[5, 1]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-8", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#....#.....#", "#..F##.....#", "#........E.#", "#.#..#.....#", "#....#.....#", "#K...#.....#", "#....#.....#", "############"], "snake": [[4, 7]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-9", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["###########", "#.........#", "#.....#...#", "##....#...#", "#.....#...#", "#.....#...#", "#F..K.#.E.#", "###########"], "snake": [[5, 3]], "dir": "U", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-10", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["#############", "#...#.......#", "#...#...E...#", "#FK.#.....#.#", "#.#.#.......#", "#...........#", "#...#.......#", "#...#.......#", "#############"], "snake": [[2, 7]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-11", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 16, "map": ["############", "#.....#....#", "#K.#..#....#", "#..........#", "#....##....#", "#..F..#....#", "#.....#E...#", "############"], "snake": [[5, 2]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-12", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["#############", "#......##...#", "#......#.F.##", "#......#....#", "#........#..#", "#......#....#", "#......#E..K#", "#############"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-13", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": "Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.......#..E#", "#.#.#...#K.##", "#...#.1.#.#.#", "#...#...#...#", "#...#...#...#", "#K..#.F.#.F.#", "#...#...#1..#", "#############"], "snake": [[2, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-14", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["##############", "#...#....#.1.#", "##..#.1..#...#", "#...#....#...#", "#..##....#...#", "#...#....#.K.#", "#...#.#.F#.#.#", "#........#E..#", "##############"], "snake": [[1, 7]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-15", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["############", "#...#.#....#", "##F...#...K#", "#.F...#..K.#", "#.......####", "#.....#.a.E#", "#..#..#.####", "#.....#....#", "############"], "snake": [[1, 6]], "dir": "U", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-16", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["##############", "#...#....#...#", "#...#......#.#", "#K..#....#..##", "#...##...#..E#", "#...#....#...#", "#...#.F.K#...#", "#.F......#...#", "##############"], "snake": [[1, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-17", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#...##..#..E#", "#.......#..K#", "#.F##...#.FK#", "#...#...#...#", "#...#...#...#", "#...#.......#", "#############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-18", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#############", "#...#...#.E.#", "#...#...#...#", "#.....F.#...#", "##..#...#...#", "#...#.......#", "#..##...#...#", "#K..#F#.#K..#", "#############"], "snake": [[1, 3]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-19", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["############", "#..........#", "#.#F#......#", "#...#...####", "#.F.##..a.E#", "#...#K..####", "#...#.....##", "############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-20", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": "Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#...#...#...#", "#K..#.#.#...#", "#.F.#...#..F#", "#.#.^...##.1#", "#...#.#.#..E#", "#...#...#...#", "#.S.#..1#K..#", "#############"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-21", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#.F.#...#.....#", "#...#...#..####", "#...#...#..a.E#", "#..##...#..####", "#K..x...#.....#", "#P..#.#.#.....#", "#...#.......#.#", "###############"], "snake": [[2, 3]], "dir": "U", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-22", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#P......#E..#", "##..#...#...#", "#..K#...##..#", "#...#...x...#", "#K..#...#...#", "#.#F#...#...#", "#############"], "snake": [[2, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-23", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["###############", "#....#..F#..F##", "#....#...#.####", "#....#..##.a.E#", "##..K#...#.####", "#.......1#....#", "#K...#..##..1.#", "###############"], "snake": [[4, 6]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-24", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["#############", "#...#..K#...#", "#...#...#...#", "#..........##", "#...#...#E..#", "#..F#...#...#", "#...#...#..##", "#.#.#...#K..#", "#############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-25", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "##..#....#.F..#", "#...#....#.####", "#...#....#.a.E#", "#K.......#.####", "#...#....#....#", "#.FS#....^..#.#", "###############"], "snake": [[2, 3]], "dir": "D", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-26", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#############", "#...^.K.x...#", "#...#...#...#", "#...#..F#...#", "##S.#...#F..#", "#...###.#...#", "#...##..#...#", "#..P#...#.E.#", "#############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-27", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#...K#...##.#.#", "#....#...K#1..#", "#....#.F..#..##", "#....#1#..#...#", "#.........#E.F#", "###############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-28", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": "Baru: Tuas. Injak tuas kuningan untuk membuka gerbang permanen. Tidak ada hitungan genap/ganjil.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["##############", "##!.#..K.#..##", "#.#.#..K.#...#", "#...#....#...#", "##.F#....#...#", "#...#P...#.#.#", "#...G....x..E#", "#...#....#...#", "##############"], "snake": [[2, 6]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [4, 6], "lever": [2, 1] }] }, { "id": "gen-29", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["###############", "#S...#....#...#", "#....#....#...#", "#....#....^.E.#", "##!..G....#.#.#", "#....#....##F##", "#....#....#...#", "#...K#...K#.#.#", "#....#....#...#", "###############"], "snake": [[2, 7]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [5, 4], "lever": [2, 4] }] }, { "id": "gen-30", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#....#...x...F.#", "#....#...#.....#", "#....#.KP#..#..#", "#....#...#.#..##", "#....#...#.....#", "#....#K..#.....#", "#.P..#...#..E..#", "#....#...##....#", "#....x...#.....#", "################"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-31", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["##############", "#...#...##..E#", "#...#....#...#", "#...#.#.F#.#.#", "#!..#..1##...#", "#...#....#.1.#", "#...#....#...#", "#...G.K..##..#", "#...#....#...#", "#...#.K..#...#", "##############"], "snake": [[3, 8]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [4, 7], "lever": [1, 4] }] }, { "id": "gen-32", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["###############", "#...#.#...#.E.#", "#.F...#...#..##", "#P....#...#...#", "#.....#...#K..#", "#.....x...#...#", "#....##...#...#", "#.....#...#..K#", "#.....#!..G...#", "###############"], "snake": [[1, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [10, 8], "lever": [7, 8] }] }, { "id": "gen-33", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["###############", "#...#...G.....#", "#......##..####", "###.#!.##..a.E#", "#...#...#..####", "#K..#K..#...F.#", "###############"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [{ "gate": [8, 1], "lever": [5, 3] }] }, { "id": "gen-34", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#...#....#.....#", "#...#....#..E..#", "#...#....#...F.#", "#.#S#...K#.....#", "#K..##...#..#..#", "#...#....#.....#", "#...^....#.....#", "#...#..1.#.....#", "#..F#....#....1#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-35", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": "Baru: Dungeon dijaga musuh. Tiga hati; tekan arah ke musuh untuk menyerang. Hindari petak serangan yang ditandai. Slime 1 HP, penjaga 2 HP.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.!Fv#..K.#", "#....#....#", "#....G...E#", "#....#..F.#", "#.HK.#.#..#", "#....#....#", "###########"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 7, "y": 3, "kind": "slime", "dir": "D", "patrol": [[7, 3], [7, 4], [7, 5]] }], "links": [{ "gate": [5, 4], "lever": [2, 2] }] }, { "id": "gen-36", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#..#.#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K..#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-37", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#....#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K#.#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-38", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.HK.#..K.#", "#....#....#", "#....G...E#", "#....#....#", "#.!Fv#.#..#", "#....#..F.#", "###########"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 7, "y": 5, "kind": "slime", "dir": "U", "patrol": [[7, 5], [7, 4], [7, 3]] }], "links": [{ "gate": [5, 4], "lever": [2, 6] }] }, { "id": "gen-39", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.K#.#.KH.#", "#....#....#", "#E...G....#", "#....#....#", "#....#vF!.#", "#.F..#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 5, "kind": "warden", "dir": "U", "patrol": [[3, 5], [3, 4], [3, 3]] }], "links": [{ "gate": [5, 4], "lever": [8, 6] }] }, { "id": "gen-40", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#....#.KH.#", "#.F..#....#", "#E...G....#", "#....#....#", "#.K#.#vF!.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 5, "kind": "warden", "dir": "U", "patrol": [[3, 5], [3, 4], [3, 3]] }], "links": [{ "gate": [5, 4], "lever": [8, 6] }] }, { "id": "gen-41", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.K..#vF!.#", "#....#....#", "#E...G....#", "#.F..#....#", "#..#.#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "warden", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-42", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#..#.#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K..#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "warden", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-43", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.K...#v.F!.#", "#.....#.....#", "#E....G.....#", "#.F...#.....#", "#..#..#..KH.#", "#.....#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 3, "kind": "warden", "dir": "D", "patrol": [[4, 3], [4, 4], [4, 5]] }, { "x": 9, "y": 5, "kind": "slime", "dir": "U", "patrol": [[9, 5], [9, 4], [10, 4], [10, 5]] }], "links": [{ "gate": [6, 4], "lever": [10, 2] }] }, { "id": "gen-44", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#...F.#", "#.!F.v#..#..#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.HK..#...K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 3, "kind": "warden", "dir": "D", "patrol": [[8, 3], [8, 4], [8, 5]] }, { "x": 3, "y": 5, "kind": "slime", "dir": "U", "patrol": [[3, 5], [3, 4], [2, 4], [2, 5]] }], "links": [{ "gate": [6, 4], "lever": [2, 2] }] }, { "id": "gen-45", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#.....#.....#", "#..#..#..KH.#", "#.F...#.....#", "#E....G.....#", "#.....#.....#", "#.K...#v.F!.#", "#.F...#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-46", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.K...#..KH.#", "#.....#.....#", "#E....G.....#", "#.....#.....#", "#..#..#v.F!.#", "#.F...#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-47", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.HK..#..#K.#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.!F.v#.....#", "#.....#...F.#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 5, "kind": "warden", "dir": "U", "patrol": [[8, 5], [8, 4], [8, 3]] }, { "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [2, 4], [2, 3]] }], "links": [{ "gate": [6, 4], "lever": [2, 6] }] }, { "id": "gen-48", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#...F.#", "#.!F.v#..#..#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.HK..#...K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 3, "kind": "warden", "dir": "D", "patrol": [[8, 3], [8, 4], [8, 5]] }, { "x": 3, "y": 5, "kind": "slime", "dir": "U", "patrol": [[3, 5], [3, 4], [2, 4], [2, 5]] }], "links": [{ "gate": [6, 4], "lever": [2, 2] }] }, { "id": "gen-49", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#.....#.....#", "#..#..#..KH.#", "#.F...#.....#", "#E....G.....#", "#.....#.....#", "#.K...#v.F!.#", "#.....#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-50", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.HK..#.....#", "#.....#...F.#", "#.....G....E#", "#.....#.....#", "#.!F.v#..#K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 5, "kind": "warden", "dir": "U", "patrol": [[8, 5], [8, 4], [8, 3]] }, { "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [2, 4], [2, 3]] }], "links": [{ "gate": [6, 4], "lever": [2, 6] }] }
 ];
```

#### lib/puzzle/controller.js

```diff
diff --git a/lib/puzzle/controller.js b/lib/puzzle/controller.js
index 36d58a2..f4d6c7a 100644
--- a/lib/puzzle/controller.js
+++ b/lib/puzzle/controller.js
@@ -5,7 +5,7 @@
 import { CAMPAIGN_LEVELS } from './campaign';
 import { newSession, move, undo as undoSim, restart as restartSim, exitStatus } from './sim';
 import { drawPuzzle } from './render';
-import { loadProgress, saveProgress, recordPuzzleResult, isUnlocked, appleCoins } from '../progress';
+import { loadProgress, saveProgress, recordPuzzleResult, isUnlocked, appleCoins, mergeProgress } from '../progress';
 
 const BLOCKERS = ['help', 'orientation', 'hidden'];
 const KEY_OF = { '0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R', '0,0': 'W' };
@@ -21,7 +21,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   let progress = store.load();
   let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
   const pauseReasons = new Set();
-  let destroyed = false, completed = false, message = '';
+  let destroyed = false, completed = false, message = '', savePending = false, lastResult = null;
   const firstOpen = () => { const i = L.findIndex((l, k) => isUnlocked(progress, L, k) && !progress.puzzle.levels[l.id]); return i === -1 ? 0 : i; };
   let selected = firstOpen();
   let session = L.length ? newSession(L[selected]) : null;
@@ -34,7 +34,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
   const clockNow = nowOpt || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
   const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
-  let anim = null, fx = [], rafId = 0, inputQueue = [], pauseAt = null;
+  let anim = null, fx = [], rafId = 0, pendingInput = null, pauseAt = null;
   const currentView = () => {
     const t = pauseAt === null ? clockNow() : pauseAt, v = {};
     if (anim) { const p = (t - anim.t0) / anim.dur; if (p < 1) v.anim = { from: anim.from, guards: anim.guards, p: Math.max(0, p) }; }
@@ -48,7 +48,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     if (anim && t - anim.t0 >= anim.dur) anim = null;
     fx = fx.filter(f => t - f.t0 < f.dur);
     drawNow();
-    if (!anim && inputQueue.length && state === 'playing') { const d = inputQueue.shift(); setDir(d.x, d.y); }
+    if (!anim && pendingInput && state === 'playing') { const d = pendingInput; pendingInput = null; setDir(d.x, d.y, d); }
     if ((anim || fx.length) && raf && !rafId) rafId = raf(pump);
   }
   function drawNow() { if (session && !destroyed) drawPuzzle(ctx, canvas.width, canvas.height, session, currentView()); }
@@ -68,8 +68,10 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
   // Ringkasan penjaga untuk HUD: null bila level tanpa penjaga; 'chase' > 'return' > 'stunned' > 'idle'.
   function guardStatus() {
-    const gs = session.state.guards || [];
+    const gs = (session.state.guards || []).filter(g => g.hp !== 0);
     if (!gs.length) return null;
+    if (gs.some(g => g.cd === 0 && g.mode === 'windup')) return 'windup';
+    if (gs.some(g => g.cd === 0 && g.mode === 'recover')) return 'recover';
     if (gs.some(g => g.cd === 0 && g.mode === 'alert')) return 'alert';
     if (gs.some(g => g.cd === 0 && g.mode === 'chase')) return 'chase';
     if (gs.some(g => g.cd === 0 && g.mode === 'return')) return 'return';
@@ -83,18 +85,20 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
       steps: session.state.steps, par: lv.par, best: currentBest(lv, rec),
       keys: { have: st.keysHave, need: st.keysNeed }, plates: { active: st.platesActive, need: st.platesNeed },
       hammer: session.state.hammer || 0, shield: session.state.shield || 0, guard: guardStatus(), tier: lv.tier || '',
+      hearts: session.state.hearts, enemies: { left: session.state.guards.filter(g => g.hp !== 0).length, total: lv.guards.length },
+      levers: { active: lv.gates.filter(g => g.open === 'lever' && session.state.cleared.includes(g.x + ',' + g.y)).length, total: lv.gates.filter(g => g.open === 'lever').length },
       apples: session.state.apples || 0, applesTotal: lv.foods.length, coins: appleCoins(progress),
-      legend: [lv.cracks.length && { icon: 'hammer', text: 'Batu krem retak → pakai palu' }, lv.gates.length && { icon: 'lock', text: 'Pagar: panah bisa lewat, palang tunggu' }, lv.guards.length && { icon: 'eye', text: 'Jejak titik = patroli · ! = siap mengejar' }].filter(Boolean),
+      legend: [lv.cracks.length && { icon: 'hammer', text: 'Batu krem retak → pakai palu' }, lv.gates.length && { icon: 'lock', text: 'Injak tuas untuk membuka jeruji' }, lv.guards.length && { icon: 'eye', text: 'Arah ke musuh = serang · petak ! = hindari' }].filter(Boolean),
       message, canUndo: state === 'playing' && session.history.length > 0, status: session.state.status,
     };
   }
   function emitFullState() {
-    if (!session) { emit({ running: false, paused: false, puzzle: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null, puzzleMenu: { levels: [], selected: 0 }, mode: 'puzzle', modeLabel: 'Snake · Jejak Kunci', effects: [], mpHud: null, timerText: null, score: 0, best: 0 }); return; }
+    if (!session) { emit({ running: false, paused: false, puzzle: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null, puzzleMenu: { levels: [], selected: 0 }, mode: 'puzzle', modeLabel: 'Snake · Dungeon', effects: [], mpHud: null, timerText: null, score: 0, best: 0 }); return; }
     const rec = progress.puzzle.levels[session.level.id];
     emit({
-      score: session.state.steps, best: currentBest(session.level, rec), modeLabel: 'Snake · Jejak Kunci', mode: 'puzzle',
+      score: session.state.steps, best: currentBest(session.level, rec), modeLabel: 'Snake · Dungeon', mode: 'puzzle',
       effects: [], mpHud: null, timerText: null, running: isActive(), paused: state === 'paused',
-      puzzle: puzzleHud(), puzzleMenu: { levels: L.map((_, i) => levelInfo(i)), selected, coins: appleCoins(progress) }, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
+      puzzle: puzzleHud(), puzzleMenu: { levels: L.map((_, i) => levelInfo(i)), selected, coins: appleCoins(progress), savePending }, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
     });
   }
   function refresh() { emitFullState(); draw(); }
@@ -103,7 +107,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   function startRun() {
     if (!L.length || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false; // hanya berhasil sekali
     session = newSession(L[selected]); completed = false; message = ''; pauseReasons.clear();
-    inputQueue = []; anim = null; fx = []; pauseAt = null;
+    pendingInput = null; anim = null; fx = []; pauseAt = null; lastResult = null;
     state = 'playing';
     emit({ overlay: { phase: 'none' } });
     refresh();
@@ -115,7 +119,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     pauseReasons.add('user');
     if (reason !== 'user') pauseReasons.add(reason);
     if (state === 'playing') {
-      state = 'paused'; pauseAt = clockNow(); inputQueue = [];
+      state = 'paused'; pauseAt = clockNow(); pendingInput = null;
       if (rafId) caf(rafId); rafId = 0;
       refresh();
       emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
@@ -137,7 +141,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
   function returnToMenu() {
     if (state === 'menu') return;
-    state = 'menu'; pauseReasons.clear(); message = ''; inputQueue = []; anim = null; fx = []; pauseAt = null;
+    state = 'menu'; pauseReasons.clear(); message = ''; pendingInput = null; anim = null; fx = []; pauseAt = null;
     if (L.length) session = newSession(L[selected]);
     refresh();
     emit({ overlay: MENU_OVERLAY });
@@ -150,22 +154,23 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
 
   // ----- input: satu input valid = satu langkah. Hanya saat `playing`; tidak memulai/melanjutkan dari arah. -----
-  function setDir(x, y) {
+  function setDir(x, y, meta) {
     if (state !== 'playing') return;
     const k = KEY_OF[x + ',' + y];
     if (!k) return;
     if (anim && clockNow() - anim.t0 < anim.dur && raf && !reducedMotion()) {
-      if (inputQueue.length < 2) inputQueue.push({ x, y });
+      pendingInput = { x, y, ...(meta || {}) };
       return;
     }
+    pendingInput = null;
     const r = move(session, k);
     if (!r.moved) {
       if (r.reason === 'selesai') return;
       message = r.reason === 'tembok' ? 'Terhalang tembok.' : r.reason === 'tubuh' ? 'Terhalang tubuhmu sendiri.' : r.reason === 'berbalik' ? 'Tidak bisa berbalik arah.'
-        : r.reason === 'duri' ? 'Duri! Butuh Perisai (S).' : r.reason === 'retak' ? 'Tembok retak! Butuh Palu (P).' : r.reason === 'gerbang' ? 'Gerbang tertutup di langkah ini.'
+        : r.reason === 'duri' ? 'Duri! Butuh Perisai (S).' : r.reason === 'retak' ? 'Tembok retak! Butuh Palu (P).' : r.reason === 'gerbang' ? 'Gerbang tertutup. Cari tuas yang terhubung.'
         : r.detail && r.detail.keysMissing ? `Pintu terkunci: butuh ${r.detail.keysMissing} kunci lagi.`
         : `Pintu terkunci: sakelar ${(r.detail ? r.detail.missingPlates : []).map(s => s.toUpperCase()).join(', ')} belum diaktifkan.`;
-      // Puzzle tidak bisa 'mati': gerakan tertahan memakai bunyi tumbukan lembut, bukan peringatan bahaya (eits).
+      // Gerakan tertahan tidak memakai giliran; bunyi tumbukan dibedakan dari peringatan musuh.
       if (r.reason === 'pintu') { if (sounds.playLocked) sounds.playLocked(); } else if (r.reason !== 'berbalik') { if (sounds.playBump) sounds.playBump(); }
       refresh();
       return;
@@ -173,10 +178,11 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     const prevSnake = session.state.snake, prevGuards = session.state.guards;
     session = r.session;
     const head = session.state.snake[0];
-    beginAnim(prevSnake, [r.events.ate && { kind: 'pop', x: head.x, y: head.y }, r.events.key && { kind: 'key', x: head.x, y: head.y }, r.events.warped && { kind: 'warp', x: head.x, y: head.y }].filter(Boolean), prevGuards);
+    beginAnim(prevSnake, [r.events.ate && { kind: 'pop', x: head.x, y: head.y }, r.events.key && { kind: 'key', x: head.x, y: head.y }, r.events.warped && { kind: 'warp', x: head.x, y: head.y }, r.events.attackAt && { kind: 'hit', ...r.events.attackAt }, r.events.hurt && { kind: 'hurt', x: head.x, y: head.y }].filter(Boolean), prevGuards);
     const ev = r.events;
-    message = ev.won ? '' : ev.stung ? '' : ev.shielded ? 'Perisai menahan sengatan! Penjaga pingsan sebentar.' : ev.alerted ? 'Terlihat! Satu giliran untuk kabur atau sembunyi.'
-      : ev.pickup === 'shield' ? 'Perisai didapat!' : ev.pickup === 'hammer' ? 'Palu didapat! Cari batu krem yang retak.' : ev.key ? 'Kunci didapat!' : ev.ate ? '+1 koin apel. Bawa keluar untuk menyimpannya.' : ev.switchOn ? 'Sakelar aktif, tidak perlu ditahan.' : ev.warped ? 'Lewat portal.' : k === 'W' ? 'Menunggu satu giliran.' : '';
+    message = ev.won ? '' : ev.stung ? '' : ev.hurt ? `Kena serangan! Hati ${session.state.hearts}/3. Hindari petak bertanda !.` : ev.shielded ? 'Perisai menahan serangan! Penjaga pingsan sebentar.' : ev.defeated ? 'Musuh tumbang! Jalannya sekarang bebas.' : ev.hit ? 'Kena! Arahkan lagi ke musuh untuk menyerang.' : ev.alerted ? 'Terlihat! Satu giliran untuk kabur atau sembunyi.'
+      : session.state.guards.some(g => g.hp !== 0 && g.mode === 'windup') ? 'Serangan disiapkan! Keluar dari petak bertanda !.'
+      : ev.leverOn ? 'Tuas aktif. Jeruji terbuka permanen.' : ev.pickup === 'heal' ? `Hati dipulihkan: ${session.state.hearts}/3.` : ev.pickup === 'shield' ? 'Perisai didapat!' : ev.pickup === 'hammer' ? 'Palu didapat! Cari batu krem yang retak.' : ev.key ? 'Kunci didapat!' : ev.ate ? '+1 koin apel. Bawa keluar untuk menyimpannya.' : ev.switchOn ? 'Sakelar aktif, tidak perlu ditahan.' : ev.warped ? 'Lewat portal.' : k === 'W' ? 'Menunggu satu giliran.' : '';
     if (ev.ate || ev.key || ev.pickup) sounds.playChomp(); else sounds.playMove();
     if (ev.alerted && !ev.stung && !ev.won && sounds.playEits) sounds.playEits();
     if (ev.won) win(); else if (ev.stung) lose(); else refresh();
@@ -184,7 +190,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
 
   function undo() {
     if (state !== 'playing') return false;
-    inputQueue = [];
+    pendingInput = null;
     const r = undoSim(session);
     if (!r.undone) { message = 'Belum ada langkah untuk dibatalkan.'; refresh(); return false; }
     const before = session.state.snake, beforeGuards = session.state.guards;
@@ -195,8 +201,8 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
   function restartLevel() {
     if (state !== 'playing') return false;
-    inputQueue = [];
-    session = restartSim(session); completed = false; message = 'Level diulang.'; anim = null; fx = [];
+    pendingInput = null;
+    session = restartSim(session); completed = false; message = 'Ruang diulang.'; anim = null; fx = [];
     refresh();
     return true;
   }
@@ -204,29 +210,46 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   // Selesai level: dicatat SEKALI per percobaan (`completed`), progres disimpan sekali, level berikutnya terbuka.
   function win() {
     if (completed || state !== 'playing') return;
-    completed = true; state = 'won'; inputQueue = [];
+    completed = true; state = 'won'; pendingInput = null;
     const lv = session.level, steps = session.state.steps;
-    const r = recordPuzzleResult(store.load(), lv.id, steps, lv.revision || 1, session.state.apples);
+    const r = recordPuzzleResult(mergeProgress(progress, store.load()), lv.id, steps, lv.revision || 1, session.state.apples);
     progress = r.progress;
-    const saved = store.save(progress) !== false;
+    persistProgress();
     const hasNext = selected + 1 < L.length;
     const isLast = !hasNext;
     if (hasNext) selected += 1;
     if (sounds.playWin) sounds.playWin();
-    const notes = [r.newBest && !r.firstClear ? 'Rekor baru!' : null, steps <= lv.par ? 'Par tercapai!' : null,
-      saved ? `+${r.earned || 0} koin apel · saldo ${appleCoins(progress)}` : 'Progres belum tersimpan; penyimpanan browser ditolak.'].filter(Boolean);
+    const notes = [r.newBest && !r.firstClear ? 'Rekor baru!' : null, steps <= lv.par ? 'Par tercapai!' : null].filter(Boolean);
+    lastResult = { title: isLast ? 'Semua Ruang Tamat!' : 'Ruang Selesai!', sub: `Langkah: ${steps} • Acuan: ${lv.par}${notes.length ? ' • ' + notes.join(' ') : ''}`, earned: r.earned || 0, btnText: hasNext ? 'Ruang Berikutnya' : 'Main Lagi' };
     refresh();
-    emit({ overlay: { phase: 'gameover', mood: 'win', title: isLast ? 'Semua Level Tamat!' : 'Level Selesai!', sub: `Langkah: ${steps} • Par: ${lv.par}${notes.length ? ' • ' + notes.join(' ') : ''}`, btnText: hasNext ? 'Level Berikutnya' : 'Main Lagi' } });
+    emitWin();
   }
 
-  // Tersengat penjaga = game over: sekali per percobaan, tanpa menyimpan progres. "Coba Lagi" memulai level yang sama.
+  function persistProgress() {
+    try { savePending = store.save(progress) === false; } catch (e) { savePending = true; }
+    return !savePending;
+  }
+  function emitWin() {
+    if (!lastResult) return;
+    emit({ overlay: { phase: 'gameover', mood: 'win', title: lastResult.title, btnText: lastResult.btnText,
+      sub: lastResult.sub + (savePending ? ' • Progres belum tersimpan; coba simpan lagi.' : ` • +${lastResult.earned} koin apel · saldo ${appleCoins(progress)}`) } });
+  }
+  function retrySave() {
+    if (!savePending || isActive()) return false;
+    progress = mergeProgress(progress, store.load());
+    const saved = persistProgress(); refresh();
+    if (state === 'won') emitWin();
+    return saved;
+  }
+
+  // Tiga hati habis = game over: sekali per percobaan, tanpa menyimpan progres. "Coba Lagi" memulai level yang sama.
   function lose() {
     if (completed || state !== 'playing') return;
-    completed = true; state = 'lost'; inputQueue = [];
+    completed = true; state = 'lost'; pendingInput = null;
     const steps = session.state.steps;
     if (sounds.playDeath) sounds.playDeath();
     refresh();
-    emit({ overlay: { phase: 'gameover', mood: 'shock', title: 'Tersengat!', sub: `Penjaga menangkapmu di langkah ${steps}. Level ${L.indexOf(session.level) + 1}`, btnText: 'Coba Lagi' } });
+    emit({ overlay: { phase: 'gameover', mood: 'shock', title: 'Hati Habis!', sub: `Kalah di langkah ${steps}. Ruang ${L.indexOf(session.level) + 1}. Hindari sasaran ! atau serang penjaga lebih dulu.`, btnText: 'Coba Lagi' } });
   }
 
   draw();
@@ -236,7 +259,8 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   return {
     setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
     setLevel, startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu,
-    setDir, undo, restartLevel,
+    setDir, undo, restartLevel, retrySave,
+    cancelHeldInput(source) { if (pendingInput?.repeat && pendingInput.source === source) pendingInput = null; },
     isRunning: isActive, getState: () => state,
     destroy() { destroyed = true; if (rafId) caf(rafId); rafId = 0; },
   };
```

#### lib/puzzle/generator.js

```diff
diff --git a/lib/puzzle/generator.js b/lib/puzzle/generator.js
index 4d4f44b..c35c6d0 100644
--- a/lib/puzzle/generator.js
+++ b/lib/puzzle/generator.js
@@ -1,15 +1,15 @@
-// Generator level "Jejak Kunci" — MURNI dan deterministik: (seedRun, nomorLevel) -> level yang sama persis.
-// Tanpa Math.random / jam. Hanya memakai createRng(seed) dan solver BFS dari sim.js.
+// Generator level "Dungeon" — MURNI dan deterministik: (seedRun, nomorLevel) -> level yang sama persis.
+// Tanpa Math.random / jam. Hanya memakai createRng(seed) dan solver BFS/A* dari sim.js.
 //
 // Level 1..5 = tutorial buatan tangan (levels.js). Level 6..50 dibuat sistem:
 //   1. Papan dibagi menjadi 2..4 "ruang" oleh dinding pembatas. Tiap pembatas punya SATU penghalang wajib:
-//      celah terbuka, portal berpasangan (pembatas utuh), duri (butuh Perisai), tembok retak (butuh Palu), atau gerbang genap/ganjil.
+//      celah terbuka, portal berpasangan (pembatas utuh), duri (butuh Perisai), tembok retak (butuh Palu), atau jeruji bertuas.
 //      Jadi tiap penghalang pasti harus dilewati; pickup yang dibutuhkan selalu ditaruh di ruang SEBELUM penghalangnya.
-//   2. Ular mulai di ruang pertama, pintu keluar di ruang terakhir. Kunci, makanan, pilar, semak, dan penjaga disebar dengan RNG.
-//      Tier akhir menambah kantong pintu + sakelar permanen dan penjaga dengan rute patroli.
-//   3. Solver BFS memutuskan: level yang tidak bisa diselesaikan DITOLAK; par = panjang solusi optimum.
-//   4. Dibuat beberapa kandidat; dipilih yang par-nya paling dekat dengan kurva target (makin lama makin susah, monoton pada rata-rata).
-//   5. Bila semua gagal: turunkan ke tier sebelumnya; bila tetap gagal: level cadangan yang tetap valid. Tidak ada loop tanpa batas.
+//   2. Ular mulai di ruang pertama, pintu keluar di ruang terakhir. Kunci, makanan, pilar dan semak disebar dengan RNG; combat memakai template aman yang dicerminkan.
+//      Tier akhir menambah satu penjaga, lalu dua jenis penjaga dengan rute patroli.
+//   3. Solver BFS/A* memutuskan: level yang tidak bisa diselesaikan DITOLAK; par = panjang solusi optimum.
+//   4. Puzzle membandingkan par beberapa kandidat; combat meningkatkan HP/jenis/jumlah musuh, bukan hanya panjang rute.
+//   5. Tidak menurunkan tier diam-diam. Build menolak level cadangan; jumlah musuh sesuai tier wajib terpenuhi.
 import { createRng } from '../sim/rng';
 import { buildLevel, solve, DIRS } from './sim';
 import { LEVELS } from './levels';
@@ -18,18 +18,17 @@ export const MAX_LEVEL = 50;
 export const TUTORIAL_COUNT = 5;
 const SOLVE_BUDGET = 12000;   // batas state solver per kandidat
 const WORK_BUDGET = 80000;   // batas total state solver per level pada tier-nya (setelah itu: ambil kandidat terbaik)
-const LOWER_BUDGET = 50000;  // batas total bila harus turun ke tier lebih rendah
 const CANDIDATES = 3;         // kandidat valid yang dibandingkan per level
-const MAX_ATTEMPTS = 40;      // percobaan pembuatan per tier sebelum turun tier
+const MAX_ATTEMPTS = 40;      // percobaan pembuatan per tier pada tier yang sama
 
 // Tier: elemen baru muncul bertahap. `intro` = elemen yang diperkenalkan pada level pertama tier itu (untuk kartu pengantar UI).
 export const TIERS = [
   { id: 't1', name: 'Lorong Kunci', from: 6, to: 12, W: [11, 13], H: [7, 9], sections: [2, 3], barriers: ['gap'], keys: [1, 1], foods: [1, 1], pillars: [1, 3], plate: false, guards: [0, 0], intro: null },
   { id: 't2', name: 'Lompatan Portal', from: 13, to: 19, W: [12, 14], H: [7, 9], sections: [3, 3], barriers: ['gap', 'portal'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'portal' },
   { id: 't3', name: 'Duri dan Retak', from: 20, to: 27, W: [13, 15], H: [7, 9], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'duri' },
-  { id: 't4', name: 'Gerbang Bergantian', from: 28, to: 34, W: [14, 16], H: [7, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [1, 2], pillars: [3, 5], plate: true, guards: [0, 0], intro: 'gerbang' },
-  { id: 't5', name: 'Penjaga Kebun', from: 35, to: 42, W: [15, 17], H: [9, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [2, 3], pillars: [3, 5], plate: true, guards: [1, 1], bushes: [2, 3], intro: 'penjaga' },
-  { id: 't6', name: 'Penjaga Ganda', from: 43, to: 50, W: [15, 17], H: [9, 13], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 3], foods: [2, 3], pillars: [3, 6], plate: true, guards: [1, 2], bushes: [3, 4], intro: null },
+  { id: 't4', name: 'Ruang Tuas', from: 28, to: 34, W: [14, 16], H: [7, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [1, 2], pillars: [3, 5], plate: true, guards: [0, 0], intro: 'gerbang' },
+  { id: 't5', name: 'Penjaga Dungeon', from: 35, to: 42, guards: [1, 1], intro: 'penjaga' },
+  { id: 't6', name: 'Penjaga Ganda', from: 43, to: 50, guards: [2, 2], intro: null },
 ];
 
 export const tierOf = (n) => TIERS.find(t => n >= t.from && n <= t.to) || null;
@@ -51,6 +50,7 @@ const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
 
 // Satu percobaan membuat spec level (peta + ular + penjaga) untuk tier tertentu. Mengembalikan null bila tata letak gagal.
 function buildSpec(rng, tier, n) {
+  if (n >= 35) return dungeonRoom(rng, n);
   const W = ri(rng, tier.W), H = ri(rng, tier.H);
   const innerW = W - 2;
   const k = Math.min(ri(rng, tier.sections), Math.floor((innerW + 1) / 4)); // tiap ruang >= 3 sel + pembatas
@@ -76,7 +76,7 @@ function buildSpec(rng, tier, n) {
   const gapRows = [];
   const needs = []; // { kind, sec } pickup yang harus ada di ruang <= sec
   const portals = [];
-  let gateKind = 0;
+  const links = [], gateNeeds = [];
   divs.forEach((dx, i) => {
     const gy = 1 + Math.floor(rng() * (H - 2));
     gapRows.push(gy);
@@ -85,7 +85,7 @@ function buildSpec(rng, tier, n) {
     if (b === 'gap') grid[gy][dx] = '.';
     else if (b === 'spike') { grid[gy][dx] = '^'; needs.push({ kind: 'S', sec: i }); }
     else if (b === 'crack') { grid[gy][dx] = 'x'; needs.push({ kind: 'P', sec: i }); }
-    else if (b === 'gate') { grid[gy][dx] = (gateKind++ % 2 === 0) === (rng() < 0.5) ? 'g' : 'h'; }
+    else if (b === 'gate') { grid[gy][dx] = 'G'; gateNeeds.push({ x: dx, y: gy, sec: i }); }
     else if (b === 'portal') portals.push({ i, id: String(portals.length + 1) });
   });
   if (portals.length > 3) return null;
@@ -137,6 +137,11 @@ function buildSpec(rng, tier, n) {
   for (let i = 0; i < keys; i++) if (!take(Math.floor(rng() * k), 'K')) return null;
   // pickup yang dibutuhkan penghalang: di ruang <= pembatasnya
   for (const nd of needs) if (!take(Math.floor(rng() * (nd.sec + 1)), nd.kind)) return null;
+  for (const nd of gateNeeds) {
+    const lever = take(nd.sec, '!');
+    if (!lever) return null;
+    links.push({ gate: [nd.x, nd.y], lever: [lever.x, lever.y] });
+  }
   // portal: ujung A di ruang i, ujung B di ruang i+1
   for (const p of portals) { if (!take(p.i, p.id) || !take(p.i + 1, p.id)) return null; }
   // Koin bonus opsional, terpisah dari syarat pintu keluar.
@@ -172,11 +177,37 @@ function buildSpec(rng, tier, n) {
   return {
     map: grid.map(r => r.join('')),
     snake: [[hp.x, hp.y]], dir: dk, exit: exitSpec,
-    guards: guardSpecs,
+    guards: guardSpecs, links,
     features: { barriers: [...new Set(barriers)], keys, plate: !!plate, guards: guardSpecs.length, patrol: guardSpecs.some(g => g.patrol) },
   };
 }
 
+// Ruangan combat memakai fondasi yang teruji, lalu dicerminkan dan diberi variasi.
+// Kunci, tuas, dan peti dijaga di jalur yang berarti; jumlah musuh tidak diturunkan diam-diam.
+function dungeonRoom(rng, n) {
+  const w = n >= 43 ? 13 : 11, h = 9, divider = Math.floor(w / 2);
+  const map = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.'));
+  for (let y = 1; y < h - 1; y++) map[y][divider] = '#';
+  const flipX = rng() < .5, flipY = rng() < .5;
+  const turn = (x, y) => [flipX ? w - 1 - x : x, flipY ? h - 1 - y : y];
+  const gate = [divider, 4], lever = [2, 2], keyY = rng() < .5 ? 2 : 6;
+  map[gate[1]][gate[0]] = 'G'; map[lever[1]][lever[0]] = '!';
+  map[6][3] = 'K'; map[keyY][w - 3] = 'K'; map[4][w - 2] = 'E';
+  map[2][3] = 'F'; map[7 - keyY][w - 3] = 'F';
+  if (n % 3 === 0) map[1][w - 3] = 'F';
+  map[6][2] = 'H'; map[2][divider - 1] = 'v';
+  if (n % 2) map[6][w - 4] = '#'; else map[2][w - 4] = '#';
+  const right = divider + 2;
+  const guards = [{ x: right, y: 3, kind: n < 39 ? 'slime' : 'warden', dir: 'D', patrol: [[right, 3], [right, 4], [right, 5]] }];
+  if (n >= 43) guards.push({ x: 3, y: 5, kind: 'slime', dir: 'U', patrol: [[3, 5], [3, 4], [2, 4], [2, 5]] });
+  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
+  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [a, b] = turn(x, y); rows[b][a] = map[y][x]; }
+  return { map: rows.map(r => r.join('')), snake: [turn(1, 4)], dir: flipX ? 'L' : 'R', exit: { keys: 2, plates: [] },
+    links: [{ gate: turn(...gate), lever: turn(...lever) }],
+    guards: guards.map(g => { const [x, y] = turn(g.x, g.y); return { ...g, x, y, dir: flipY ? (g.dir === 'U' ? 'D' : 'U') : g.dir, patrol: g.patrol.map(p => turn(...p)) }; }),
+    features: { barriers: ['gate'], keys: 2, plate: false, guards: guards.length, patrol: true } };
+}
+
 function goalText(f) {
   const bits = ['Capai pintu keluar.'];
   if (f.keys) bits.push(f.keys === 1 ? 'Ambil kunci dulu.' : `Ambil ${f.keys} kunci dulu.`);
@@ -184,8 +215,8 @@ function goalText(f) {
   if (f.barriers.includes('portal')) bits.push('Pakai portal untuk pindah ruang.');
   if (f.barriers.includes('spike')) bits.push('Duri butuh Perisai.');
   if (f.barriers.includes('crack')) bits.push('Tembok retak butuh Palu.');
-  if (f.barriers.includes('gate')) bits.push('Gerbang hanya terbuka pada langkah genap/ganjil.');
-  if (f.guards) bits.push('Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran.');
+  if (f.barriers.includes('gate')) bits.push('Injak tuas untuk membuka gerbang permanen.');
+  if (f.guards) bits.push('Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan.');
   bits.push('Koin apel opsional, disimpan setelah keluar.');
   return bits.join(' ');
 }
@@ -197,10 +228,10 @@ function attempt(seed, tier, n, stats) {
   const spec = buildSpec(rng, tier, n);
   if (!spec) { DIAG.nospec++; return null; }
   const features = spec.features;
-  const base = { id: `g${n}-${seed.toString(16)}`, name: tier.name, goal: goalText(features), par: 1, map: spec.map, snake: spec.snake, dir: spec.dir, exit: spec.exit, guards: spec.guards };
+  const base = { id: `g${n}-${seed.toString(16)}`, name: tier.name, goal: goalText(features), par: 1, map: spec.map, snake: spec.snake, dir: spec.dir, exit: spec.exit, guards: spec.guards, links: spec.links || [] };
   const first = buildLevel(base);
   if (!first.level) { DIAG.invalid++; return null; }
-  const path = solve(first.level, SOLVE_BUDGET, stats);
+  const path = solve(first.level, n >= 35 ? 60000 : SOLVE_BUDGET, stats);
   if (!path) { DIAG.unsolved++; return null; }
   DIAG.ok++;
   const built = buildLevel({ ...base, par: path.length });
@@ -234,17 +265,17 @@ export function getLevel(n, runSeed = 0) {
   let tierIdx = TIERS.findIndex(t => n >= t.from && n <= t.to);
   const target = targetPar(n);
   let result = null, attempts = 0;
-  for (let ti = tierIdx; ti >= 0 && !result; ti--) {
+  for (let ti = tierIdx; ti === tierIdx && !result; ti--) {
     const tier = TIERS[ti];
-    const budget = ti === tierIdx ? WORK_BUDGET : LOWER_BUDGET;
+    const budget = WORK_BUDGET;
     const stats = { states: 0 };
     const cands = [], weak = [];
-    for (let a = 0; a < MAX_ATTEMPTS && cands.length < CANDIDATES && stats.states < budget; a++) {
+    for (let a = 0; a < MAX_ATTEMPTS && cands.length < (n >= 35 ? 1 : CANDIDATES) && stats.states < budget; a++) {
       attempts++;
       const sd = mixSeed(seed0, ti * 1000 + a);
       const r = attempt(sd, tier, n, stats);
       if (!r) continue;
-      (r.par >= Math.round(target * 0.6) ? cands : weak).push({ ...r, seed: sd });
+      (n >= 35 || r.par >= Math.round(target * 0.6) ? cands : weak).push({ ...r, seed: sd });
     }
     const pool = cands.length ? cands : weak; // tidak ada yang cukup sulit: ambil yang paling sulit di antara yang valid
     if (pool.length) {
```

#### lib/puzzle/render.js

```diff
diff --git a/lib/puzzle/render.js b/lib/puzzle/render.js
index c76565a..aee944b 100644
--- a/lib/puzzle/render.js
+++ b/lib/puzzle/render.js
@@ -4,7 +4,7 @@ import { exitStatus, activePlates, visionCells, gateOpen } from './sim';
 import { animatedPoints, easeOutCubic } from '../sim/anim';
 
 const C = {
-  bg: '#f3ecd8', floorA: '#c7d6ac', floorB: '#d0ddb7', wall: '#687f58', wallHatch: '#81936d',
+  bg: '#eee7d5', floorA: '#dad5bf', floorB: '#e3dec9', wall: '#67716a', wallHatch: '#90978a',
   food: '#e0453a', leaf: '#6fbf3a', key: '#9d6a13', plateLine: '#3f5961', plateOn: '#6ed3ff', portal: '#c58bff',
   doorLocked: '#6b3f2a', doorOpen: '#e7d38a', ink: '#0e1316', snakeOut: '#304831', snakeIn: '#7cc22d', eye: '#ffffff',
   spike: '#d9dfe3', crack: '#8a7f73', gate: '#b07a3a', bush: '#2f8f4a', bushDark: '#1d6b35', hammer: '#c9a36a', shield: '#6ed3ff', guard: '#e0873a', guardAlert: '#ff5a4a',
@@ -26,7 +26,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
   ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
   for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) { ctx.fillStyle = (x + y) % 2 ? C.floorA : C.floorB; ctx.fillRect(px(x), py(y), cell, cell); }
   level.walls.forEach(w => {
-    ctx.fillStyle = C.wall; ctx.strokeStyle = '#425638'; ctx.lineWidth = 2;
+    ctx.fillStyle = C.wall; ctx.strokeStyle = '#46534b'; ctx.lineWidth = 2;
     ctx.beginPath(); ctx.roundRect(px(w.x) + 1, py(w.y) + 1, cell - 2, cell - 2, cell * 0.16); ctx.fill(); ctx.stroke();
     ctx.strokeStyle = C.wallHatch; ctx.beginPath(); ctx.moveTo(px(w.x) + cell * 0.2, py(w.y) + cell * 0.23); ctx.lineTo(px(w.x) + cell * 0.75, py(w.y) + cell * 0.23); ctx.stroke();
   });
@@ -44,7 +44,8 @@ export function drawPuzzle(ctx, W, H, session, view) {
   });
 
   // Rute yang direncanakan terbaca sebagai jejak kecil; area pandang tetap lebih dominan.
-  level.guards.forEach(g => {
+  level.guards.forEach((g, i) => {
+    if (state.guards[i]?.hp === 0) return;
     ctx.fillStyle = 'rgba(105,74,39,.45)';
     (g.patrol || []).forEach(p => { ctx.beginPath(); ctx.arc(cxm(p.x), cym(p.y), Math.max(1.6, cell * 0.045), 0, Math.PI * 2); ctx.fill(); });
   });
@@ -52,7 +53,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
   // area pandang penjaga (di bawah semua objek): garis miring + bingkai; putus-putus = waspada diam, solid = mengejar
   const stepNext = state.steps + 1;
   (state.guards || []).forEach(g => {
-    if (g.cd > 0) return;
+    if (g.cd > 0 || g.hp === 0) return;
     const chasing = g.mode === 'chase' || g.mode === 'alert';
     visionCells(level, state, g, stepNext).forEach(c => {
       ctx.fillStyle = chasing ? 'rgba(255,90,74,.22)' : 'rgba(224,135,58,.18)'; ctx.fillRect(px(c.x), py(c.y), cell, cell);
@@ -61,7 +62,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
     });
   });
 
-  // rintangan: duri (segitiga), tembok retak (blok retak), gerbang (garis + angka 2 = genap / 1 = ganjil). Bentuk + label, bukan hanya warna.
+  // rintangan: duri (segitiga), tembok retak (blok retak), jeruji dan tuas bernomor sama. Bentuk + label, bukan hanya warna.
   const gone = new Set(state.cleared || []);
   level.spikes.filter(p => !gone.has(p.x + ',' + p.y)).forEach(p => {
     ctx.fillStyle = C.spike; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
@@ -77,23 +78,30 @@ export function drawPuzzle(ctx, W, H, session, view) {
     // Pecahan kecil di kaki batu membedakan dari blok yang tidak bisa dihancurkan.
     ctx.fillStyle = '#fff0cc'; ctx.fillRect(px(p.x) + cell * 0.72, py(p.y) + cell * 0.7, cell * 0.13, cell * 0.13);
   });
-  level.gates.forEach(p => {
-    const open = gateOpen(p, stepNext);
-    ctx.fillStyle = open ? 'rgba(245,253,223,.8)' : '#f1d8ad';
-    ctx.fillRect(px(p.x) + 2, py(p.y) + 2, cell - 4, cell - 4);
-    ctx.strokeStyle = '#725333'; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.fillStyle = '#c1965a';
-    for (const side of [0.1, 0.78]) { ctx.beginPath(); ctx.roundRect(px(p.x) + cell * side, py(p.y) + cell * 0.08, cell * 0.12, cell * 0.84, cell * 0.04); ctx.fill(); ctx.stroke(); }
-    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, cell * 0.07);
-    if (open) {
-      ctx.strokeStyle = '#376746';
-      ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.32, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.66, cym(p.y));
-      ctx.moveTo(px(p.x) + cell * 0.52, py(p.y) + cell * 0.34); ctx.lineTo(px(p.x) + cell * 0.68, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.52, py(p.y) + cell * 0.66); ctx.stroke();
-    } else {
-      ctx.strokeStyle = '#925739';
-      for (const yy of [0.32, 0.68]) { ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.15, py(p.y) + cell * yy); ctx.lineTo(px(p.x) + cell * 0.86, py(p.y) + cell * yy); ctx.stroke(); }
-      ctx.fillStyle = '#9c4234'; ctx.beginPath(); ctx.arc(cxm(p.x), cym(p.y), cell * 0.19, 0, Math.PI * 2); ctx.fill();
-      ctx.strokeStyle = '#fff5dc'; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.41, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.59, cym(p.y)); ctx.stroke();
+  level.gates.forEach((p, i) => {
+    const open = gateOpen(p, stepNext, state), x = px(p.x), y = py(p.y);
+    ctx.fillStyle = open ? '#e7dfbf' : '#a7a89a';
+    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
+    ctx.strokeStyle = '#49564f'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineCap = 'round';
+    // Jeruji terangkat ke ambang atas saat terbuka, tanpa panah arah palsu.
+    for (const xx of [0.23, 0.41, 0.59, 0.77]) {
+      ctx.beginPath(); ctx.moveTo(x + cell * xx, y + cell * 0.12); ctx.lineTo(x + cell * xx, y + cell * (open ? 0.3 : 0.88)); ctx.stroke();
     }
+    ctx.beginPath(); ctx.moveTo(x + cell * 0.12, y + cell * 0.2); ctx.lineTo(x + cell * 0.88, y + cell * 0.2); ctx.stroke();
+    ctx.fillStyle = '#fff9e6'; ctx.font = `bold ${Math.round(cell * 0.26)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
+    ctx.strokeText(String(i + 1), cxm(p.x), y + cell * 0.22); ctx.fillText(String(i + 1), cxm(p.x), y + cell * 0.22);
+    if (open) { ctx.strokeStyle = '#537247'; ctx.beginPath(); ctx.moveTo(x + cell * 0.34, y + cell * 0.68); ctx.lineTo(x + cell * 0.46, y + cell * 0.79); ctx.lineTo(x + cell * 0.7, y + cell * 0.49); ctx.stroke(); }
+  });
+  (level.levers || []).forEach(p => {
+    const link = (level.links || []).find(l => l.lever[0] === p.x && l.lever[1] === p.y);
+    const i = link ? level.gates.findIndex(g => g.x === link.gate[0] && g.y === link.gate[1]) : -1;
+    const active = i >= 0 && gateOpen(level.gates[i], stepNext, state);
+    ctx.fillStyle = '#839077'; ctx.strokeStyle = '#435244'; ctx.lineWidth = Math.max(2, cell * 0.055);
+    ctx.beginPath(); ctx.ellipse(cxm(p.x), py(p.y) + cell * 0.75, cell * 0.31, cell * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    const hx = px(p.x) + cell * (active ? 0.72 : 0.3), hy = py(p.y) + cell * 0.32;
+    ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.7); ctx.lineTo(hx, hy); ctx.stroke();
+    ctx.fillStyle = active ? '#75ad58' : '#d8914a'; ctx.beginPath(); ctx.arc(hx, hy, cell * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    ctx.fillStyle = '#fffbed'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), hx, hy);
   });
   // semak (tempat bersembunyi) dan pickup Palu (P) / Perisai (S)
   const bushAt = (p) => {
@@ -104,9 +112,12 @@ export function drawPuzzle(ctx, W, H, session, view) {
   state.pickups.forEach(p => {
     ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
     if (p.kind === 'hammer') { ctx.fillStyle = C.hammer; ctx.fillRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.strokeRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.fillStyle = '#e9e1d2'; ctx.fillRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); ctx.strokeRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); }
+    else if (p.kind === 'heal') {
+      ctx.fillStyle = '#d96666'; ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.82); ctx.bezierCurveTo(px(p.x) - cell * 0.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) - cell * 0.05, cxm(p.x), py(p.y) + cell * 0.35); ctx.bezierCurveTo(cxm(p.x), py(p.y) - cell * 0.05, px(p.x) + cell * 1.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) + cell * 0.82); ctx.fill(); ctx.stroke();
+    }
     else { ctx.fillStyle = C.shield; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.55); ctx.lineTo(cxm(p.x), py(p.y) + cell * 0.86); ctx.lineTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
     ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.3)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
-    ctx.fillText(p.kind === 'hammer' ? 'P' : 'S', cxm(p.x), cym(p.y) + (p.kind === 'hammer' ? -cell * 0.02 : -cell * 0.04));
+    ctx.fillText(p.kind === 'hammer' ? 'P' : p.kind === 'heal' ? '+' : 'S', cxm(p.x), cym(p.y) + (p.kind === 'hammer' ? -cell * 0.02 : -cell * 0.04));
   });
 
   // portal: angka + jumlah cincin = nomor pasangan
@@ -146,33 +157,45 @@ export function drawPuzzle(ctx, W, H, session, view) {
     ctx.restore();
   });
 
-  // Kumbang penjaga: kepala/mata mengikuti arah asli, kaki bergerak selama satu langkah.
+  // Musuh dungeon: slime lunak (1 HP) dan penjaga batu berhelm (2 HP).
+  // Siluet dan titik HP membedakan jenis, tidak hanya warnanya.
   (state.guards || []).forEach((g, i) => {
+    if (g.hp === 0) return;
     const old = view.anim && view.anim.guards && view.anim.guards[i];
     const p = view.anim ? easeOutCubic(view.anim.p) : 1;
-    const walk = old && Math.abs(old.x - g.x) + Math.abs(old.y - g.y) <= 1;
+    const walk = old && Math.abs(old.x - g.x) + Math.abs(old.y - g.y) === 1;
     const gx = walk ? old.x + (g.x - old.x) * p : g.x, gy = walk ? old.y + (g.y - old.y) * p : g.y;
-    const stun = g.cd > 0, chasing = g.mode === 'chase', alerted = g.mode === 'alert';
-    ctx.save(); ctx.translate(cxm(gx), cym(gy)); ctx.rotate(Math.atan2(g.dir.y, g.dir.x));
-    ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineCap = 'round';
-    for (const side of [-1, 1]) for (const leg of [-1, 0, 1]) {
-      const wiggle = walk ? Math.sin(p * Math.PI * 2 + leg) * cell * 0.06 : 0;
-      ctx.beginPath(); ctx.moveTo(leg * cell * 0.15, side * cell * 0.21); ctx.lineTo(leg * cell * 0.19 + wiggle, side * cell * 0.39); ctx.stroke();
+    const stun = g.cd > 0, danger = g.mode === 'windup', slime = g.kind === 'slime';
+    if (danger && g.aim && !stun) {
+      ctx.fillStyle = 'rgba(196,61,48,.3)'; ctx.fillRect(px(g.aim.x) + 2, py(g.aim.y) + 2, cell - 4, cell - 4);
+      ctx.strokeStyle = '#b74737'; ctx.lineWidth = 2.5; ctx.strokeRect(px(g.aim.x) + 3, py(g.aim.y) + 3, cell - 6, cell - 6);
+      ctx.fillStyle = '#9b3028'; ctx.font = `bold ${Math.round(cell * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cxm(g.aim.x), cym(g.aim.y));
+    }
+    ctx.save(); ctx.translate(cxm(gx), cym(gy));
+    const squash = walk ? Math.sin(p * Math.PI) * 0.08 : 0;
+    ctx.fillStyle = 'rgba(50,62,49,.2)'; ctx.beginPath(); ctx.ellipse(0, cell * 0.33, cell * 0.35, cell * 0.09, 0, 0, Math.PI * 2); ctx.fill();
+    ctx.scale(1 + squash, 1 - squash);
+    ctx.strokeStyle = '#3b4943'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
+    if (slime) {
+      ctx.fillStyle = stun ? '#a4afa6' : '#82b5b1';
+      ctx.beginPath(); ctx.moveTo(-cell * 0.36, cell * 0.27); ctx.bezierCurveTo(-cell * 0.4, -cell * 0.3, -cell * 0.14, -cell * 0.47, cell * 0.08, -cell * 0.32); ctx.bezierCurveTo(cell * 0.31, -cell * 0.23, cell * 0.38, cell * 0.04, cell * 0.36, cell * 0.27); ctx.quadraticCurveTo(cell * 0.22, cell * 0.38, cell * 0.05, cell * 0.29); ctx.quadraticCurveTo(-cell * 0.17, cell * 0.42, -cell * 0.36, cell * 0.27); ctx.closePath(); ctx.fill(); ctx.stroke();
+    } else {
+      ctx.fillStyle = '#606e6b';
+      for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * cell * 0.21 - cell * 0.11, cell * 0.13, cell * 0.22, cell * 0.2, cell * 0.06); ctx.fill(); ctx.stroke(); }
+      ctx.fillStyle = stun ? '#a3a79a' : '#87968b'; ctx.beginPath(); ctx.roundRect(-cell * 0.34, -cell * 0.3, cell * 0.68, cell * 0.57, cell * 0.13); ctx.fill(); ctx.stroke();
+      ctx.fillStyle = '#bec4ab'; ctx.beginPath(); ctx.moveTo(-cell * 0.37, -cell * 0.1); ctx.lineTo(-cell * 0.28, -cell * 0.36); ctx.lineTo(cell * 0.22, -cell * 0.36); ctx.lineTo(cell * 0.37, -cell * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
     }
-    ctx.fillStyle = stun ? '#9a9c87' : chasing ? '#e66f4c' : '#e7a04c';
-    ctx.beginPath(); ctx.ellipse(-cell * 0.07, 0, cell * 0.31, cell * 0.29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
-    ctx.beginPath(); ctx.moveTo(-cell * 0.35, 0); ctx.lineTo(cell * 0.13, 0); ctx.stroke();
-    ctx.fillStyle = '#8c4f28';
-    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-cell * 0.12, side * cell * 0.15, cell * 0.065, 0, Math.PI * 2); ctx.fill(); }
-    ctx.fillStyle = '#f5d99a'; ctx.beginPath(); ctx.ellipse(cell * 0.21, 0, cell * 0.2, cell * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
     for (const side of [-1, 1]) {
-      ctx.beginPath(); ctx.moveTo(cell * 0.26, side * cell * 0.18); ctx.lineTo(cell * 0.4, side * cell * 0.3); ctx.stroke();
-      ctx.fillStyle = '#fffdf1'; ctx.beginPath(); ctx.arc(cell * 0.28, side * cell * 0.105, cell * 0.095, 0, Math.PI * 2); ctx.fill();
-      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cell * 0.32, side * cell * 0.105, cell * 0.047, 0, Math.PI * 2); ctx.fill();
+      ctx.fillStyle = '#fff8df'; ctx.beginPath(); ctx.ellipse(side * cell * 0.13, -cell * 0.025, cell * 0.09, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
+      ctx.fillStyle = '#34463f'; ctx.beginPath(); ctx.arc(side * cell * 0.13 + g.dir.x * cell * 0.025, -cell * 0.025 + g.dir.y * cell * 0.025, cell * 0.045, 0, Math.PI * 2); ctx.fill();
+      ctx.beginPath(); ctx.moveTo(side * cell * 0.06, -cell * 0.14); ctx.lineTo(side * cell * 0.23, -cell * (danger ? 0.24 : 0.18)); ctx.stroke();
     }
+    ctx.beginPath(); ctx.moveTo(-cell * 0.06, cell * 0.14); ctx.lineTo(cell * 0.06, cell * 0.14); ctx.stroke();
+    const maxHp = slime ? 1 : 2;
+    for (let h = 0; h < maxHp; h++) { ctx.fillStyle = h < g.hp ? '#b94d43' : '#e3d8c4'; ctx.beginPath(); ctx.arc((h - (maxHp - 1) / 2) * cell * 0.15, cell * 0.43, cell * 0.05, 0, Math.PI * 2); ctx.fill(); }
     ctx.restore();
-    const tag = stun ? 'zZ' : chasing ? '!!' : alerted ? '!' : g.mode === 'return' ? '?' : '';
-    if (tag) { ctx.fillStyle = '#fffdf1'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.font = `bold ${Math.round(cell * 0.42)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(tag, cxm(gx), py(gy) - cell * 0.04); ctx.fillText(tag, cxm(gx), py(gy) - cell * 0.04); }
+    const tag = stun ? 'zZ' : danger ? '!' : g.mode === 'alert' ? '?' : g.mode === 'recover' ? '···' : '';
+    if (tag) { ctx.fillStyle = '#fffdf1'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.font = `bold ${Math.round(cell * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(tag, cxm(gx), py(gy) - cell * 0.01); ctx.fillText(tag, cxm(gx), py(gy) - cell * 0.01); }
   });
 
   // Maskot satu petak: tubuh melingkar, kepala besar; hitbox sama dengan gambar.
@@ -181,11 +204,11 @@ export function drawPuzzle(ctx, W, H, session, view) {
   const hd = { x: cxm(cells[0].x), y: cym(cells[0].y) };
   const hop = view.anim ? Math.sin(Math.PI * progress) : 0;
   ctx.fillStyle = 'rgba(48,72,49,.18)'; ctx.beginPath(); ctx.ellipse(hd.x, hd.y + cell * 0.3, cell * 0.35, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
-  ctx.save(); ctx.translate(hd.x, hd.y - cell * 0.07 * hop); ctx.scale(1 - hop * 0.04, 1 + hop * 0.05);
+  ctx.save(); ctx.translate(hd.x, hd.y); ctx.scale(1 - hop * 0.04, 1 + hop * 0.05);
   ctx.strokeStyle = C.snakeOut; ctx.fillStyle = C.snakeIn; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.lineCap = 'round';
   ctx.beginPath(); ctx.ellipse(0, cell * 0.16, cell * 0.34, cell * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
   ctx.strokeStyle = '#50852a'; ctx.lineWidth = Math.max(1.5, cell * 0.04); ctx.beginPath(); ctx.ellipse(-cell * 0.05, cell * 0.17, cell * 0.18, cell * 0.07, 0, 0, Math.PI * 1.7); ctx.stroke();
-  ctx.fillStyle = '#8dc83c'; ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(2, cell * 0.06);
+  ctx.fillStyle = (view.fx || []).some(f => f.kind === 'hurt' && f.p < 0.6) ? '#e7a66b' : '#8dc83c'; ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(2, cell * 0.06);
   ctx.beginPath(); ctx.ellipse(cell * 0.04, -cell * 0.11, cell * 0.31, cell * 0.28, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
   // Wajah menghadap pemain; mata melirik mengikuti arah gerak.
   for (const side of [-1, 1]) {
@@ -195,6 +218,14 @@ export function drawPuzzle(ctx, W, H, session, view) {
   ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(1, cell * 0.035); ctx.beginPath(); ctx.arc(cell * 0.04, -cell * 0.07, cell * 0.09, 0.1, Math.PI - 0.1); ctx.stroke();
   ctx.restore();
 
+  // Tanda serangan tetap di atas maskot, sehingga tidak tertutup kepalanya.
+  (state.guards || []).filter(g => g.hp !== 0 && g.cd === 0 && g.mode === 'windup' && g.aim).forEach(g => {
+    const x = px(g.aim.x) + cell * 0.83, y = py(g.aim.y) + cell * 0.17;
+    ctx.fillStyle = '#b74737'; ctx.strokeStyle = '#fff7dc'; ctx.lineWidth = 1.5;
+    ctx.beginPath(); ctx.arc(x, y, cell * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    ctx.fillStyle = '#fff7dc'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y);
+  });
+
   // kepala di semak = tersembunyi: semak digambar lagi di atas kepala (setengah transparan) + label
   const hb = level.bushes.find(b => b.x === state.snake[0].x && b.y === state.snake[0].y);
   if (hb) {
@@ -208,6 +239,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
     const a = 1 - f.p, r = cell * (0.25 + 0.55 * f.p);
     ctx.lineWidth = 3; ctx.strokeStyle = f.kind === 'warp' ? `rgba(197,139,255,${a})` : f.kind === 'key' ? `rgba(245,197,66,${a})` : `rgba(224,69,58,${a})`;
     ctx.beginPath(); ctx.arc(cxm(f.x), cym(f.y), r, 0, Math.PI * 2); ctx.stroke();
+    if (f.kind === 'hit') { ctx.globalAlpha = a; ctx.strokeStyle = '#fff8cf'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cxm(f.x) - r * 0.5, cym(f.y) + r * 0.5); ctx.lineTo(cxm(f.x) + r * 0.5, cym(f.y) - r * 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
     if (f.kind === 'pop') { ctx.globalAlpha = a; ctx.font = `bold ${Math.round(cell * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#6b4c13'; ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3; ctx.strokeText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.fillText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.globalAlpha = 1; }
   });
```

#### lib/puzzle/sim.js

```diff
diff --git a/lib/puzzle/sim.js b/lib/puzzle/sim.js
index 06c3719..2f41777 100644
--- a/lib/puzzle/sim.js
+++ b/lib/puzzle/sim.js
@@ -1,7 +1,7 @@
-// Jejak Kunci — simulasi murni berbasis giliran. Pemain = maskot satu petak.
+// Dungeon — simulasi murni berbasis giliran. Pemain = maskot satu petak.
 // Apel adalah koin bonus opsional, tidak memanjangkan tubuh. Sakelar tetap aktif
 // setelah diinjak. Semua state termasuk koin, sakelar, dan penjaga dapat di-undo.
-// Penjaga patroli -> tanda seru satu giliran -> kejar posisi terakhir yang terlihat.
+// Penjaga patroli -> waspada -> kejar -> sasaran satu giliran -> serang -> pulih.
 // Sembunyi di semak atau lepas dari pandangan untuk memutus pengejaran.
 
 export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
@@ -11,7 +11,8 @@ const same = (a, b) => a.x === b.x && a.y === b.y;
 // ---------- pembuatan & validasi level ----------
 // Legenda `map`: '#' tembok, '.' lantai, 'F' koin apel, 'K' kunci, 'E' pintu keluar,
 // 'a'..'c' sakelar permanen, '1'..'3' pasangan portal (tepat dua kemunculan per angka).
-// Tahap 9a: '^' duri, 'x' tembok retak, 'g'/'h' gerbang genap/ganjil, 'v' semak, 'P' palu, 'S' perisai.
+// '^' duri, 'x' batu retak, 'G' jeruji, '!' tuas, 'v' semak, 'P' palu, 'S' perisai, 'H' heal.
+// g/h tetap dibaca untuk fixture lama; kampanye memakai G + links.
 // Penjaga tidak ada di peta: spec.guards = [{ x, y, dir: 'U|D|L|R', range?: 1..5, patrol?: [[x,y], ...] }].
 export function buildLevel(spec) {
   const errors = [];
@@ -21,7 +22,7 @@ export function buildLevel(spec) {
   const level = {
     id: spec.id, name: spec.name, goal: spec.goal, par: spec.par, w, h,
     walls: [], foods: [], keys: [], plates: [], portals: [], exit: null,
-    spikes: [], cracks: [], gates: [], bushes: [], pickups: [], guards: [],
+    spikes: [], cracks: [], gates: [], levers: [], links: (spec.links || []).map(l => ({ gate: l.gate.slice(), lever: l.lever.slice() })), bushes: [], pickups: [], guards: [],
     snake: (spec.snake || []).map(([x, y]) => ({ x, y })), dir: null,
   };
   const portalMap = {};
@@ -37,9 +38,12 @@ export function buildLevel(spec) {
       else if (c === '^') level.spikes.push({ x, y });
       else if (c === 'x') level.cracks.push({ x, y });
       else if (c === 'g' || c === 'h') level.gates.push({ x, y, open: c === 'g' ? 'even' : 'odd' });
+      else if (c === 'G') level.gates.push({ x, y, open: 'lever' });
+      else if (c === '!') level.levers.push({ x, y, id: key(x, y) });
       else if (c === 'v') level.bushes.push({ x, y });
       else if (c === 'P') level.pickups.push({ x, y, kind: 'hammer' });
       else if (c === 'S') level.pickups.push({ x, y, kind: 'shield' });
+      else if (c === 'H') level.pickups.push({ x, y, kind: 'heal' });
       else if (c >= 'a' && c <= 'c') level.plates.push({ id: c, x, y });
       else if (c >= '1' && c <= '3') (portalMap[c] = portalMap[c] || []).push({ x, y });
       else if (c !== '.') errors.push(`karakter tidak dikenal '${c}' di (${x},${y})`);
@@ -55,7 +59,8 @@ export function buildLevel(spec) {
   (spec.guards || []).forEach((g, i) => {
     const d = DIRS[g.dir];
     if (!d) { errors.push(`penjaga ${i}: arah tidak valid`); return; }
-    level.guards.push({ x: g.x, y: g.y, dir: { ...d }, range: g.range || 3, patrol: (g.patrol || []).map(([px, py]) => ({ x: px, y: py })) });
+    const kind = g.kind === 'slime' ? 'slime' : 'warden';
+    level.guards.push({ x: g.x, y: g.y, kind, hp: kind === 'slime' ? 1 : 2, dir: { ...d }, range: g.range || 3, patrol: (g.patrol || []).map(([px, py]) => ({ x: px, y: py })) });
   });
   level.wallGrid = new Array(w * h).fill(0);
   level.walls.forEach(wl => { level.wallGrid[wl.y * w + wl.x] = 1; });
@@ -91,6 +96,14 @@ export function validateLevel(level) {
   level.spikes.forEach(p => put(p, 'duri'));
   level.cracks.forEach(p => put(p, 'tembok retak'));
   level.gates.forEach(p => put(p, 'gerbang'));
+  (level.levers || []).forEach(p => put(p, 'tuas'));
+  (level.links || []).forEach(l => {
+    if (!level.gates.some(g => g.open === 'lever' && g.x === l.gate[0] && g.y === l.gate[1])) e.push('tautan gerbang tidak valid');
+    if (!(level.levers || []).some(p => p.x === l.lever[0] && p.y === l.lever[1])) e.push('tautan tuas tidak valid');
+  });
+  level.gates.filter(g => g.open === 'lever').forEach(g => {
+    if (!(level.links || []).some(l => l.gate[0] === g.x && l.gate[1] === g.y)) e.push('gerbang belum terhubung ke tuas');
+  });
   level.bushes.forEach(p => put(p, 'semak'));
   level.pickups.forEach(p => put(p, 'pickup ' + p.kind));
   level.guards.forEach((g, i) => {
@@ -118,10 +131,10 @@ export function validateLevel(level) {
 // ---------- state ----------
 export function initialState(level) {
   return {
-    snake: [{ ...level.snake[0] }], apples: 0, activated: [], dir: { ...level.dir }, steps: 0,
+    snake: [{ ...level.snake[0] }], apples: 0, activated: [], dir: { ...level.dir }, steps: 0, hearts: 3, hurtUntil: 0, defeated: 0,
     foods: level.foods.map(p => ({ ...p })), keys: level.keys.map(p => ({ ...p })), keysHeld: 0, status: 'playing',
     hammer: 0, shield: 0, pickups: (level.pickups || []).map(p => ({ ...p })), cleared: [],
-    guards: (level.guards || []).map(g => ({ x: g.x, y: g.y, dir: openFacing(level, g, new Set(), 1), mode: 'idle', pi: 0, pd: 1, cd: 0, target: null, memory: 0 })),
+    guards: (level.guards || []).map(g => ({ x: g.x, y: g.y, hp: g.hp ?? 2, kind: g.kind || 'warden', dir: openFacing(level, g, new Set(), 1), mode: 'idle', pi: 0, pd: 1, cd: 0, target: null, memory: 0, aim: null })),
   };
 }
 
@@ -144,7 +157,7 @@ export function exitStatus(level, state) {
 const at = (list, p) => (list || []).find(o => o.x === p.x && o.y === p.y);
 const inBounds = (level, p) => p.x >= 0 && p.y >= 0 && p.x < level.w && p.y < level.h;
 const isWall = (level, p) => (level.wallGrid ? level.wallGrid[p.y * level.w + p.x] === 1 : level.walls.some(w => same(w, p)));
-export const gateOpen = (gate, stepNo) => (gate.open === 'even') === (stepNo % 2 === 0);
+export const gateOpen = (gate, stepNo, state) => gate.open === 'lever' ? !!state?.cleared?.includes(key(gate.x, gate.y)) : (gate.open === 'even') === (stepNo % 2 === 0);
 const ORDER = [DIRS.U, DIRS.L, DIRS.D, DIRS.R]; // urutan tie-break tetap untuk BFS penjaga
 export const GUARD_STUN = 3;
 
@@ -155,7 +168,7 @@ function blocks(level, cleared, p, stepNo, forVision) {
   const k = key(p.x, p.y);
   if (at(level.cracks, p) && !cleared.has(k)) return true;
   const g = at(level.gates, p);
-  if (g && !gateOpen(g, stepNo)) return true;
+  if (g && !cleared.has(k) && !gateOpen(g, stepNo)) return true;
   if (!forVision && at(level.spikes, p) && !cleared.has(k)) return true;
   return false;
 }
@@ -179,6 +192,7 @@ export function openFacing(level, guard, cleared, stepNo) {
 
 // Sel yang dilihat penjaga: kedalaman 1..range, selebar 3 sel (lateral -1..1), terhalang tembok/retak/gerbang tertutup.
 export function visionCells(level, state, guard, stepNo) {
+  if (guard.hp === 0 || guard.cd > 0) return [];
   const cleared = new Set(state.cleared || []);
   const f = guard.dir, perp = { x: -f.y, y: f.x };
   const out = [];
@@ -186,15 +200,30 @@ export function visionCells(level, state, guard, stepNo) {
   for (let d = 1; d <= range; d++) {
     const c = { x: guard.x + f.x * d, y: guard.y + f.y * d };
     if (blocks(level, cleared, c, stepNo, true)) break;
-    out.push(c);
+    if (lineClear(level, cleared, guard, c, stepNo)) out.push(c);
     for (const l of [-1, 1]) {
       const s = { x: c.x + perp.x * l, y: c.y + perp.y * l };
-      if (!blocks(level, cleared, s, stepNo, true)) out.push(s);
+      if (!blocks(level, cleared, s, stepNo, true) && lineClear(level, cleared, guard, s, stepNo)) out.push(s);
     }
   }
   return out;
 }
 
+// Supercover: petak di sepanjang ray dan kedua sisi sudut harus terbuka.
+function lineClear(level, cleared, from, to, stepNo) {
+  const dx = to.x - from.x, dy = to.y - from.y, nx = Math.abs(dx), ny = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
+  let x = from.x, y = from.y, ix = 0, iy = 0;
+  while (ix < nx || iy < ny) {
+    const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
+    if (decision === 0) {
+      if (blocks(level, cleared, { x: x + sx, y }, stepNo, true) || blocks(level, cleared, { x, y: y + sy }, stepNo, true)) return false;
+      x += sx; y += sy; ix++; iy++;
+    } else if (decision < 0) { x += sx; ix++; } else { y += sy; iy++; }
+    if (blocks(level, cleared, { x, y }, stepNo, true)) return false;
+  }
+  return true;
+}
+
 const inBush = (level, snake) => !!at(level.bushes, snake[0]);
 
 function bfsNext(level, cleared, from, to, stepNo) {
@@ -225,11 +254,17 @@ function bfsNext(level, cleared, from, to, stepNo) {
 function advanceGuards(level, state, snake, stepNo, cleared) {
   const hidden = inBush(level, snake);
   const snakeCells = new Set(snake.map(p => key(p.x, p.y)));
-  const events = { alerted: false, lost: false };
+  const events = { alerted: false, attacks: [] };
   const guards = state.guards.map((g, i) => {
     const spec = level.guards[i];
     const home = { x: spec.x, y: spec.y };
+    if (g.hp === 0) return { ...g };
     if (g.cd > 0) return { ...g, cd: g.cd - 1 };
+    if (g.mode === 'windup') {
+      if (g.aim) events.attacks.push({ ...g.aim, guard: i });
+      return { ...g, mode: 'recover', aim: null };
+    }
+    if (g.mode === 'recover') return { ...g, mode: 'return', aim: null };
     let mode = g.mode;
     const sees = !hidden && visionCells(level, state, g, stepNo).some(c => snakeCells.has(key(c.x, c.y)));
     let target = sees ? { ...snake[0] } : g.target;
@@ -239,14 +274,19 @@ function advanceGuards(level, state, snake, stepNo, cleared) {
     else if (mode !== 'chase' && sees) { mode = 'alert'; events.alerted = true; }
     let n = { ...g, mode, target, memory };
     if (mode === 'chase') {
+      if (sees && Math.abs(g.x - snake[0].x) + Math.abs(g.y - snake[0].y) === 1) return { ...n, mode: 'windup', aim: { ...snake[0] }, dir: { x: snake[0].x - g.x, y: snake[0].y - g.y } };
+      if (g.kind === 'slime' && stepNo % 2) return n;
       const nx = target && bfsNext(level, cleared, g, target, stepNo);
-      if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
+      if (nx && same(nx, snake[0])) n = { ...n, mode: 'windup', aim: { ...nx }, dir: { x: nx.x - g.x, y: nx.y - g.y } };
+      else if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
       else n = { ...n, mode: 'return' };
     } else if (mode === 'return') {
+      if (g.kind === 'slime' && stepNo % 2) return n;
       const nx = bfsNext(level, cleared, g, home, stepNo);
       if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
       if (same(n, home)) n = { ...n, mode: 'idle', dir: { ...(spec.patrol.length > 1 ? { x: spec.patrol[1].x - home.x, y: spec.patrol[1].y - home.y } : spec.dir) }, pi: 0, pd: 1 };
     } else if (mode === 'idle' && spec.patrol.length > 1) {
+      if (g.kind === 'slime' && stepNo % 2) return n;
       let pi = g.pi + g.pd, pd = g.pd;
       if (pi >= spec.patrol.length) { pd = -1; pi = spec.patrol.length - 2; }
       else if (pi < 0) { pd = 1; pi = 1; }
@@ -258,22 +298,22 @@ function advanceGuards(level, state, snake, stepNo, cleared) {
       if (next >= spec.patrol.length) next = spec.patrol.length - 2;
       else if (next < 0) next = 1;
       const look = spec.patrol[next];
-      n.dir = look ? { x: look.x - n.x, y: look.y - n.y } : openFacing(level, n, cleared, stepNo + 1);
+      n.dir = look && !blocks(level, cleared, look, stepNo + 1, true) ? { x: look.x - n.x, y: look.y - n.y } : openFacing(level, n, cleared, stepNo + 1);
     }
     return n;
   });
+  // Reservasi tujuan, tanpa tumpukan atau saling menembus. Prioritas bergilir.
+  const occupied = new Set(state.guards.filter(g => g.hp !== 0).map(g => key(g.x, g.y))), reserved = new Set();
+  for (let n = 0; n < guards.length; n++) {
+    const i = (n + stepNo) % guards.length, g = guards[i], old = state.guards[i];
+    if (g.hp === 0) continue;
+    const dest = key(g.x, g.y);
+    if (!same(g, old) && (occupied.has(dest) || reserved.has(dest) || same(g, snake[0]))) guards[i] = { ...g, x: old.x, y: old.y, pi: old.pi, pd: old.pd };
+    reserved.add(key(guards[i].x, guards[i].y));
+  }
   return { guards, events };
 }
 
-// Penjaga menyentuh ular? (sel akhir penjaga ada di tubuh, atau kepala masuk sel awal penjaga). Penjaga pingsan tidak menyengat.
-function stings(prevGuards, guards, snake) {
-  const cells = new Set(snake.map(p => key(p.x, p.y)));
-  const headK = key(snake[0].x, snake[0].y);
-  const out = [];
-  guards.forEach((g, i) => { if (g.cd > 0) return; if (cells.has(key(g.x, g.y)) || (prevGuards[i].cd === 0 && headK === key(prevGuards[i].x, prevGuards[i].y))) out.push(i); });
-  return out;
-}
-
 export function stepState(level, state, dirKey) {
   const waiting = dirKey === 'W';
   const d = waiting ? { x: 0, y: 0 } : DIRS[dirKey];
@@ -293,13 +333,16 @@ export function stepState(level, state, dirKey) {
     if (same(raw, p.b)) { target = { ...p.a }; warped = true; break; }
   }
   if (warped && isWall(level, target)) return reject('tembok'); // dicegah validator; pengaman saja
+  const enemy = (state.guards || []).findIndex(g => g.hp !== 0 && same(g, target));
+  const attackAt = enemy >= 0 && !waiting ? { ...target } : null;
+  if (attackAt) { target = { ...head }; warped = false; }
   const foodIdx = state.foods.findIndex(f => same(f, target));
   const collected = foodIdx !== -1;
   // rintangan pada sel tujuan (hanya dicek bila tidak lewat portal: validator melarang rintangan di atas portal)
-  let hammer = state.hammer || 0, shield = state.shield || 0, newCleared = clearedArr;
+  let hammer = state.hammer || 0, shield = state.shield || 0, hearts = state.hearts ?? 3, hurtUntil = state.hurtUntil || 0, newCleared = clearedArr;
   const tK = key(target.x, target.y);
   const gate = at(level.gates, target);
-  if (gate && !gateOpen(gate, stepNo)) return reject('gerbang');
+  if (gate && !same(target, head) && !gateOpen(gate, stepNo, state)) return reject('gerbang');
   if (at(level.cracks, target) && !cleared.has(tK)) {
     if (hammer <= 0) return reject('retak');
     hammer -= 1; newCleared = [...newCleared, tK];
@@ -311,30 +354,40 @@ export function stepState(level, state, dirKey) {
   const snake = [target];
   const plate = level.plates.find(p => same(p, target));
   const activated = plate && !(state.activated || []).includes(plate.id) ? [...(state.activated || []), plate.id].sort() : (state.activated || []);
+  const lever = (level.levers || []).find(p => same(p, target));
+  const leverGates = lever ? (level.links || []).filter(l => l.lever[0] === lever.x && l.lever[1] === lever.y).map(l => key(...l.gate)) : [];
+  const leverOn = leverGates.some(k => !newCleared.includes(k));
+  if (leverOn) newCleared = [...new Set([...newCleared, ...leverGates])].sort();
   const keyIdx = state.keys.findIndex(k => same(k, target));
   const keysHeld = state.keysHeld + (keyIdx !== -1 ? 1 : 0);
   const pk = (state.pickups || []).findIndex(p => same(p, target));
-  if (pk !== -1) { if (state.pickups[pk].kind === 'hammer') hammer += 1; else shield += 1; }
+  if (pk !== -1) { if (state.pickups[pk].kind === 'hammer') hammer += 1; else if (state.pickups[pk].kind === 'heal') hearts = Math.min(3, hearts + 1); else shield += 1; }
   const atExit = same(target, level.exit);
   if (atExit) {
     const act = activePlates(level, { activated });
     const missing = level.exit.plates.filter(id => !act.includes(id));
     if (keysHeld < level.exit.keys || missing.length) return reject('pintu', { keysMissing: Math.max(0, level.exit.keys - keysHeld), missingPlates: missing });
   }
-  const events = { ate: collected, switchOn: activated.length > (state.activated || []).length, key: keyIdx !== -1, warped, won: atExit, pickup: pk !== -1 ? state.pickups[pk].kind : null, stung: false, shielded: false, alerted: false };
+  const events = { ate: collected, switchOn: activated.length > (state.activated || []).length, leverOn, attackAt, hit: !!attackAt, defeated: false, hurt: false, key: keyIdx !== -1, warped, won: atExit, pickup: pk !== -1 ? state.pickups[pk].kind : null, stung: false, shielded: false, alerted: false };
   let guards = state.guards || [];
+  if (attackAt) guards = guards.map((g, i) => {
+    if (i !== enemy) return g;
+    const hp = Math.max(0, (g.hp ?? level.guards[i].hp ?? 2) - 1);
+    events.defeated = hp === 0;
+    return { ...g, hp, mode: 'recover', aim: null };
+  });
   let status = atExit ? 'won' : 'playing';
   if (!atExit && guards.length) {
     const clearedNow = new Set(newCleared);
-    const adv = advanceGuards(level, state, snake, stepNo, clearedNow);
+    const adv = advanceGuards(level, { ...state, guards, cleared: newCleared }, snake, stepNo, clearedNow);
     guards = adv.guards;
     events.alerted = adv.events.alerted;
-    const hit = stings(state.guards, guards, snake);
-    if (hit.length) {
+    const hits = adv.events.attacks.filter(a => same(a, target));
+    if (hits.length && stepNo >= hurtUntil) {
       if (shield > 0) {
         shield -= 1; events.shielded = true;
-        guards = guards.map((g, i) => hit.includes(i) ? { x: level.guards[i].x, y: level.guards[i].y, dir: { ...level.guards[i].dir }, mode: 'idle', pi: 0, pd: 1, cd: GUARD_STUN } : g);
-      } else { status = 'lost'; events.stung = true; }
+        guards = guards.map((g, i) => hits.some(a => a.guard === i) ? { ...g, cd: GUARD_STUN, mode: 'idle', aim: null } : g);
+      } else { hearts--; hurtUntil = stepNo + 2; events.hurt = true; if (hearts <= 0) { status = 'lost'; events.stung = true; } }
     }
   }
   return {
@@ -345,7 +398,7 @@ export function stepState(level, state, dirKey) {
       keys: keyIdx !== -1 ? state.keys.filter((_, i) => i !== keyIdx) : state.keys,
       keysHeld, status, hammer, shield,
       pickups: pk !== -1 ? state.pickups.filter((_, i) => i !== pk) : (state.pickups || []),
-      cleared: newCleared, guards,
+      cleared: newCleared, guards, hearts, hurtUntil, defeated: (state.defeated || 0) + (events.defeated ? 1 : 0),
     },
   };
 }
@@ -367,14 +420,16 @@ export function undo(session) {
 
 export const restart = (session) => newSession(session.level);
 
-// Penyelesaian paling singkat (BFS) — dipakai test untuk membuktikan par & solvabilitas, dan oleh generator level.
+// Penyelesaian paling singkat (BFS / A*) — dipakai test untuk membuktikan par & solvabilitas, dan oleh generator level.
 // Encoding mencakup posisi, kunci, sakelar, pickup, item, rintangan terpecah,
 // paritas langkah (bila ada gerbang), serta keadaan penjaga. Koin diabaikan karena tidak memengaruhi solusi.
 export function solve(level, maxStates = 400000, stats) {
-  const hasGates = (level.gates || []).length > 0;
+  const hasGates = (level.gates || []).some(g => g.open !== 'lever');
   const enc = s => s.snake.map(p => p.x + ':' + p.y).join('|') + '/' + s.keysHeld + '/' + (s.activated || []).join(',') + '/' + s.keys.map(f => f.x + ':' + f.y).join('|')
     + '/' + (s.hammer || 0) + (s.shield || 0) + '/' + (s.pickups || []).map(f => f.x + ':' + f.y).join('|') + '/' + (s.cleared || []).join('|')
-    + (hasGates ? '/' + (s.steps % 2) : '') + (s.guards && s.guards.length ? '/' + s.guards.map(g => g.x + ':' + g.y + g.dir.x + g.dir.y + g.mode + g.pi + g.pd + g.cd + ':' + (g.target ? g.target.x + ',' + g.target.y : '-') + ':' + g.memory).join('|') : '');
+    + '/' + s.hearts + ':' + Math.max(0, s.hurtUntil - s.steps)
+    + (hasGates || level.guards.some(g => g.kind === 'slime') ? '/' + (s.steps % 2) : '') + (s.guards && s.guards.length ? '/' + s.guards.map(g => g.hp === 0 ? 'dead' : g.x + ':' + g.y + g.dir.x + g.dir.y + g.mode + g.pi + g.pd + g.cd + ':' + (g.target ? g.target.x + ',' + g.target.y : '-') + ':' + g.memory + ':' + g.hp + ':' + (g.aim ? g.aim.x + ',' + g.aim.y : '-')).join('|') : '');
+  if (level.guards.length && !level.portals.length) return solveCombat(level, maxStates, stats, enc);
   const start = initialState(level);
   const seen = new Set([enc(start)]);
   let frontier = [{ s: start, path: '' }];
@@ -399,3 +454,48 @@ export function solve(level, maxStates = 400000, stats) {
   if (stats) stats.states = (stats.states || 0) + n;
   return null;
 }
+
+// A* untuk combat: lower bound hanya menghitung jarak ke tujuan wajib dan mengabaikan rintangan.
+// Portal tetap memakai BFS, karena jarak Manhattan bukan lower bound untuk teleport.
+function solveCombat(level, maxStates, stats, enc) {
+  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
+  const estimate = s => {
+    const head = s.snake[0], exit = level.exit;
+    let h = dist(head, exit);
+    const required = level.plates.filter(p => exit.plates.includes(p.id) && !s.activated.includes(p.id));
+    if (exit.keys - s.keysHeld >= s.keys.length) required.push(...s.keys);
+    for (const p of required) h = Math.max(h, dist(head, p) + dist(p, exit));
+    return h;
+  };
+  const heap = [], better = (a, b) => a.f < b.f || (a.f === b.f && (a.g > b.g || (a.g === b.g && a.order < b.order)));
+  function push(item) {
+    heap.push(item); let i = heap.length - 1;
+    while (i > 0) { const p = (i - 1) >> 1; if (!better(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
+  }
+  function pop() {
+    const first = heap[0], last = heap.pop();
+    if (heap.length) {
+      heap[0] = last; let i = 0;
+      for (;;) { let next = i; const l = i * 2 + 1, r = l + 1; if (l < heap.length && better(heap[l], heap[next])) next = l; if (r < heap.length && better(heap[r], heap[next])) next = r; if (next === i) break; [heap[i], heap[next]] = [heap[next], heap[i]]; i = next; }
+    }
+    return first;
+  }
+  const start = initialState(level), best = new Map([[enc(start), 0]]);
+  let n = 0, order = 0;
+  push({ s: start, path: '', g: 0, f: estimate(start), order: order++ });
+  while (heap.length) {
+    const current = pop();
+    if (best.get(enc(current.s)) !== current.g) continue;
+    if (current.s.status === 'won') { if (stats) stats.states = (stats.states || 0) + n; return current.path; }
+    if (++n > maxStates) break;
+    for (const k of ['U', 'D', 'L', 'R', 'W']) {
+      const r = stepState(level, current.s, k);
+      if (!r.moved || r.state.status === 'lost') continue;
+      const id = enc(r.state), g = current.g + 1;
+      if (best.has(id) && best.get(id) <= g) continue;
+      best.set(id, g); push({ s: r.state, path: current.path + k, g, f: g + estimate(r.state), order: order++ });
+    }
+  }
+  if (stats) stats.states = (stats.states || 0) + n;
+  return null;
+}
```

#### scripts/build-campaign.mjs

```diff
diff --git a/scripts/build-campaign.mjs b/scripts/build-campaign.mjs
index a0388b7..84f5d8a 100644
--- a/scripts/build-campaign.mjs
+++ b/scripts/build-campaign.mjs
@@ -11,8 +11,8 @@ const { getLevel, TIERS, tierOf, MAX_LEVEL, TUTORIAL_COUNT } = generator;
 const INTRO = {
   portal: 'Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).',
   duri: 'Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.',
-  gerbang: 'Baru: Gerbang bergantian. Pagar terbuka bergantian tiap langkah. Panah = bisa lewat pada giliran berikut; palang = tertutup. Tekan Spasi atau Tunggu untuk menunggu.',
-  penjaga: 'Baru: Penjaga. Ia berpatroli. Tanda ! memberi satu giliran sebelum mengejar posisi terakhirmu. Sembunyi di semak agar ia pulang. Tersengat = game over.',
+  gerbang: 'Baru: Tuas. Injak tuas kuningan untuk membuka gerbang permanen. Tidak ada hitungan genap/ganjil.',
+  penjaga: 'Baru: Dungeon dijaga musuh. Tiga hati; tekan arah ke musuh untuk menyerang. Hindari petak serangan yang ditandai. Slime 1 HP, penjaga 2 HP.',
 };
 const specs = [];
 for (let n = TUTORIAL_COUNT + 1; n <= MAX_LEVEL; n++) {
@@ -22,7 +22,7 @@ for (let n = TUTORIAL_COUNT + 1; n <= MAX_LEVEL; n++) {
   const s = g.spec;
   specs.push({
     id: `gen-${n}`, name: s.name, tier: t.name, intro: n === t.from && t.intro ? INTRO[t.intro] : null,
-    goal: s.goal, par: g.par, map: s.map, snake: s.snake, dir: s.dir, exit: s.exit, guards: s.guards || [],
+    goal: s.goal, par: g.par, map: s.map, snake: s.snake, dir: s.dir, exit: s.exit, guards: s.guards || [], links: s.links || [],
   });
 }
 const body = `// DIBUAT OTOMATIS oleh scripts/build-campaign.mjs dari generator (seed kampanye tetap). Jangan diedit tangan.\n// Level 6..50 "Jejak Kunci". Generator dijalankan di luar runtime karena butuh sampai ~1,5 dtk per level.\nexport const CAMPAIGN_SPECS = ${JSON.stringify(specs, null, 1).replace(/\n\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']')};\n`;
```

#### tests/puzzle.test.mjs

```diff
diff --git a/tests/puzzle.test.mjs b/tests/puzzle.test.mjs
index 1dfb0ae..94b8934 100644
--- a/tests/puzzle.test.mjs
+++ b/tests/puzzle.test.mjs
@@ -257,7 +257,7 @@ test('controller: level selesai tepat sekali — hasil satu kali, progres tersim
   w.play(SOLUTIONS['jk-1']);
   assert.equal(w.eng.getState(), 'won');
   assert.equal(w.overlays('gameover').length, 1);
-  assert.equal(w.overlays('gameover')[0].overlay.title, 'Level Selesai!');
+  assert.equal(w.overlays('gameover')[0].overlay.title, 'Ruang Selesai!');
   assert.equal(w.saves.length, 1);
   assert.equal(w.progress.puzzle.levels['jk-1'].best, 13);
   assert.equal(w.last('puzzleMenu').selected, 1, 'otomatis menyorot level berikutnya');
```

#### tests/puzzle9a.test.mjs

```diff
diff --git a/tests/puzzle9a.test.mjs b/tests/puzzle9a.test.mjs
index 9602d3d..7665b84 100644
--- a/tests/puzzle9a.test.mjs
+++ b/tests/puzzle9a.test.mjs
@@ -92,30 +92,20 @@ test('pandangan terhalang tembok: ular di balik tembok tidak terlihat', () => {
   assert.ok(visionCells(lv, st, st.guards[0], 1).every(c => c.x >= 8), 'tidak melihat tembus tembok');
 });
 
-test('penjaga melihat ular -> kejar; kontak = kalah (status lost, kejadian stung)', () => {
-  const lv = guardLevel();
-  let s = newSession(lv);
-  s = run(s, 'RRR');                                      // kepala (5,1) masuk pandangan
-  assert.equal(s.state.guards[0].mode, 'alert');
-  const before = Math.abs(s.state.guards[0].x - s.state.snake[0].x) + Math.abs(s.state.guards[0].y - s.state.snake[0].y);
-  let r, guard = 0;
-  while (s.state.status === 'playing' && guard++ < 10) { r = move(s, 'R'); if (!r.moved) break; s = r.session; }
-  assert.equal(s.state.status, 'lost'); assert.equal(r.events.stung, true);
-  assert.ok(before >= 2);
-  // setelah kalah, input ditolak
+test('penjaga terlihat, menyiapkan serangan, tiga serangan menghabiskan hati', () => {
+  const lv = guardLevel(); let s = run(newSession(lv), 'RRR');
+  assert.equal(s.state.guards[0].mode, 'alert'); assert.equal(s.state.hearts, 3);
+  let last; for (let i = 0; i < 24 && s.state.status === 'playing'; i++) { last = move(s, 'W'); s = last.session; }
+  assert.equal(s.state.status, 'lost'); assert.equal(s.state.hearts, 0); assert.equal(last.events.stung, true);
   assert.equal(move(s, 'D').reason, 'selesai');
 });
 
-test('Perisai menahan satu sengatan: penjaga pulang ke posisi awal dan pingsan GUARD_STUN langkah', () => {
-  const lv = guardLevel({ '3,1': 'S' });
-  let s = newSession(lv);
-  s = run(s, 'RRR');                                      // ambil perisai di langkah 1, terlihat di langkah 3
-  let stunned = null, guard = 0;
-  while (guard++ < 10) { const r = move(s, 'R'); if (!r.moved) break; s = r.session; if (r.events.shielded) { stunned = s; break; } }
-  assert.ok(stunned, 'sengatan tertahan perisai');
-  const g = stunned.state.guards[0];
-  assert.equal(stunned.state.status, 'playing'); assert.equal(stunned.state.shield, 0);
-  assert.deepEqual([g.x, g.y, g.mode, g.cd], [8, 2, 'idle', GUARD_STUN]);
+test('Perisai menahan satu pukulan: musuh pingsan di tempat selama GUARD_STUN', () => {
+  const lv = guardLevel({ '3,1': 'S' }); let s = run(newSession(lv), 'RRR'), hit = null;
+  for (let i = 0; i < 20; i++) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) { hit = r; break; } }
+  assert.ok(hit); assert.equal(s.state.shield, 0); assert.equal(s.state.hearts, 3);
+  assert.equal(s.state.guards[0].cd, GUARD_STUN);
+  assert.deepEqual([s.state.guards[0].x, s.state.guards[0].y], [6, 1]);
 });
 
 test('bersembunyi di semak: kejaran berhenti (return) lalu penjaga kembali ke posisi awal dan idle', () => {
@@ -157,7 +147,8 @@ test('masuk pintu pada langkah yang sama dengan sengatan = MENANG (kemenangan di
   const r2 = move(newSession(lv2), 'R');
   assert.equal(r2.session.state.status, 'playing');
   const contact = stepState(lv2, { ...r2.state, guards: [{ ...r2.state.guards[0], mode: 'chase', target: r2.state.snake[0], memory: 3 }] }, 'W');
-  assert.equal(contact.state.status, 'lost');
+  assert.equal(contact.state.status, 'playing');
+  assert.equal(contact.state.hearts, 3, 'tidak mati seketika sebelum telegraph');
 });
 
 test('penjaga pingsan tidak menyengat dan tidak melihat', () => {
@@ -165,7 +156,7 @@ test('penjaga pingsan tidak menyengat dan tidak melihat', () => {
   let s = newSession(lv);
   s = run(s, 'RRR');
   let guard = 0;
-  while (guard++ < 10) { const r = move(s, 'R'); if (!r.moved) break; s = r.session; if (r.events.shielded) break; }
+  while (guard++ < 10) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) break; }
   assert.equal(s.state.guards[0].cd, GUARD_STUN);
   const r1 = move(s, 'D'); assert.equal(r1.moved, true);
   assert.equal(r1.session.state.guards[0].cd, GUARD_STUN - 1);
@@ -199,11 +190,11 @@ test('solver memahami penjaga dan semak: solusi terpendek menyusuri semak dan di
   assert.equal(sol.length, 9, 'jalur lurus lewat semak (hidden) = 9 langkah');
 });
 
-test('solver: level yang mustahil (penjaga tak terhindarkan di lorong sempit) mengembalikan null', () => {
+test('solver: lorong sempit dengan penjaga dapat dilalui setelah bertarung', () => {
   const rows = ['#########', '#.......#', '#########'];
   const m = rows.map(r => r.split('')); m[1][7] = 'E';
   const lv = build({ map: m.map(r => r.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 5, y: 1, dir: 'L', range: 3 }] });
-  assert.equal(solve(lv), null);
+  const solution = solve(lv); assert.ok(solution); assert.equal(run(newSession(lv), solution).state.status, 'won');
 });
 
 // ---------- generator ----------
@@ -244,10 +235,11 @@ test('generator: ke-45 level valid, bukan cadangan, solusi diputar ulang MENANG,
   for (const n of [6, 20, 35, 44]) { const g = ALL[n - 6]; assert.equal(solve(g.level, 200000).length, g.par); }
 });
 
-test('generator: rata-rata par naik per sepertiga (6-20 < 21-35 < 36-50) dan semua >= 8', () => {
+test('generator: puzzle awal bertambah panjang, combat bertambah jenis dan jumlah musuh', () => {
   const avg = (a, b) => { const xs = ALL.filter(g => g.n >= a && g.n <= b).map(g => g.par); return xs.reduce((p, q) => p + q, 0) / xs.length; };
   const a = avg(6, 20), b = avg(21, 35), c = avg(36, 50);
-  assert.ok(a < b && b < c, `rata-rata ${a.toFixed(1)} < ${b.toFixed(1)} < ${c.toFixed(1)}`);
+  assert.ok(a < b, 'puzzle menambah rute');
+  for (const g of ALL.filter(g => g.n >= 35)) assert.equal(g.level.guards.length, g.n < 43 ? 1 : 2);
   ALL.forEach(g => assert.ok(g.par >= 8));
 });
```

#### tests/puzzle9b.test.mjs

```diff
diff --git a/tests/puzzle9b.test.mjs b/tests/puzzle9b.test.mjs
index 57987b8..7ea5c38 100644
--- a/tests/puzzle9b.test.mjs
+++ b/tests/puzzle9b.test.mjs
@@ -43,7 +43,8 @@ test('kampanye: data yang dikirim identik dengan keluaran generator (seed kampan
 
 test('kampanye: kurva makin sulit (rata-rata par per sepertiga naik) dan tiap spec membawa tier + kartu pengantar bila tier baru', () => {
   const avg = (a, b) => { const xs = CAMPAIGN_SPECS.filter(s => { const n = Number(s.id.slice(4)); return n >= a && n <= b; }).map(s => s.par); return xs.reduce((x, y) => x + y, 0) / xs.length; };
-  assert.ok(avg(6, 20) < avg(21, 35) && avg(21, 35) < avg(36, 50));
+  assert.ok(avg(6, 20) < avg(21, 34));
+  for (const [i, lv] of CAMPAIGN_LEVELS.entries()) assert.equal(lv.guards.length, i < 34 ? 0 : i < 42 ? 1 : 2);
   for (const s of CAMPAIGN_SPECS) assert.ok(typeof s.tier === 'string' && s.tier);
   for (const n of [13, 20, 28, 35]) { const s = CAMPAIGN_SPECS.find(x => x.id === `gen-${n}`); assert.ok(s.intro && s.intro.length > 10, `level ${n} memperkenalkan elemen baru`); }
 });
@@ -83,7 +84,7 @@ test('controller: menyelesaikan tutorial membuka level 6; menang di level 6 meny
   assert.equal(w.saves.length, 1);
 });
 
-test('controller: level 50 selesai = "Semua Level Tamat!" sekali, tombol Main Lagi', () => {
+test('controller: level 50 selesai = "Semua Ruang Tamat!" sekali, tombol Main Lagi', () => {
   const w = world(clearedUpTo(49));
   assert.equal(w.last('puzzleMenu').selected, 49);
   w.eng.startRun();
@@ -91,7 +92,7 @@ test('controller: level 50 selesai = "Semua Level Tamat!" sekali, tombol Main La
   assert.equal(w.eng.getState(), 'won');
   const o = w.overlays('gameover');
   assert.equal(o.length, 1);
-  assert.equal(o[0].overlay.title, 'Semua Level Tamat!');
+  assert.equal(o[0].overlay.title, 'Semua Ruang Tamat!');
   assert.equal(o[0].overlay.btnText, 'Main Lagi');
   assert.equal(w.saves.length, 1);
 });
@@ -104,11 +105,12 @@ const rejectRoom = (ch) => { const m = ROOM.map(r => r.split('')); m[3][9] = 'E'
 test('sengatan = game over: hasil satu kali, suara mati sekali, tidak menyimpan progres, input berikutnya diabaikan', () => {
   const w = makePuzzleWorld({ levels: [guardRoom()] });
   w.eng.startRun();
-  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 12) w.eng.setDir(...D.R);
+  w.play('RRR');
+  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
   assert.equal(w.eng.getState(), 'lost');
   const o = w.overlays('gameover');
   assert.equal(o.length, 1);
-  assert.equal(o[0].overlay.title, 'Tersengat!');
+  assert.equal(o[0].overlay.title, 'Hati Habis!');
   assert.equal(o[0].overlay.btnText, 'Coba Lagi');
   assert.equal(w.calls.death, 1); assert.equal(w.saves.length, 0);
   const steps = w.last('score');
@@ -121,7 +123,8 @@ test('sengatan = game over: hasil satu kali, suara mati sekali, tidak menyimpan
 test('Coba Lagi memulai level yang SAMA dari awal (langkah 0, penjaga di rumah)', () => {
   const w = makePuzzleWorld({ levels: [guardRoom()] });
   w.eng.startRun();
-  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 12) w.eng.setDir(...D.R);
+  w.play('RRR');
+  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
   assert.equal(w.eng.getState(), 'lost');
   assert.equal(w.eng.startRun(), true);
   assert.equal(w.eng.getState(), 'playing');
```

#### tests/revive-quest.test.mjs

```diff
diff --git a/tests/revive-quest.test.mjs b/tests/revive-quest.test.mjs
index e72595c..c4f0c29 100644
--- a/tests/revive-quest.test.mjs
+++ b/tests/revive-quest.test.mjs
@@ -132,7 +132,7 @@ test('animasi puzzle: input beruntun antre, pause membekukan antrean, undo tidak
 test('kampanye baru: semua penjaga punya rute 3+ petak, semua apel opsional, maskot satu petak', () => {
   for (const lv of campaign.CAMPAIGN_LEVELS) {
     assert.equal(P.initialState(lv).snake.length, 1);
-    assert.equal(lv.revision, 3);
+    assert.equal(lv.revision, 4);
     assert.ok(lv.foods.length <= 3);
     for (const g of lv.guards) assert.ok(g.patrol.length >= 3);
     assert.equal(P.solve({ ...lv, foods: [] }, 60000).length, lv.par, lv.id);
```

#### lib/input.js

```diff
diff --git a/lib/input.js b/lib/input.js
new file mode 100644
index 0000000..2fbec4d
--- /dev/null
+++ b/lib/input.js
@@ -0,0 +1,49 @@
+// Satu pemilik status hold untuk keyboard dan DPad. Repeat OS tidak menjadi antrean langkah.
+export function createDirectionInput({ send, cancel, enabled, stepMode, later = setTimeout, stop = clearTimeout, delay = 190, interval = 135 }) {
+  const pressed = new Map();
+  let order = 0, timer = null;
+  const active = player => [...pressed.values()].filter(v => v.player === player).sort((a, b) => b.order - a.order)[0];
+  function schedule(ms) {
+    if (timer !== null) stop(timer);
+    timer = null;
+    if (!stepMode() || !pressed.size) return;
+    timer = later(() => {
+      timer = null;
+      if (!enabled()) { clear(); return; }
+      for (const player of new Set([...pressed.values()].map(v => v.player))) {
+        const v = active(player);
+        if (v) send(player, v.x, v.y, { source: v.key, repeat: true });
+      }
+      schedule(interval);
+    }, ms);
+  }
+  function press(key, player, x, y) {
+    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) + Math.abs(y) !== 1) return;
+    if (!enabled()) { clear(); return; }
+    const old = pressed.get(key);
+    if (old && old.x === x && old.y === y) return;
+    const v = { key, player, x, y, order: ++order };
+    pressed.set(key, v);
+    send(player, x, y, { source: key, repeat: false });
+    schedule(delay);
+  }
+  function release(key) {
+    const old = pressed.get(key);
+    if (!old) return;
+    const wasActive = active(old.player)?.key === key;
+    pressed.delete(key);
+    if (cancel) cancel(old.player, key);
+    if (wasActive && enabled()) {
+      const next = active(old.player);
+      if (next && (next.x !== old.x || next.y !== old.y)) send(next.player, next.x, next.y, { source: next.key, repeat: false });
+    }
+    schedule(delay);
+  }
+  function clear() {
+    if (timer !== null) stop(timer);
+    timer = null;
+    if (cancel) pressed.forEach(v => cancel(v.player, v.key));
+    pressed.clear();
+  }
+  return { press, release, clear };
+}
```

#### tests/dungeon-input.test.mjs

```diff
diff --git a/tests/dungeon-input.test.mjs b/tests/dungeon-input.test.mjs
new file mode 100644
index 0000000..132437e
--- /dev/null
+++ b/tests/dungeon-input.test.mjs
@@ -0,0 +1,49 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import { pathToFileURL } from 'node:url';
+import { root, puzzle as P, createPuzzleGame, makePuzzleWorld } from './helpers/env.mjs';
+const { createDirectionInput } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/input.mjs'));
+const room = (id = 'input') => P.buildLevel({ id, name: id, par: 10, map: ['########', '#.....E#', '#......#', '#......#', '#......#', '#......#', '########'], snake: [[3, 4]], dir: 'U', exit: { keys: 0, plates: [] } }).level;
+
+test('arah baru mengganti repeat lama, satu tap tidak menjadi tiga langkah', () => {
+  const w = makePuzzleWorld({ levels: [room()], animate: true }); w.eng.startRun();
+  w.eng.setDir(0, -1); w.now += 20; w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
+  w.frame(130); w.frame(130);
+  assert.equal(w.last('score'), 2); assert.equal(w.rafQueue.length, 0); w.eng.destroy();
+});
+
+test('arah tertahan tembok tidak menahan arah baru; repeat yang dilepas dibatalkan', () => {
+  const lv = { ...room(), snake: [{ x: 3, y: 2 }] };
+  const w = makePuzzleWorld({ levels: [lv], animate: true }); w.eng.startRun();
+  w.eng.setDir(0, -1); w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
+  w.frame(130); assert.equal(w.last('score'), 2);
+  w.eng.setDir(-1, 0, { repeat: true, source: 'left' }); w.eng.cancelHeldInput('left'); w.frame(130);
+  assert.equal(w.last('score'), 2); w.eng.destroy();
+});
+
+test('repeat milik aplikasi, arah terakhir menang, keyup/clear berhenti dan pemain terpisah', () => {
+  const calls = [], timers = new Map(); let seq = 0, enabled = true;
+  const input = createDirectionInput({ send: (...v) => calls.push(v), enabled: () => enabled, stepMode: () => true,
+    later: fn => { timers.set(++seq, fn); return seq; }, stop: id => timers.delete(id) });
+  const tick = () => { const q = [...timers.values()]; timers.clear(); q.forEach(fn => fn()); };
+  input.press('up', 0, 0, -1); input.press('up', 0, 0, -1); assert.equal(calls.length, 1);
+  tick(); assert.equal(calls.length, 2); assert.equal(calls[1][3].repeat, true);
+  input.press('left', 0, -1, 0); input.release('up'); tick();
+  assert.deepEqual(calls.at(-1).slice(0, 3), [0, -1, 0]);
+  input.press('p2', 1, 1, 0); tick(); assert.equal(calls.at(-1)[0], 1);
+  input.clear(); const n = calls.length; tick(); assert.equal(calls.length, n);
+  input.press('diagonal', 0, 1, 1); assert.equal(calls.length, n);
+  input.press('left', 0, -1, 0); enabled = false; tick(); assert.equal(timers.size, 0);
+});
+
+test('gagal simpan A lalu berhasil simpan B tetap menyimpan dua ruang dan dua koin', () => {
+  const lv = P.buildLevel({ id: 'save-a', name: 'save', par: 4, map: ['########', '#.FK.E.#', '########'], snake: [[1, 1]], dir: 'R', exit: { keys: 1, plates: [] } }).level;
+  const noop = () => {}, ctx = new Proxy({}, { get: () => noop, set: () => true });
+  let disk = { v: 1, puzzle: { levels: {} } }, saves = 0, last;
+  const e = createPuzzleGame({ canvas: { width: 680, height: 600, getContext: () => ctx }, sounds: { playChomp: noop, playMove: noop },
+    levels: [lv, { ...lv, id: 'save-b' }], io: { load: () => disk, save: p => { if (++saves === 1) return false; disk = p; return true; } }, onUpdate: p => { if (p.puzzleMenu) last = p.puzzleMenu; } });
+  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0); assert.equal(last.savePending, true);
+  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0);
+  assert.equal(last.savePending, false); assert.equal(last.coins, 2); assert.ok(disk.puzzle.levels['save-a']); assert.ok(disk.puzzle.levels['save-b']);
+  assert.equal(last.levels[1].unlocked, true); e.destroy();
+});
```

#### tests/dungeon-combat.test.mjs

```diff
diff --git a/tests/dungeon-combat.test.mjs b/tests/dungeon-combat.test.mjs
new file mode 100644
index 0000000..92cd516
--- /dev/null
+++ b/tests/dungeon-combat.test.mjs
@@ -0,0 +1,126 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import { puzzle as P, campaign } from './helpers/env.mjs';
+
+const build = extra => {
+  const r = P.buildLevel({ id: 'dungeon', name: 'Dungeon', par: 99, map: ['#########', '#.......#', '#.......#', '#......E#', '#########'], snake: [[2, 2]], dir: 'R', exit: { keys: 0, plates: [] }, ...extra });
+  assert.ok(r.level, r.errors.join('; ')); return r.level;
+};
+const withGuard = (kind = 'warden') => build({ guards: [{ x: 3, y: 2, dir: 'L', kind }] });
+const frozen = o => { if (o && typeof o === 'object') { Object.values(o).forEach(frozen); Object.freeze(o); } return o; };
+
+test('tuas membuka jeruji permanen, nomor tautan valid, undo mengembalikan pintu tertutup', () => {
+  const lv = build({ map: ['#########', '#..!G..E#', '#########'], snake: [[2, 1]], links: [{ lever: [3, 1], gate: [4, 1] }] });
+  const start = P.newSession(lv), r = P.move(start, 'R');
+  assert.equal(P.gateOpen(lv.gates[0], 1, start.state), false);
+  assert.equal(r.events.leverOn, true);
+  for (const turn of [2, 3, 4, 20]) assert.equal(P.gateOpen(lv.gates[0], turn, r.state), true);
+  assert.equal(P.move(r.session, 'R').moved, true);
+  assert.deepEqual(P.undo(r.session).session.state, start.state);
+  assert.equal(P.buildLevel({ id: 'bad', par: 1, map: ['#####', '#.GE#', '#####'], snake: [[1, 1]], dir: 'R' }).level, null);
+});
+
+test('gerbang ritme lama: menunggu atau keluar saat jeruji menutup tidak mengunci pemain', () => {
+  const lv = build({ map: ['#########', '#..h...E#', '#########'], snake: [[2, 1]] });
+  let s = P.move(P.newSession(lv), 'R').session;
+  const wait = P.move(s, 'W'); assert.equal(wait.moved, true); s = wait.session;
+  assert.equal(P.move(s, 'R').moved, true);
+});
+
+test('LOS tidak menembus sisi tembok atau sudut diagonal', () => {
+  const lv = build({ map: ['#########', '#..#....#', '#.......#', '#......E#', '#########'], snake: [[1, 3]], guards: [{ x: 2, y: 2, dir: 'R', range: 4 }] });
+  const st = P.initialState(lv), g = { ...st.guards[0], dir: { x: 1, y: 0 } }; st.guards[0] = g;
+  const cells = P.visionCells(lv, st, g, 1);
+  assert.ok(cells.some(c => c.x === 4 && c.y === 2));
+  assert.ok(!cells.some(c => c.x === 4 && c.y === 1), 'ray melewati sudut tembok (3,1)');
+  assert.ok(cells.some(c => c.x === 6 && c.y === 1), 'ray lain yang bebas tetap terlihat');
+});
+
+test('musuh menuju petak yang sama tidak bertumpuk atau masuk ke petak pemain', () => {
+  const lv = build({ snake: [[4, 3]], guards: [{ x: 3, y: 2, dir: 'R' }, { x: 5, y: 2, dir: 'L' }] });
+  let st = P.initialState(lv);
+  st.guards = st.guards.map(g => ({ ...g, mode: 'chase', target: { x: 4, y: 2 }, memory: 3 }));
+  for (let i = 0; i < 8; i++) {
+    st = P.stepState(lv, st, 'W').state;
+    const live = st.guards.filter(g => g.hp > 0);
+    assert.equal(new Set(live.map(g => `${g.x},${g.y}`)).size, live.length);
+    assert.ok(live.every(g => g.x !== st.snake[0].x || g.y !== st.snake[0].y));
+    if (st.status !== 'playing') break;
+  }
+});
+
+test('bump attack: penjaga 2 HP, slime 1 HP, tidak maju atau tumbuh, musuh mati tidak menghalangi', () => {
+  for (const [kind, hp] of [['warden', 2], ['slime', 1]]) {
+    const lv = withGuard(kind); let s = frozen(P.newSession(lv));
+    for (let h = hp; h > 0; h--) {
+      const r = P.move(s, 'R'); assert.equal(r.events.hit, true); s = r.session;
+      assert.equal(s.state.guards[0].hp, h - 1); assert.deepEqual(s.state.snake, [{ x: 2, y: 2 }]);
+    }
+    assert.equal(s.state.defeated, 1); assert.equal(s.state.apples, 0);
+    assert.deepEqual(P.visionCells(lv, s.state, s.state.guards[0], s.state.steps + 1), []);
+    assert.deepEqual(P.move(s, 'R').state.snake, [{ x: 3, y: 2 }]);
+  }
+});
+
+test('alert lalu windup mengunci sasaran: ada satu giliran untuk menghindar, serangan tidak mengikuti pemain', () => {
+  const lv = withGuard(); let st = P.initialState(lv);
+  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'alert');
+  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'windup');
+  assert.deepEqual(st.guards[0].aim, { x: 2, y: 2 });
+  const dodge = P.stepState(lv, frozen(st), 'U');
+  assert.equal(dodge.state.hearts, 3); assert.equal(dodge.state.guards[0].mode, 'recover');
+  const hit = P.stepState(lv, st, 'W'); assert.equal(hit.state.hearts, 2); assert.equal(hit.events.hurt, true);
+});
+
+test('dua serangan serentak hanya satu damage; kebal satu giliran, hati ketiga habis = kalah', () => {
+  const lv = build({ guards: [{ x: 3, y: 2, dir: 'L' }, { x: 2, y: 1, dir: 'D' }] });
+  let st = P.initialState(lv);
+  const armed = s => ({ ...s, guards: s.guards.map(g => ({ ...g, mode: 'windup', aim: { ...s.snake[0] } })) });
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 1);
+  st = P.stepState(lv, armed(st), 'W').state;
+  const death = P.stepState(lv, armed(st), 'W');
+  assert.equal(death.state.status, 'lost'); assert.equal(death.state.hearts, 0); assert.equal(death.events.stung, true);
+  assert.equal(P.stepState(lv, death.state, 'R').reason, 'selesai');
+});
+
+test('heal pulih 1 maksimal 3; perisai stun di tempat dan tidak mereset posisi ke rumah', () => {
+  const lv = build({ map: ['#########', '#.......#', '#..H....#', '#......E#', '#########'], guards: [{ x: 6, y: 2, dir: 'L' }] });
+  const start = P.initialState(lv);
+  for (const [hearts, expected] of [[1, 2], [3, 3]]) {
+    const r = P.stepState(lv, { ...start, hearts }, 'R'); assert.equal(r.state.hearts, expected); assert.equal(r.events.pickup, 'heal');
+  }
+  const armed = { ...start, shield: 1, guards: [{ ...start.guards[0], x: 3, mode: 'windup', aim: { x: 2, y: 2 } }] };
+  const r = P.stepState(lv, armed, 'W'); assert.equal(r.events.shielded, true); assert.equal(r.state.hearts, 3); assert.equal(r.state.shield, 0);
+  assert.deepEqual([r.state.guards[0].x, r.state.guards[0].y, r.state.guards[0].cd], [3, 2, P.GUARD_STUN]);
+});
+
+test('A* combat sama optimum BFS exhaustive pada ruang kecil, solusi dapat diputar ulang', () => {
+  const lv = build({ map: ['#######', '#....E#', '#.....#', '#######'], snake: [[1, 1]], guards: [{ x: 3, y: 1, dir: 'L' }] });
+  const sol = P.solve(lv, 50000); assert.ok(sol);
+  let frontier = [P.initialState(lv)], shortest = null;
+  const seen = new Set();
+  for (let depth = 1; depth <= sol.length; depth++) {
+    const next = [];
+    for (const st of frontier) for (const k of ['U', 'D', 'L', 'R', 'W']) {
+      const r = P.stepState(lv, st, k); if (!r.moved || r.state.status === 'lost') continue;
+      if (r.state.status === 'won') { shortest = depth; break; }
+      const id = JSON.stringify({ ...r.state, steps: r.state.steps % 2, hurtUntil: Math.max(0, r.state.hurtUntil - r.state.steps) });
+      if (!seen.has(id)) { seen.add(id); next.push(r.state); }
+    }
+    if (shortest !== null) break; frontier = next;
+  }
+  assert.equal(sol.length, shortest);
+  let st = P.initialState(lv); for (const k of sol) st = P.stepState(lv, st, k).state;
+  assert.equal(st.status, 'won');
+});
+
+test('kampanye 35–42 tepat satu musuh, 43–50 tepat dua, tuas permanen dan dua jenis musuh terpakai', () => {
+  for (const [i, lv] of campaign.CAMPAIGN_LEVELS.entries()) {
+    const n = i + 1;
+    assert.equal(lv.guards.length, n < 35 ? 0 : n < 43 ? 1 : 2, `ruang ${n}`);
+    assert.ok(lv.gates.every(g => g.open === 'lever'), `ruang ${n}: tidak ada paritas gerbang`);
+    if (n >= 43) assert.deepEqual(new Set(lv.guards.map(g => g.kind)), new Set(['slime', 'warden']));
+  }
+});
```

#### Aset biner

Dua ukuran per scene (desktop dan `-m` untuk HP); seluruh berkas ada dalam `public/assets/game/`.

- `public/assets/game/bg-boss-m.webp`
- `public/assets/game/bg-boss.webp`
- `public/assets/game/bg-classic-m.webp`
- `public/assets/game/bg-classic.webp`
- `public/assets/game/bg-classicnight-m.webp`
- `public/assets/game/bg-classicnight.webp`
- `public/assets/game/bg-delivery-m.webp`
- `public/assets/game/bg-delivery.webp`
- `public/assets/game/bg-impossible-m.webp`
- `public/assets/game/bg-impossible.webp`
- `public/assets/game/bg-mayhem-m.webp`
- `public/assets/game/bg-mayhem.webp`
- `public/assets/game/bg-mayhemduo-m.webp`
- `public/assets/game/bg-mayhemduo.webp`
- `public/assets/game/bg-mayhemhard-m.webp`
- `public/assets/game/bg-mayhemhard.webp`
- `public/assets/game/bg-mayhemplus-m.webp`
- `public/assets/game/bg-mayhemplus.webp`
- `public/assets/game/bg-multiplayer-m.webp`
- `public/assets/game/bg-multiplayer.webp`
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

</details>


<a id="audit-eksternal-20261020"></a>
## Lampiran audit eksternal — 20 Oktober 2026

<details>
<summary><strong>Audit yang diterima, beserta bukti dan saran penulisnya</strong></summary>

Dokumen sumber memakai nama Eat-eat. Nama resmi aplikasi adalah K-Snake. Isi di bawah adalah laporan eksternal; saran/angka tes di dalamnya tidak berarti sudah diterapkan atau dijalankan ulang di batch ini. Hasil telaah internal ada pada bagian Nama K-Snake dan telaah audit di atas.

### Audit Eat-eat (Snake Arcade) — Bug, Celah Logika, dan Kritik Banner

Basis: `Eat-eat-Scene-Consistency (1).zip` (folder `Eat-eat-Dungeon-Revision`, Next.js 14.2.34, React 18).
Tanggal audit: 20 Oktober 2026.
Pendekatan: **eval-harness** (definisi eval + pass@k), **tdd-workflow** (tes RED dulu), **karpathy-guidelines** (fix sekecil mungkin, tiap baris bisa ditelusuri ke satu temuan).

---

#### 0. Ringkasan eksekutif

| Hal | Hasil |
|---|---|
| `npm test` (kondisi asli) | **299/299 lolos** (changelog masih menulis 285, jadi dokumentasi usang) |
| `next build` | Lolos. Satu peringatan: Google Fonts gagal diunduh di sandbox (lihat S-05) |
| Bug yang saya **buktikan** dengan probe kode | 5 (T-01, T-02, S-03, R-02, R-03) |
| Fix yang saya **validasi** di salinan scratch | 2 (T-01, T-02): 49/49 tes lolos, termasuk tes lama `engine`, `storage`, `progress`, `fuzz` |
| Total temuan | 2 Tinggi, 8 Sedang, 11 Rendah, ditambah kritik banner (bagian 3) |

**Tidak ada crash fatal atau soft-lock** yang saya temukan. Mesin simulasi cukup kuat (jam simulasi, transaksi tick, 299 tes). Masalah terbesarnya ada di **integritas data (rekor)**, **aturan hasil 2P**, dan **sisi presentasi/UX** (banner, audio, font, layout tablet).

Yang **tidak** sempat saya buktikan (jujur): tidak ada browser di sandbox, jadi semua klaim visual dihitung dari aset + CSS (bukan screenshot nyata). Perilaku iOS Safari dan perangkat sentuh nyata ditandai **[perlu verifikasi]**.

---

#### 1. Temuan bug dan celah logika

Legenda status: **[terbukti]** = saya reproduksi lewat kode, **[baca kode]** = jelas dari kode tapi tidak dijalankan, **[perlu verifikasi]** = butuh perangkat/browser nyata.

##### TINGGI

###### T-01 — Rekor "Terbaik" global untuk semua 10 mode arkade **[terbukti]**
- **Lokasi:** `lib/storage.js:5,20-21` (`snake_best` satu key), `lib/gameEngine.js:53`.
- **Bukti:** probe: simpan `snake_best=5` (rekor Classic), main Mayhem sampai skor 41 → `best` jadi 41 dan **menimpa** rekor Classic.
- **Dampak:** Time Attack (30–120 dtk), Mayhem (poison −2, big +3), dan Classic punya skala skor berbeda. Satu angka global membuat rekor tidak bermakna dan bisa "hilang" tertimpa mode lain. `records.js` sudah punya rekor per-mode untuk petualangan, jadi arkade tertinggal.
- **Saran fix (sudah divalidasi, kompatibel dengan tes lama):** Classic tetap memakai key lama `snake_best`, mode lain memakai `snake_best:<mode>`.

```diff
--- lib/storage.js
-export const loadBest = () => parseBest(read(KEYS.best));
-export const saveBest = (v) => write(KEYS.best, parseBest(v));
+// Rekor per mode. Classic tetap memakai key lama `snake_best` (kompatibel); mode lain `snake_best:<mode>`.
+export const bestKey = (mode = 'classic') => (mode === 'classic' ? KEYS.best : `${KEYS.best}:${mode}`);
+export const loadBest = (mode) => parseBest(read(bestKey(mode)));
+export const saveBest = (v, mode) => write(bestKey(mode), parseBest(v));

--- lib/gameEngine.js
-  let best = loadBest(), bestDirty = false;
+  let best = loadBest(mode), bestDirty = false;
-  function setMode(m) { mode = m; }
+  function setMode(m) { persistBest(); mode = m; best = loadBest(mode); }
-  function persistBest() { if (bestDirty) { saveBest(best); bestDirty = false; } }
+  function persistBest() { if (bestDirty) { saveBest(best, mode); bestDirty = false; } }
```
- **Catatan lanjutan:** untuk Time Attack, pertimbangkan key per durasi (`snake_best:timeattack:60`), karena skor 30 dtk vs 120 dtk tidak sebanding. Rekor lama tidak bisa dimigrasikan ke mode selain Classic (asal modenya tidak diketahui), jadi biarkan sebagai rekor Classic.
- **Tes RED dulu:** `FIX1` (Mayhem 41 tidak mengubah `snake_best=5`, menulis `snake_best:mayhem=41`) dan `FIX1b` (pindah mode memuat rekor mode itu). Keduanya lolos setelah fix.

###### T-02 — 2P: kedua pemain kehabisan nyawa bersamaan = "Seri!" walau skor jauh beda **[terbukti]**
- **Lokasi:** `lib/gameEngine.js:403-404` (`decideMultiplayerResult`).
- **Bukti:** P1 skor 30, P2 skor 2, nyawa terakhir keduanya habis di tick yang sama → judul **"Seri!"**.
- **Dampak:** pemain yang jelas unggul tidak mendapat kemenangan. Aturan menang-skor ≥50 sudah punya tiebreak skor, tapi jalur "nyawa habis bersamaan" tidak.
- **Saran fix (divalidasi):**

```diff
-    if (alive.length <= 1) return endMultiplayer(alive[0] || null);
+    if (alive.length === 1) return endMultiplayer(alive[0]);
+    if (alive.length === 0) { // nyawa habis bersamaan: skor lebih tinggi menang, sama = seri
+      const [a, b] = players; return endMultiplayer(a.score === b.score ? null : (a.score > b.score ? a : b));
+    }
```
- **Catatan:** Rebut Arena (`territory/sim.js:233`) punya aturan serupa yang **terdokumentasi** ("nyawa terakhir habis bersamaan = seri"), jadi itu keputusan desain. Putuskan konsisten: kalau 2P arkade diubah, tulis juga di `MODE_RULES.multiplayer` dan `mayhemduo`.
- **Tes:** `FIX3` (30 vs 2 → P1 menang) dan `FIX3b` (skor sama → tetap Seri) lolos.

##### SEDANG

###### S-01 — Rekor baru hilang kalau tab ditutup/di-refresh di tengah ronde **[baca kode]**
- **Lokasi:** `gameEngine.js:269-270, 374, 526, 916`. `persistBest()` hanya dipanggil di `endRun`, `returnToMenu`, dan `destroy`. Tidak ada `pagehide`/`beforeunload`; `destroy()` tidak jalan saat tab ditutup.
- **Dampak:** main bagus, rekor tertinggi baru, tutup tab → tidak tersimpan. Di HP (app di-swipe-close) ini sering terjadi.
- **Saran:** tambahkan `flush()` ke API engine dan panggil dari `pagehide` + `visibilitychange(hidden)` di `GameCanvas.jsx`:
```js
// engine: return { ..., flush: persistBest }
// GameCanvas.jsx, di dalam efek visibilitas yang sudah ada:
const flush = () => engineRef.current?.flush?.();
window.addEventListener('pagehide', flush);
// dan di hide(): flush();
```
- **Tes:** run → naikkan skor → panggil `flush()` → `store.snake_best` terisi tanpa `endRun`.

###### S-02 — Audio: tidak ada tombol mute, dan audio dibuat di luar gesture pengguna **[baca kode + perlu verifikasi di iOS]**
- **Lokasi:** `hooks/useSounds.js:15-27`. Elemen `Audio` dibuat lazily saat suara pertama dibutuhkan, yaitu di dalam game loop (bukan di event klik/tap). `play().catch(() => {})` menelan penolakan secara diam-diam.
- **Dampak:** iOS Safari (dan sebagian Chrome mobile) menolak `play()` tanpa gesture; hasilnya game bisu tanpa pesan. Selain itu, tidak ada kontrol mute/volume di seluruh app (grep `mute|volume` hanya menemukan `--muted` CSS). `death.mp3` ("bruh") dan `chomp.mp3` memutar di volume penuh, sementara `eits` dan `move` sengaja 0.25, jadi balans volume tidak seragam.
- **Saran:**
  1. Buat/unlock audio di handler tombol "Mulai main" (gesture sungguhan): panggil `ensureLoaded()` dan `play()` + `pause()` sekali pada tiap elemen.
  2. Tambah tombol mute di header menu dan HUD, simpan di `storage.js` (`snake-mute`), dan baca di `useSounds` sebelum `play()`.
  3. Samakan volume dasar (mis. chomp 0.6, death 0.7).

###### S-03 — Apel menyusut permanen saat papan penuh, dan tidak ada kondisi menang **[terbukti]**
- **Lokasi:** `gameEngine.js:196` (`checkFoodExpiry`), `:214` (`relocateOutsideFoods`), `:325` (`tick`), `grid.js:11-20` (`pickFreeCell` null).
- **Bukti:** probe `addFood()` saat papan penuh → `null`. Pemanggil membuang slot, sehingga jumlah apel berkurang dan tidak pernah dipulihkan.
- **Dampak:** (a) di mode Hard/Impossible saat arena menyempit, apel yang direlokasi bisa gagal dan jumlah apel turun; (b) ular sepanjang 255 sel (papan 17×15) tidak mengakhiri game sebagai kemenangan. Praktis jarang, tapi itu celah logika "game tidak punya akhir menang".
- **Saran:** tambah `refillFoods()` di `stepWorld` (jika `foods.length < foodCountFor(mode)`, coba `addFood` per tick) dan beri kondisi menang: bila `pickFreeCell` null untuk apel saat `snake.length >= COLS*ROWS - bombTiles.length`, panggil `endRun('won', { title: 'Papan Penuh!' ... })`.

###### S-04 — Celah swipe-memulai-game di layout samping (HP landscape) **[baca kode + perlu verifikasi]**
- **Lokasi:** `GameCanvas.jsx:130-143`, `gameEngine.js:532-551`, `Overlay.jsx:341`.
- **Fakta:** `setDir` di engine arkade (dan Kurir) **sengaja** memulai ronde dari state `menu/lost/won` (tes `delivery.test.mjs:276`: "arah memulai ronde (seperti arkade)"). Penjaganya hanya kelas `.no-swipe`. Menu penuh dan layar hasil sudah `no-swipe` (aman), **tetapi** pada mode `side` isi menu di-*portal* ke `.side-menu`; wrapper `<fieldset class="menu-fieldset">`, `.side-scroll`, dan `.side-menu` sendiri **tidak** punya `no-swipe`. Gesekan jari di padding wrapper itu bisa memulai game dari menu.
- **Inkonsistensi kontrak:** Dungeon dan Ekspedisi mengabaikan arah dari menu (tes `puzzle.test.mjs:196`, `roguelite.test.mjs:211`), sedangkan arkade dan Kurir memulai.
- **Saran paling kecil (tanpa mengubah kontrak engine):**
```diff
--- components/Overlay.jsx:341
-<fieldset disabled={busy} className="menu-fieldset">
+<fieldset disabled={busy} className="menu-fieldset no-swipe">
--- app/page.js:162
-{side && <div ref={setSideEl} className="side-menu" />}
+{side && <div ref={setSideEl} className="side-menu no-swipe" />}
```
  Ditambah guard di swipe: `if (engine.getState() === 'menu') return;` pada `onMove`. Cek manual di perangkat sebelum dianggap selesai.

###### S-05 — Font Google bergantung jaringan saat runtime; PWA tanpa service worker **[baca kode + log build]**
- **Lokasi:** `app/layout.js:24-26`, `app/manifest.js` (`display:'fullscreen'`, `orientation:'landscape'`).
- **Fakta:** komentar di layout menjelaskan font dimuat lewat `<link>` agar `next build` tidak butuh internet, tetapi **saat dibuka di browser** tetap butuh internet. Log build saya menunjukkan `Failed to download the stylesheet ... Fredoka`. Tidak ada service worker, jadi "Add to Home screen" tidak bisa dipakai offline walau terpasang sebagai app layar penuh. `<link rel=stylesheet>` eksternal juga memblokir render.
- **Dampak:** offline atau jaringan lambat → judul/brand/tombol jatuh ke `ui-rounded/system-ui`, tampilan berubah; FOUT/FOIT. Seluruh identitas visual (judul banner, brand) memakai Fredoka.
- **Saran:** self-host `Fredoka` (woff2, subset latin) di `public/fonts/` + `@font-face` dengan `font-display: swap`, atau `next/font/local`. Untuk offline sungguhan, tambah service worker (cache aset `/assets/game`, `/sounds`, JS build).

###### S-06 — Preload scene tidak dipakai; heuristik varian HP tidak konsisten **[baca kode]**
- **Lokasi:** `lib/sceneTheme.js:84-87`, `components/LoadingScreen.jsx:9`, `components/BackgroundLayer.jsx:20`.
- **Fakta:**
  1. `bgFiles()` (preload semua scene) **hanya dipanggil oleh tes**; `LoadingScreen` hanya memuat banner Classic. Tiap pindah mode, banner baru diunduh saat itu juga (60–180 KB) lalu memudar masuk (`scene-in`) → kedip/kosong sesaat. Total aset scene 3,5 MB.
  2. `<picture>` memilih varian `-m` dengan `(max-width:768px), (pointer:coarse)`, sedangkan `isCoarse()` memakai `(hover:none) and (pointer:coarse)`. Di jendela desktop sempit (<768 px) atau tablet berpointer ganda, loader memuat varian yang **berbeda** dari yang ditampilkan → unduh ganda.
- **Saran:** satukan satu fungsi `useMobileVariant()` dipakai keduanya; preload scene mode tetangga setelah menu tampil (`requestIdleCallback`), atau sekurangnya preload scene grup aktif.

###### S-07 — Grid petualangan salah untuk 3 mode (tablet sentuh potret) **[baca kode]**
- **Lokasi:** `globals.css:116, 287-289`, `Overlay.jsx:74,164`.
- **Fakta:** pada perangkat sentuh daftar petualangan jadi **3** (Dungeon, Kurir, Ekspedisi; Rebut Arena butuh keyboard, Boss disembunyikan). CSS hanya punya aturan khusus `data-n="4"`; default `repeat(5, …)`. Pada layar sentuh lebar ≥640 px dan potret (tablet), 3 tombol menempati 3/5 lebar dan rata kiri, dengan 2 kolom kosong.
- **Saran:** ganti `repeat(5,…)` dengan `repeat(var(--n, 5), …)` dan set `style={{'--n': ADVENTURE_MODES.length}}` dari JSX, sehingga jumlah mode berapa pun otomatis rapi.

###### S-08 — Kanvas tidak sadar DPR, jadi buram di layar retina **[baca kode]**
- **Lokasi:** `GameCanvas.jsx:159` (`width="680" height="600"`), `globals.css:8-9`.
- **Fakta:** kanvas 680×600 ditampilkan ±640 px CSS. Di layar 2× itu berarti ±1280 px fisik dari 680 piksel → upscale ±1,9×, tepi sprite dan teks kabur.
- **Saran:** set `canvas.width = 680*dpr`, `canvas.height = 600*dpr` dengan `dpr = Math.min(2, devicePixelRatio)` sebelum engine dibuat. Engine menurunkan `cell = canvas.width / COLS` dari lebar kanvas, jadi sebagian besar kode ikut menyesuaikan. **Cek dulu** bahwa controller lain (territory, boss, delivery) juga memakai `canvas.width` dan bukan konstanta 680/600.

##### RENDAH

| ID | Temuan | Lokasi | Saran singkat |
|---|---|---|---|
| R-01 | Animasi bergantung frame rate: `tongueT += 16`, `portalRot += 0.02` per frame → di layar 120/144 Hz lidah dan portal berputar 2× lebih cepat | `gameEngine.js:748, 583` | Pakai delta waktu: `tongueT += dt; portalRot += 0.0012 * dt` |
| R-02 | Kode mati: `if (snake.length < 1) return gameOver();` tidak mungkin tercapai karena `slice(0, Math.min(2, len))` **[terbukti: panjang jadi 2]** | `gameEngine.js:242` | Hapus baris itu |
| R-03 | Respawn 2P yang gagal 12× menyingkirkan pemain walau masih punya nyawa dan lawan otomatis menang **[terbukti di kondisi ekstrem: papan penuh ranjau]** | `gameEngine.js:417-419` | Sebelum `alive=false`, kosongkan ranjau/makanan atau kurangi nyawa lalu akhiri dengan hasil jelas |
| R-04 | Jeda otomatis juga dipicu `window.blur` (klik devtools, notifikasi, iframe), dan `focus` melepas blocker `hidden` walau `document.hidden` masih true | `GameCanvas.jsx:112-122` | Gunakan hanya `visibilitychange`, atau cek `document.hidden` di `show()` |
| R-05 | Kedip hidrasi: `useMediaQuery` mulai `false`, jadi frame pertama di HP menampilkan menu desktop (grup 2P, layout lebar) sebelum menyesuaikan | `hooks/useMediaQuery.js` | Tahan render menu sampai efek pertama, atau pakai CSS `@media` untuk bagian yang bisa |
| R-06 | `inert={cond ? '' : undefined}` hanya berfungsi di React 18; di React 19 string kosong dianggap `false` dan modal tidak lagi mengunci | `app/page.js:105` | Saat upgrade ke React 19 ganti ke `inert={cond}` |
| R-07 | Salinan/dokumen tidak sinkron: metadata menulis "10 mode arkade dan 5 petualangan", padahal tampil 4 (3 di sentuh); README mengaku "port 1:1" dan hanya mendaftar 4 komponen; changelog tertulis 285 tes (aktual 299) | `layout.js:9`, `manifest.js:5`, `README.md`, `changelog.md` | Sinkronkan angka dan daftar; hitung `modesInGroup('adventure').length` secara dinamis |
| R-08 | Utang aset/CSS: 5 file `bg-*.svg` (puzzle, delivery, roguelite, boss, territory) tidak direferensikan di mana pun; `mask-image` ditimpa 5× di `globals.css` (baris 85, 251, 252, 258, 259, 266); kelas Tailwind lama di `RotatePrompt` (`text-[#d8e6c8]`, stroke svg) dikalahkan CSS `.rotate-dialog` | `public/assets/game`, `globals.css`, `RotatePrompt.jsx` | Hapus SVG yatim; rapikan satu aturan akhir per properti |
| R-09 | Header bantuan statis: `HelpModal` selalu menulis "Panah/WASD — gerak ular" dan "Swipe", tidak menyebut Z/R (Dungeon) atau P1/P2 (Rebut Arena) di blok kontrol | `HelpModal.jsx:41-45` | Ambil `controls` dari `getMode(mode).controls` (sudah ada di registry) |
| R-10 | Revive: jika komponen di-destroy tepat saat `await consume()`, jatah sudah terpotong tetapi revive tidak diterapkan; kuota memakai `Date.now()` sehingga bisa dimanipulasi jam perangkat (diakui di komentar) | `roguelite/controller.js:164-167`, `revives.js` | Cek `destroyed` sebelum `consume`; terima batasan jam sebagai keputusan sadar |
| R-11 | Performa gambar: tiap frame menggambar 255 `fillRect` papan + (mode gelap) menggambar ulang kanvas veil penuh | `gameEngine.js:563-566, 796-811` | Cache papan ke `OffscreenCanvas` sekali per perubahan `borderInset`/mode |

---

#### 2. Yang saya periksa dan ternyata aman (supaya tidak dikerjakan sia-sia)

- **Swipe dari menu / layar hasil:** aman, `.focus-menu`, `.start-menu`, `.result-overlay`, `HelpModal`, `RotatePrompt`, `DPad` semuanya `no-swipe`. Satu-satunya celah ada di S-04.
- **Keyboard memulai game dari menu/game over:** tidak bisa; `createDirectionInput.enabled()` mensyaratkan state `playing`.
- **Tabrakan ekor & kepala-ke-kepala 1P/2P:** benar (aturan ekor dilepas saat tidak tumbuh; tukar kepala ditangani).
- **Jam simulasi saat jeda:** semua deadline memakai `clock.now()`, jadi efek/apel/ranjau/Time Attack ikut membeku dengan benar.
- **Alur revive Ekspedisi:** kandidat posisi aman disiapkan **sebelum** kuota dipotong; error penyimpanan ditangani; mutex lewat `navigator.locks`.
- **Simulasi Rebut Arena:** urutan tick terdokumentasi dan konsisten dengan tes; flood-fill klaim benar untuk sel sengketa.
- **Validasi storage:** semua nilai lewat allowlist/parse, tidak ada jalur NaN.

---

#### 3. Kritik banner (gambar `Classic` yang kamu kirim, dan 14 scene lainnya)

##### 3.1 Diagnosis berbasis data

Saya ukur semua 15 aset (`bg-*.webp`, 1672×941, dan varian `-m` 960×540) dan menghitung geometri dari CSS.

| Ukuran | Nilai |
|---|---|
| Piksel transparan per aset | **46–55%** (portal 52–53%, classicnight 55%) |
| 45% sisi kiri tiap aset yang transparan | **91–99%** |
| Seni mulai dari x = | **34–39%** lebar gambar (sisanya kosong) |
| Banner desktop 968 px × 300 px | gambar `object-fit: contain` jadi 533 px lebar, rata kanan → **435 px (45%) kosong di kiri**; seni hanya ±330 px (**±34% lebar banner**) |
| Banner desktop pada tinggi ≤850 px (240 px) | gambar 426 px → **542 px (56%) kosong**; seni hanya ±264 px (**±27%**) |

Artinya di laptop, **kira-kira dua pertiga banner adalah warna halaman krem** dan judul `Classic` kecil melayang di ruang kosong itu, seperti di screenshot-mu. Penyebab langsungnya sengaja: `globals.css:265` memberi `background:transparent; border-radius:0` pada `.menu-hero`, dan `:267` menempel gambar rata kanan dengan `contain`. Changelog menyebutnya "area judul transparan".

##### 3.2 Ketidakkonsistenan antar scene (dari contact sheet 15 banner di atas warna halaman)

1. **Dua keluarga framing.** 13 scene menempel ke **tepi atas dan kanan** dan terpotong lurus (bbox y 0–100%). Itu terlihat seperti tangkapan layar yang dipotong: pohon Classic terpotong datar di kanan atas. Hanya **Malam** dan **Portal** berupa vinyet utuh dengan margin atas-bawah 3–5%.
2. **Tepi kiri siluet berbeda-beda.** Classic dan Time Attack: tepi awan mulus. Mayhem Hard: tepi robek bergerigi. Mayhem Duo: tepi tersebar dengan partikel daun dan debu. Boss dan Territory: dasar rumput melebar tanpa langit.
3. **Skala dan posisi maskot tidak seragam.** Classic dan Mayhem: maskot besar di pusat. Boss dan Territory: maskot kecil di bawah. Roguelite dan Puzzle: maskot di bawah-kiri dengan props besar. Horizon dan sudut kamera bergeser dari scene ke scene.
4. **Lebar kosong berbeda.** Seni mulai di x = 34% (Portal) sampai 39% (Hard, Delivery). Perbedaan 5 poin ini membuat judul seolah berpindah jarak dari gambar saat pindah mode.
5. **Kontras teks bergantung pada latar krem.** Judul putih ber-outline hijau tua (`-webkit-text-stroke:3px`) hanya terbaca karena latarnya krem. Begitu scene diisi penuh, gaya ini perlu dirancang ulang (scrim di bawah).
6. **Batas bawah lemah.** Dengan `border-radius:0` dan latar transparan, banner tidak punya "bingkai"; gambar dan menu di bawahnya (`start-menu`) tampak tidak terhubung.
7. **Overlap teks mepet pada 640–680 px.** `hero-copy` memakai `max-width:55%`; seni mulai ±46% lebar pada container 608 px, jadi teks bisa menimpa seni beberapa piksel di lebar itu.

##### 3.3 Saran fix — dua jalur

###### Jalur A (disarankan): ganti aset dengan banner **full-bleed**
Ini perbaikan yang benar-benar menjawab "banner bisa diisi penuh dengan bg".

- **Rasio dan ukuran:** desktop **1936×600 (≈3,2:1)** dan HP tetap **960×540 (16:9)**; keduanya **tanpa area transparan**, seluruh bingkai berisi scene.
- **Zona teks:** 38–42% kiri berisi langit/rumput **detail rendah** (ruang negatif), tanpa objek penting.
- **Zona maskot:** pusat maskot pada x = 62–78%, kaki di 70–85% tinggi; **horizon sama di semua scene (±68%)**; tinggi kepala maskot ±30% tinggi banner.
- **Gaya seragam:** garis luar 4 px, palet jenuh sedang, sudut kamera sama; acuannya tetap Mayhem+/Hard (sesuai keputusan changelog).
- **Template prompt aset (satu untuk semua mode, ganti bagian [..]):**
  > Wide panoramic cartoon scene, 1936x600, full-bleed, no transparent areas, no border. Left 40% is calm low-detail [sky and meadow] for text. Green cartoon snake mascot (same proportions as reference, 4px dark outline) centered at 70% of the width, bottom third of the frame. Horizon at 68% height. Mode props: [apple, bomb, hourglass ...]. Palette: [sky color] to [ground color]. No text, no logo.
- **Perubahan kode kecil:**
```jsx
// BackgroundLayer.jsx — tambah varian lebar untuk desktop
const wide = src.replace('.webp', '-w.webp');   // 1936x600
<picture key={mode}>
  <source media="(max-width: 639px), (pointer: coarse)" srcSet={src.replace('.webp', '-m.webp')} />
  <img src={wide} alt="" width="1936" height="600" draggable={false} />
</picture>
```
```css
/* globals.css — banner penuh, bingkai kembali */
.menu-hero { background:#254c3a; border-radius:24px; }
.menu-hero:has(.scene-cutout) { background:#254c3a; border-radius:24px; }  /* batalkan baris 265 */
.focus-scene img { width:100%; height:100%; object-fit:cover; object-position:right center; }
/* scrim agar teks terbaca di atas scene apa pun */
.menu-hero::before { content:''; position:absolute; inset:0; z-index:1; pointer-events:none;
  background:linear-gradient(90deg, rgba(18,38,26,.62) 0%, rgba(18,38,26,.30) 38%, transparent 62%); }
.hero-copy { z-index:2; }
```

###### Jalur B (cepat, tanpa aset baru): isi latar dengan gradien per-mode
Cocok sebagai langkah sementara. Aset cutout tetap, tetapi latar tidak lagi krem kosong. Karena seni sudah menempel ke tepi atas dan kanan, tepi terpotongnya **menyatu dengan tepi kontainer** sehingga terlihat disengaja.

```js
// lib/sceneTheme.js
export const SCENE_BG = {                       // [langit, tanah], titik awal, tuning dengan mata
  classic:      ['#9bd8f2', '#b5d65a'],
  classicnight: ['#14304a', '#2f5b45'],
  portal:       ['#8fb7d6', '#7ea66c'],
  timeattack:   ['#f6b95a', '#c9a04a'],
  mayhem:       ['#f99b53', '#96b84a'],
  mayhemplus:   ['#ed7d61', '#8db650'],
  mayhemhard:   ['#f7bb57', '#96ad3b'],
  impossible:   ['#a8364c', '#7dac43'],
  multiplayer:  ['#f1ecc0', '#9dc651'],
  mayhemduo:    ['#e6ab7e', '#a7ba4a'],
  puzzle:       ['#3e5a73', '#647d54'],
  delivery:     ['#f2c76a', '#8e8e3f'],
  roguelite:    ['#7cc3b3', '#939b47'],
  boss:         ['#e8a847', '#9c9841'],
  territory:    ['#f8bb59', '#6d8646'],
};
```
```jsx
// Overlay.jsx:337
<div className="menu-hero" style={{ '--sky': SCENE_BG[mode]?.[0], '--ground': SCENE_BG[mode]?.[1] }}>
```
```css
/* globals.css:265 diganti */
.menu-hero:has(.scene-cutout) {
  background:linear-gradient(180deg, var(--sky,#9bd8f2) 0%, var(--ground,#b5d65a) 100%);
  border-radius:24px;
}
.scene-cutout img { object-position:right bottom; }
```
Tambahkan scrim yang sama seperti Jalur A agar judul terbaca. Kekurangannya: kamu tetap punya dua keluarga framing (lihat 3.2 poin 1 dan 3), jadi Jalur B hanya menutup "kosongnya", bukan "tidak konsistennya". Untuk konsistensi sungguhan, tetap perlu Jalur A.

##### 3.4 Checklist konsistensi aset (pakai sebagai kriteria terima)

- [ ] Semua 15 banner: 0% piksel transparan, rasio sama.
- [ ] Seni terpotong/tidak terpotong **sama** di semua scene (disarankan: full-bleed, tanpa tepi lurus yang menggantung).
- [ ] Horizon di 68% ±2% dan kepala maskot ±30% tinggi banner di semua scene.
- [ ] 40% kiri: luminans rata-rata seragam dan tanpa objek penting.
- [ ] Kontras judul ≥ 4,5:1 terhadap scrim di semua scene (uji di Impossible dan Time Attack, kasus tergelap/tercerah).
- [ ] Preload scene aktif + tetangga (S-06), tidak ada kedip saat ganti mode.

---

#### 4. Definisi eval (eval-harness)

##### Capability evals (harus RED dulu, lalu hijau)

| Eval | Kriteria lulus | Penilai |
|---|---|---|
| `cap-best-per-mode` | Mayhem skor 41 tidak mengubah `snake_best`; `snake_best:mayhem=41`; `setMode` memuat rekor mode itu | kode (`node --test`) |
| `cap-2p-simultaneous-lives` | skor 30 vs 2, nyawa habis bersamaan → P1 menang; skor sama → Seri | kode |
| `cap-flush-on-hide` | `flush()` menulis rekor tanpa `endRun` | kode |
| `cap-board-full-win` | papan penuh → hasil menang dan tidak ada `addFood` yang jatuh diam-diam | kode |
| `cap-audio-unlock` | handler tombol "Mulai main" membuat dan membuka semua elemen audio; mute menahan `play()` | kode (stub `Audio`) |
| `cap-adv-grid-n` | `--n` = jumlah mode petualangan tampil; 3 mode mengisi baris | tes CSS string (pola sudah ada di `registry.test.mjs`) |
| `cap-banner-opaque` | semua `bg-*.webp` (dan `-w`, `-m`) memiliki 0% piksel dengan alpha < 255 | skrip Pillow di tes |
| `cap-banner-horizon` | horizon dan skala maskot dalam toleransi | **penilai manusia** (risiko rendah) |

##### Regression evals

- Baseline: kondisi zip ini, **299/299 lolos**.
- Target: **pass^3 = 100%** pada seluruh `npm test` setelah tiap fix (menjalankan 3× berturut-turut), `next build` lolos, tidak ada key `localStorage` lama yang berubah makna (`snake_best` tetap = rekor Classic).
- Metrik capability: pass@3 > 90%.

---

#### 5. Rencana eksekusi (TDD + perubahan bedah)

Satu fix = satu commit, tiap baris harus bisa ditelusuri ke satu ID temuan.

1. **T-01** rekor per mode → tes RED → patch `storage.js` + 3 baris `gameEngine.js` → `npm test`.
2. **T-02** tiebreak 2P → tes RED → patch 4 baris → `npm test`. Putuskan sekalian aturan Rebut Arena.
3. **S-01** `flush()` + `pagehide`.
4. **S-04** tambah `no-swipe` pada fieldset/side-menu + guard swipe di state `menu`.
5. **S-07** `--n` untuk grid petualangan (CSS satu baris + satu atribut style).
6. **S-02** unlock audio + mute (lalu uji di iPhone sungguhan).
7. **S-06 + S-05** satukan heuristik varian, preload, dan self-host font.
8. **Banner (bagian 3)**: Jalur B dulu (±30 menit, tanpa aset baru), lalu Jalur A saat aset baru siap.
9. **S-03, S-08, lalu R-01..R-11** sebagai batch kecil.
10. Perbarui `README.md`, `changelog.md` (angka tes aktual), dan `metadata`.

Saran `strategic-compact`: karena fase eksplorasi/audit ini sudah selesai dan rencananya final, **compact konteks sebelum mulai implementasi** (jangan di tengah satu fix).

---

#### 6. Cakupan dan batasan audit

- **Dibaca penuh:** `gameEngine.js`, `storage.js`, `progress.js`, `records.js`, `sim/*`, `input.js`, `modes/registry.js`, `constants.js`, `sceneTheme.js`, `page.js`, `layout.js`, `manifest.js`, `GameCanvas`, `Overlay`, `BackgroundLayer`, `DPad`, `HelpModal`, `LoadingScreen`, `RotatePrompt`, `useSounds`, hooks, `globals.css`, `territory/sim.js`, `roguelite/revives.js`.
- **Dibaca sebagian / diuji lewat tes yang sudah ada:** `puzzle/{sim,generator,controller}`, `boss/{sim,controller}`, `delivery/{sim,controller}`, `roguelite/{sim,controller}`, `territory/controller`, `HUD`, `UpgradeDialog`. Tidak ada temuan dari sini, tetapi **bukan jaminan bebas bug**; sebaiknya lanjutkan audit per mode.
- **Tidak bisa diuji di sandbox:** render browser nyata, iOS Safari, gesture sentuh, audio. Semua item bertanda **[perlu verifikasi]** wajib dicek di perangkat.
- File probe sementara saya hapus; **tidak ada file proyekmu yang diubah**. Fix T-01 dan T-02 divalidasi hanya di salinan scratch.

</details>

---

## 2026-10-22 — Dungeon: Shadow Heist (kampanye revisi 5)

### Gameplay dan integrasi

- Dungeon berubah dari puzzle giliran/pertarungan tiga hati menjadi pencurian relik real-time. Tetap memakai mode ID/kind `puzzle`, menu Dungeon, dan halaman utama yang sama.
- Simulasi fixed-step 60 Hz: arah ditahan/dilepas, diagonal dinormalisasi, collision lingkaran dengan substep, serta tiga kecepatan (mengendap/jalan/lari). Waktu frame dibatasi agar kembali dari tab latar tidak membuat pemain melompat.
- WASD/panah bergerak; Shift mengendap; Spasi berlari; E berinteraksi; F bersembunyi/keluar; Q memakai alat; X mengganti alat; R mengulang; Esc menjeda. Input dibersihkan saat jeda, kehilangan fokus, restart, dan pergantian mode.
- Kunci/pintu berlabel A, tuas/segel permanen, relik wajib, koin opsional, ceruk persembunyian, portal berpasangan, dan pelat berwaktu. Gerbang pelat menetap terbuka setelah dilewati serta tidak menutup menimpa karakter.
- Batu dilempar ke arah hadap untuk mengalihkan penjaga. Kristal asap menutup pandangan selama 4,5 detik tanpa menghapus collision atau ingatan penjaga. Persediaan kedua alat terbatas.

### Penjaga dan lingkungan

- FSM PATROL, SUSPICIOUS, INVESTIGATE, CHASE, SEARCH, dan RETURN; penglihatan bertahap, lokasi terakhir terlihat, penyelidikan suara, pengejaran, pencarian, lalu kembali ke patroli.
- Raycasting yang sama menjadi dasar deteksi dan kerucut visual. Dinding, peti, pintu tertutup, dan asap menghalangi pandangan; obor dan bayangan memengaruhi laju kecurigaan. Penjaga yang melihat pemain masuk persembunyian dapat memeriksanya.
- Navigasi grid dengan cache rute dan mekanisme saling memberi jalan. Menyentuh penjaga dapat menggagalkan misi; serangan dan hati dari kontrak lama tidak dipakai lagi.
- Suara menyebar lewat petak yang tersambung: dinding/peti menghalangi, pintu tertutup menambahkan redaman tiga petak. Berlari terdengar lebih jauh; lonceng memperbesar gangguan. Kristal pengawas memberi alarm dengan sorot yang terlihat.

### Kampanye, progres, dan hadiah

- Semua 50 misi dirancang ulang memakai 10 denah dasar buatan tangan dan 50 konfigurasi misi deterministik, dengan tahap pengenalan mekanik, variasi titik masuk, kunci, tuas, patroli, serta bonus.
- ID `jk-1`–`jk-5` dan `gen-6`–`gen-50` dipertahankan. Level 37 menggunakan tuas permanen dan pintasan pelat 10 detik, tanpa syarat paritas langkah. Misi akhir menambah relik kedua, penjaga keempat, dan jalur gerbang alternatif.
- `snake-progress-v1` tetap digunakan. Rekor langkah lama `best`, level selesai, koin, dan data mode lain dipertahankan. Catatan baru `heist` menyimpan revisi, waktu terbaik dalam milidetik, bintang, bonus terbaik, dan alarm tersedikit.
- Satu bintang untuk selesai; dua untuk tanpa alarm; tiga untuk tanpa alarm, seluruh bonus, serta waktu acuan terpenuhi. Replay hanya memberi selisih bonus terbaik. Hasil lokal yang gagal disimpan tetap tersedia untuk retry dan digabungkan dengan progres tersimpan terbaru.

### Tampilan dan kontrol

- Renderer Canvas orisinal: lantai berlapis, dinding batu, peti, maskot ular penjelajah dengan syal/tas, penjaga berhelm, arah hadap, status ?, !, dan …, sorot pandang, bayangan, asap, serta efek pengambilan objek.
- HUD ringkas berbahasa Indonesia dengan tujuan, relik, bonus, waktu, status bahaya, dan persediaan alat. Pemilih level menampilkan bintang baru serta penanda penyelesaian versi lama.
- Panel desktop di sisi arena dan kontrol landscape ponsel: joystick delapan arah, pilihan gait, interaksi, sembunyi, dan alat. Tombol aksi memakai pointer sentuh agar jari kedua tetap bekerja saat joystick ditahan; pembatalan pointer mengembalikan joystick ke tengah.
- Cache lantai, pathfinding berkala, HUD 10 Hz, batas DPR 2, dan dukungan reduced motion. Tidak menambah dependensi proyek.

### Berkas yang berubah

| Kelompok | Berkas lama yang dimodifikasi |
| --- | --- |
| Halaman utama | `app/page.js`, `app/globals.css` |
| Komponen bersama | `components/GameCanvas.jsx`, `components/DPad.jsx`, `components/Hud.jsx`, `components/Overlay.jsx` |
| Registrasi dan progres | `lib/constants.js`, `lib/modes/registry.js`, `lib/progress.js` |
| Sistem Dungeon | `lib/puzzle/controller.js`, `lib/puzzle/sim.js`, `lib/puzzle/render.js`, `lib/puzzle/generator.js`, `lib/puzzle/levels.js`, `lib/puzzle/campaign.js`, `lib/puzzle/campaignData.js` |
| Generator kampanye | `scripts/build-campaign.mjs` |
| Tes dan fixture | `tests/puzzle.test.mjs`, `tests/puzzle9a.test.mjs`, `tests/puzzle9b.test.mjs`, `tests/puzzle.fixtures.mjs`, `tests/dungeon-combat.test.mjs`, `tests/dungeon-input.test.mjs`, `tests/helpers/env.mjs`, `tests/revive-quest.test.mjs` |
| Dokumentasi | Entri ini ditambahkan ke `changelog.md`; riwayat lama dipertahankan. |

Berkas sumber baru: `components/DungeonControls.jsx`, `lib/puzzle/geometry.js`, dan `lib/puzzle/validation.js`. Tidak ada halaman/rute baru atau berkas Markdown baru.

### Verifikasi yang benar-benar dijalankan

- Baseline ZIP: `npm test` **299/299 lolos**. Kontrak tes giliran, undo, dan pertarungan Dungeon diganti dengan perilaku stealth real-time; cakupan mode lain dipertahankan.
- Hasil akhir `npm test`: **298/298 lolos**, 0 gagal, 0 dilewati. Mencakup gerakan, collision, hold/release, jeda/fokus/restart, vision/occlusion, noise, FSM, hiding, interaksi, progres/migrasi, retry/merge, hadiah replay, dan regresi mode lain.
- Seluruh 50 misi lolos replay jalur waktu melalui simulasi aktif: semua relik, seluruh bonus, keluar tanpa alarm dan tanpa alat, dalam waktu tiga bintang. Level 2, 16, 27, 37, dan 50 juga lolos dengan waktu mulai ditunda tiga detik.
- `npm run build:campaign`: **lolos**, memvalidasi 50 misi dan menulis 45 entri kampanye.
- `npm run build`: **lolos**, termasuk kompilasi, pemeriksaan lint/tipe bawaan, dan prerender. Route tetap `/`, `/_not-found`, serta `/manifest.webmanifest`.
- Browser Chromium headless: **12 pemeriksaan integrasi lolos**. Desktop 1366×768: gerak/lepas, Esc jeda/resume, restart, blur, ukuran arena, bantuan, dan kembali bermain Classic. Landscape sentuh 844×390: progres lama membuka level 37, tata letak, joystick+alat simultan, pointer cancel, serta pilihan gait. Gate orientasi portrait tetap bekerja. Tidak ada error runtime halaman selama pemeriksaan.
- Render desktop dan landscape diperiksa secara visual. `git diff --check` lolos. Paket ZIP tidak menyertakan `node_modules`, `.next`, riwayat git, log, atau alat pengujian sementara.

### Batas verifikasi

- Pencarian jalur bercabang menjalankan simulasi 60 Hz beserta suara, kecurigaan, dan ingatan penjaga, lalu memutar ulang rute yang ditemukan. Ini membuktikan rute contoh yang berhasil, bukan seluruh kemungkinan timing, pilihan pemain, atau semua keadaan AI. Denah memakai variasi terkurasi, bukan 50 topologi yang seluruhnya unik.
- Pengujian sentuh memakai emulasi Chromium, belum perangkat Android/iOS fisik atau Safari. Performa ponsel kelas bawah dan keseimbangan kesulitan masih memerlukan playtest perangkat serta pemain nyata; tidak ada klaim 60 FPS terukur pada perangkat tersebut.

---

## 2026-10-22 — Denah acak per ronde dan alarm CCTV langsung

### Perilaku baru

- Mulai, coba lagi setelah kalah, lanjut level berikutnya, serta **Ulang & acak / R** memilih varian ronde baru. Pause/resume mempertahankan denah, posisi, dan waktu yang sama. Bentuk ronde berikutnya tidak mengulang bentuk ronde sebelumnya selama controller Dungeon tetap aktif.
- Empat bentuk area yang benar-benar dapat dilalui: **bulat, L, C, dan T**. Area kosong di luar denah tidak digambar sebagai lantai dan tetap menghalangi gerak, penglihatan, serta suara.
- Tiap level memiliki delapan varian dengan susunan ruang relik, posisi masuk/keluar, kunci, tuas, bonus, persembunyian, penjaga/patroli, CCTV, dan perlengkapan lingkungan yang berbeda. Total **400 varian untuk 50 level**; pemilihan berlangsung acak saat ronde dimulai.
- Pembuatan varian memakai seed yang dapat direproduksi saat build. Hanya varian yang lolos geometri, urutan akses, keamanan spawn, fungsi sorot CCTV, serta replay misi tiga bintang yang dimasukkan ke paket. Tidak menjalankan pencarian jalur yang mahal saat pemain memulai ronde.
- ID level, urutan unlock, jumlah relik/bonus per tingkat, key penyimpanan, dan rekor lama dipertahankan. Rekor/hadiah tetap milik level; berpindah varian tidak memberi hadiah replay tambahan. Fixture level kustom tetap dihormati dan tidak diganti oleh bank kampanye.

### CCTV dan respons penjaga

- CCTV mendeteksi pada **tick simulasi pertama saat pemain terlihat**, tanpa penumpukan kecurigaan. Ini memicu alarm, bukan kematian otomatis.
- Alarm jaringan mengirim lokasi yang terlihat kepada **semua penjaga**, termasuk yang jauh atau di balik dinding. Penjaga menuju titik tersebut untuk menyelidiki; collision dan pintu terkunci tetap berlaku.
- Selama CCTV melihat pemain, lokasi laporan terus diperbarui. Setelah sorot terputus, laporan berhenti pada lokasi terakhir. Penjaga mencari di sana lalu kembali ke patroli jika tidak menemukan pemain; tidak mengetahui posisi baru secara otomatis.
- Suara langkah tidak menimpa tujuan laporan CCTV yang masih ditangani. Beberapa kamera yang melihat bersamaan dihitung sebagai satu episode alarm; terlihat lagi setelah putus sorot dapat memicu episode baru.
- Dinding, pintu tertutup, asap, dan persembunyian yang tidak teramati tetap melindungi. Kamera memiliki tubuh/lensa dan label CCTV; penjaga yang menerima laporan memakai tanda seru dan sorot merah.
- HUD dan bantuan menjelaskan status CCTV serta pergantian denah. Tombol **Ulang & acak** tersedia di header HUD landscape pendek, sehingga tidak bergantung pada tombol bawah yang disembunyikan untuk menghemat ruang.

### Berkas

- Sumber baru: `lib/puzzle/rounds.js`.
- Tes baru: `tests/dungeon-rounds.test.mjs`.
- Diubah: `lib/puzzle/{campaign,campaignData,controller,geometry,levels,render,sim,validation}.js`, `scripts/build-campaign.mjs`, `lib/constants.js`, `lib/modes/registry.js`, `components/Hud.jsx`, `components/DungeonControls.jsx`.
- Tes diperbarui: `tests/dungeon-combat.test.mjs`, `tests/puzzle9b.test.mjs`, `tests/revive-quest.test.mjs`, dan `tests/helpers/env.mjs`. Fixture koin menggunakan ruang uji tersendiri agar tidak bergantung pada denah kampanye yang berubah.
- Tidak menambah route, halaman, Markdown, atau dependensi proyek. Dokumentasi hanya menambahkan entri ini ke `changelog.md`.

### Hasil pemeriksaan

- `npm run build:campaign`: **lolos**, 50 level / 400 varian. Seluruh varian memiliki replay tanpa alat/alarm, mengumpulkan semua relik dan bonus, lalu keluar dalam par tiga bintang. Semua delapan varian level 2, 16, 27, 37, dan 50 juga disaring dengan waktu mulai ditunda tiga detik.
- `npm test`: **307/307 lolos**, 0 gagal, 0 dilewati. Mencakup replay ulang seluruh 400 varian, reproduksi seed, perubahan bentuk, pause/resume, identitas level, progres/hadiah, batas luar denah, CCTV instan/global/occlusion/reacquisition, serta regresi mode lain.
- Pencarian/replay temporal kini memakai input arah -1/0/1 seperti keyboard/joystick. Heuristik jarak koridor membantu pencarian di denah melengkung dan bercabang tanpa mengubah simulasi permainan.
- `npm run build`: **lolos**, termasuk lint/pemeriksaan tipe bawaan dan prerender; route tetap sama. First Load JS halaman utama sekitar **300 kB** (sebelumnya sekitar 202 kB), terutama karena bank varian yang telah diverifikasi.
- Chromium dengan build produksi: **9 pemeriksaan browser lolos**. Pause/resume, empat bentuk melalui R, nomor level tetap benar, tata letak desktop 1366×768, bantuan, progres lama ke level 37, landscape 844×390, joystick+asap simultan, pointer cancel, ulang melalui sentuhan, dan gate portrait; tidak ditemukan error runtime halaman dalam pengujian tersebut.
- Render keempat bentuk dan HUD landscape diperiksa secara visual. `git diff --check` lolos.

### Batas yang tetap berlaku

- Pengacakan memilih dari bank delapan varian teruji per level, bukan menghasilkan denah tanpa batas saat bermain. Varian lama dapat muncul lagi setelah ronde lain; bentuk yang sama tidak dipilih dua ronde berurutan dalam sesi controller tersebut.
- Replay membuktikan rute contoh yang berhasil pada setiap varian, bukan semua kemungkinan timing/perilaku pemain. Pengujian ponsel masih berupa emulasi Chromium; belum perangkat fisik Android/iOS atau Safari.

### 2026-10-22 — Dungeon revision 6: map abstrak, bayangan, anjing, dan trap

#### Perubahan gameplay

- Obor sekarang menerangi **radius 360°**, dengan batas cahaya memakai raycast yang sama dengan deteksi. Tembok, pintu tertutup, peti, dan asap tetap memutus cahaya. Lingkaran tidak memiliki garis kerucut dari pusat.
- Enam keluarga denah: bulat, L, C, T, **gua abstrak**, dan **reruntuhan**. Tetap delapan varian per level (400 untuk 50 level); dua slot masing-masing untuk gua dan reruntuhan. Ronde berikutnya menghindari bentuk ronde sebelumnya.
- Penjaga yang berhenti menghadap ruas koridor menuju tujuan patroli berikutnya. Perhitungan ulang rute tidak lagi menarik musuh kembali ke pusat petak setiap kali sehingga berjalan bolak-balik; jalan terputus tidak dipaksa ditembus. Pencarian memakai sapuan pendek, bukan berputar terus.
- **Level 20+**: satu penjaga tipe runner berarmor merah/chevron, bergerak **18% lebih cepat** daripada penjaga biasa pada level yang sama.
- **Level 30+**: makhluk bayangan bersarang dekat tembok atau pintu palsu. Jalur menerjangnya tetap lurus, ditandai jejak panah dan peringatan merah **0,8 detik** sebelum serbuan. Dapat memakan ular, penjaga, dan anjing; musuh yang dimakan hilang untuk ronde itu dan berhenti mendeteksi, menggonggong, menghalangi jalan, atau menerima laporan CCTV. Tidak mengejar keluar jalurnya.
- **Level 35+**: satu anjing terikat dan satu anjing lepas. Jangkauan penglihatan melingkar **4,8 petak**, kecepatan kejar **4,8 petak/detik** (lari ular 3,65). Anjing terikat dibatasi radius rantai 2,3 petak serta dinding; yang lepas patroli, mengejar lokasi terlihat terakhir, mencari, lalu kembali.
- Gonggongan anjing memanggil penjaga melalui koridor dalam radius suara 8 petak. Dinding memutus suara dan pintu meredamnya. Ada indikator GUK, status HUD, dan bunyi gonggongan sintetis; CCTV tetap berbeda karena laporannya menjangkau semua penjaga hidup.
- **Batu, asap, dan trap dapat digunakan berulang**, dengan cooldown independen **10 detik per alat**. Q memakai alat, X mengganti batu → asap → trap. Pause membekukan cooldown; restart memulihkan alat. Lemparan/penempatan gagal tidak memulai cooldown.
- Trap pemain aktif setelah 0,3 detik, aman bagi ular, sekali kena, dan hilang setelah 30 detik. Menahan penjaga/anjing **4,5 detik**, atau menghentikan terjangan bayangan selama **3 detik** sebelum bayangan mundur. Trap aktif diproses sebelum gigitan anjing pada posisi yang sama.
- Jebakan duri lantai bertambah bertahap: level 8–19 satu, 20–34 tiga, dan 35–50 lima. Siklus 5,5 detik, aktif 1,25 detik, peringatan kuning 0,7 detik. Fase aktif menggagalkan ular dan menahan penjaga/anjing sementara; fase padam aman dilewati.
- Pickup Apple Coin menjadi **4 / 6 / 8** pada level 1–9 / 10–34 / 35–50. Masing-masing bernilai **5**, sehingga maksimal **20 / 30 / 40 Apple Coin per misi**. HUD menampilkan nilai koin; syarat tiga bintang tetap mengumpulkan seluruh pickup. Hadiah masuk saat berhasil keluar, replay hanya memberi selisih terhadap hadiah terbaik yang sudah diterima.

#### Penempatan, progres, dan implementasi

- Penempatan anjing menyisakan area aman yang tersambung dari spawn ke ruang relik. Pickup luar yang masuk area pengawasan tetap atau kantong terisolasi dipindahkan. Rute patroli, posisi berhenti, spawn, jalur bayangan, dan semua objek diperiksa sebelum varian diterima.
- Bank map dibuat di luar runtime permainan. Pembuatan menyimpan checkpoint per level di cache pengembangan; perubahan kode generator/simulasi membatalkan checkpoint lama. File campaign diganti atomik hanya setelah seluruh level lolos.
- Pencarian jalur waktu menyalin status anjing, bayangan, trap, dan cooldown per cabang. Bukti rute memakai simulasi 60 Hz sebenarnya, termasuk musuh dan jebakan aktif; tidak menonaktifkan bahaya atau menambahkan kekebalan.
- ID misi dan `snake-progress-v1` tetap. Rekor waktu memakai revision 6, sedangkan unlock, catatan langkah lama, dan saldo yang sudah diperoleh dipertahankan lewat penggabungan progres. Mode lain tetap memakai perilaku/hadiah sebelumnya.
- File baru: `lib/puzzle/navigation.js`, `lib/puzzle/threats.js`, `tests/dungeon-wildlife.test.mjs`. Perubahan lain berada pada generator/bank/validator/simulasi/renderer/controller Dungeon, controls/HUD, bantuan/registry, pencatatan hadiah, hook suara, build script, dan tes terkait.
- Tidak menambah halaman, route, dependency, maupun file Markdown. Catatan perubahan hanya ditambahkan di `changelog.md` ini.

#### Pemeriksaan yang dilakukan

- `npm run build:campaign`: **lolos 50 level / 400 varian**, termasuk replay tiga bintang tanpa alat/alarm. Semua varian level 2, 16, 20, 27, 30, 35, 37, dan 50 juga disaring dengan start ditunda tiga detik.
- `npm test`: **325 kasus dijalankan**; 324 lolos pada run lengkap. Satu assertion lama masih mewajibkan revision 5 dan maksimal tiga pickup. Assertion itu diperbarui menjadi revision 6, 4/6/8 pickup, dan nilai 5; `node --test --test-concurrency=1 tests/revive-quest.test.mjs` kemudian **11/11 lolos**. Hanya assertion tes yang berubah setelah run lengkap, tanpa perubahan kode produksi. Run lengkap mencakup replay ulang seluruh 400 varian pada kode simulasi final, reproduksi seed, semua batas level, interaksi musuh/trap/CCTV, progres, dan regresi mode lain.
- `npm run build`: **lolos**, termasuk lint/pemeriksaan tipe bawaan dan prerender. Route tetap `/`, `/_not-found`, dan manifest. First Load JS **327 kB**, naik dari sekitar 300 kB karena bank map dan mekanik baru.
- Chromium: **10 pemeriksaan lolos** — tujuh alur produksi (enam bentuk dan identitas level; cooldown/pause; layout desktop/restart; bantuan; progres lama + multitouch; layout HP + reroll abstrak; gate portrait), dua pemeriksaan renderer aktual (map abstrak dan tampilan ancaman), serta pemeriksaan tanpa error JavaScript.
- Screenshot desktop 1366×768, landscape HP 844×390, map gua/reruntuhan, cahaya melingkar, rantai anjing, penjaga merah, duri, gonggongan, trap, dan peringatan bayangan diperiksa secara visual. `git diff --check` lolos.

#### Batas pengujian

- Replay membuktikan adanya rute contoh yang berhasil pada tiap varian, bukan semua kemungkinan timing atau tindakan pemain. Denah tetap bank delapan varian per level, bukan generator tanpa batas saat bermain.
- Uji HP menggunakan emulasi Chromium, belum perangkat fisik Android/iOS atau Safari. Bunyi anjing berupa efek sintetis bergaya kartun.

### 2026-10-22 — Arena imersif dan UI lintas perangkat

- Arena permainan kini mengisi viewport saat ronde aktif, dengan safe area, latar terpadu, HUD kecil, serta joystick dan aksi HTML di dalam `#wrap`. Dunia tetap utuh pada rasio 680:600; sudut kontrol mendapat ruang sendiri. Menu dan hasil memakai tata letak terpisah tanpa melepas canvas/controller.
- HUD mengikuti registry mode: skor, timer yang relevan, dua pemain dan nyawanya, relik/Apple Coin/kecurigaan, tiga slot kargo beserta kedaluwarsa, target rute/perisai/penawar, serta nyawa/energi/fase/celah boss. Detail misi, rekor, penjelasan ikon, dan pengaturan berada di panel yang dapat dibuka. Pesan singkat menghilang setelah lima detik.
- Joystick berdiameter 116 px dengan knob sekitar 60 px; tetap empat arah untuk arkade dan delapan arah untuk Dungeon. Arah dilepas saat batal, kehilangan capture/fokus, halaman tersembunyi, resize/rotasi, overlay, atau teardown. Aksi sentuh langsung mendukung jari kedua ketika joystick ditahan. Dungeon mempertahankan interaksi, sembunyi, pakai/ganti alat, cooldown, dan siklus jalan → lari → mengendap; ulang melalui menu memerlukan konfirmasi.
- Preferensi `snake-lefty` dipertahankan dan menukar kedua sudut kontrol. Petunjuk awal dapat ditutup dan dibuka kembali dari Bantuan. Panel mengunci fokus; menutupnya tidak melanjutkan ronde secara otomatis. Hanya satu modal utama aktif. Layar penuh memakai Fullscreen API atas tindakan pemain, dengan penjelasan bila tidak tersedia. Mode 2P tetap memerlukan keyboard; perangkat hybrid dapat memakai keyboard tanpa dipaksa kembali ke Classic.
- Arkade mendapat portrait yang dapat dimainkan; Dungeon tetap memakai pengaman orientasi landscape. Ukuran canvas/DPR berlaku untuk semua jenis mode, dengan backing store berasio tetap dan tile persegi. Perubahan engine arkade hanya menghitung ulang ukuran gambar sel/cache saat resize; renderer Dungeon memindahkan judul/petunjuk ke HTML dan mengurangi margin. AI, level, bank 400 varian, timing, skor, simpanan, serta mekanik Wildlife v6 tetap sama.
- File utama: `app/page.js`, `app/globals.css`, `Hud`, `GameCanvas`, `DPad`, `DungeonControls`, `Overlay`, `HelpModal`, registry ikon. Komponen bersama baru: `GameViewport`, `GameSheet`, `GameButton`, `useModalFocus`, dan `lib/gameView.js`; tes baru `tests/game-view.test.mjs`. Tidak menambah route, dependency, atau file Markdown.

#### Verifikasi dan batas pengujian

- `npm run build`: lolos pada kode produksi terakhir, termasuk pemeriksaan lint/tipe dan prerender. First Load JS 329 kB; route tetap `/`, `/_not-found`, dan manifest.
- `npm test`: 330 kasus dijalankan, 329 lolos. Seluruh replay 400 varian dan pemeriksaan progres/mekanik lolos. Satu assertion CSS masih mewajibkan `.stage-side`, padahal sidebar itu dihapus oleh redesign; assertion diperbarui untuk menu dua kolom dan ketiadaan sidebar lama. Rerun `game-view`, `territory`, dan `dungeon-input`: **47/47 lolos**, mencakup assertion yang diperbaiki serta ukuran arena final. Run lengkap yang mahal tidak diulang setelah perubahan assertion tersebut.
- Chromium: **12 pemeriksaan browser lolos** — desktop, panel/fokus/jeda, cooldown/ulang, awal dan alur jeda/menu pada 15 mode, split window, Fullscreen API masuk/keluar, sentuh dua jari, pelepasan joystick saat resize, blur/fokus, rotasi Dungeon, portrait arkade, kontrol kidal, serta tanpa error JavaScript. Mode tersembunyi dipilih melalui state React hanya di skrip QA, tanpa hook debug produksi. Screenshot aktual Dungeon desktop/HP, portrait arkade, Delivery, Roguelite, Boss, dan Territory diperiksa.
- Viewport yang diperiksa: 360×740, 740×360, 844×390, 932×430, 768×1024, 1024×768, 1366×768, 1920×1080, 1093×614, 683×384, dan 600×768. Ukuran CSS kecil menyimulasikan ruang efektif zoom/split; zoom browser native dan perubahan toolbar pada HP fisik belum diuji.
- Pengujian memakai emulasi Chromium, belum Android/iOS fisik atau Safari. Alur upgrade/penyelesaian seluruh kampanye dan fase akhir boss dicakup tes simulasi; tidak semuanya dimainkan manual dalam uji UI ini. Dungeon portrait tetap menampilkan panduan rotasi.

<a id="dungeon-design-v9"></a>
## Penyelarasan desain arena Dungeon — 24 Oktober 2026

- Menyatukan gaya objek lama dan monster v8 dalam ilustrasi canvas: outline gelap, shading lembut, serta material batu, kayu, dan logam yang konsisten dengan identitas kartun K-Snake. Penyesuaian mencakup ular penjelajah, penjaga, anjing, lantai/tembok, peti, pintu, relik, kunci, koin, tuas, pelat, ceruk, portal, pintu keluar, obor, lonceng, CCTV, dan jebakan.
- Peran penjaga memiliki lencana permata/kunci/kaca pembesar; penjaga cepat memakai warna hangat dan chevron. Bantuan menjelaskan tanda ini, Peniru, serta sarang laba-laba.
- Peniru memakai gambar peti bersama. Peti tile yang ditempatinya tidak lagi menimpa gambar monster saat rahangnya terbuka. Penanda gigit mengikuti pusat/jangkauan dan raycast serangan aktual; gambar laba-laba, jaring, benang, serta tanda sambar ditambahkan dengan gaya yang sama.
- Shadow menyatu dengan sarangnya saat diam: siluet redup, celah pintu, dan kilatan samar saat animasi aktif. Tubuh dan tanda arah menjadi jelas pada peringatan/serbuan. Reduced motion tetap didukung. Waktu serangan tidak diubah; keterangan bantuan lama yang menyebut 0,8 detik diganti penjelasan visual agar sesuai v8.
- Label canvas digambar memakai ukuran font normal lalu diskalakan ke koordinat dunia, sehingga glyph kecil pada koin/pintu/ceruk tidak hilang akibat metrik font subpiksel. Lantai statis dicache dalam koordinat dunia untuk kedua tampilan overview dan kamera mengikuti pemain; pergeseran kamera tidak menggambar ulang seluruh lantai.
- File perubahan: modul bersama baru `lib/puzzle/art.js`, integrasi `lib/puzzle/render.js`, teks bantuan `lib/constants.js`, dan bagian changelog ini. Data kampanye, generator, simulasi/AI, hitbox, progres, input, UI arena, dependency, dan mode lain dibandingkan dengan ZIP v8; berkas-berkas tersebut identik. Tidak menambah route atau Markdown.

### Verifikasi batch desain

- `npm run build`: lolos pada kode produksi terakhir; First Load JS 433 kB, route tetap `/`, `/_not-found`, dan manifest.
- `node --test --test-concurrency=1 tests/dungeon-input.test.mjs tests/dungeon-wildlife.test.mjs tests/game-view.test.mjs`: **26/26 lolos**. Suite lengkap/replay 400 varian tidak diulang untuk perubahan render ini; tidak ada perubahan kode simulasi maupun bank misi.
- **7 pemeriksaan Chromium lolos**: renderer aktual pada level 1/20/30/36/40/50; fixture Shadow/Peniru/laba-laba pada fase diam/peringatan/serang/pulang; animasi normal, asap, dan efek pickup; resize kamera/cache pada 740×360, 844×390, 360×740, dan 768×1024; permainan produksi level 1 di desktop 1366×768 dengan alat/jeda/bantuan/lanjut; produksi level 40 di HP landscape 844×390 DPR 2 beserta kontrol dan pengaman rotasi; serta tidak ada error JavaScript. Pemilihan level memakai API controller melalui referensi React hanya pada skrip QA, tanpa hook debug produksi.
- Fixture canvas native pada 1380×900 dan 680×600 serta seluruh fase monster digambar dan diperiksa. Snapshot sebelum/sesudah render memastikan fungsi gambar tidak mengubah state simulasi. Screenshot browser desktop, HP, serta fase monster juga diperiksa secara visual. `git diff --check` bersih.
- Batas: browser memakai emulasi Chromium; belum HP fisik atau Safari. Fixture serangan membantu pemeriksaan visual, bukan klaim seluruh kampanye dimainkan manual.

## Arena penuh dan penempatan AI Dungeon — 24 Oktober 2026 (v11)

### Arena dan kamera

- Dungeon sekarang memakai seluruh permukaan viewport. HUD, info/jeda, joystick, dan tombol aksi menjadi overlay di dalam arena; tidak ada lagi ruang header atau rel samping yang memaksa arena mengecil.
- Canvas mengikuti lebar **dan tinggi** ruang yang tersedia, termasuk perubahan orientasi. Dungeon dapat dimulai di portrait; memutar perangkat tidak membuat misi baru.
- Kamera mengikuti ular dengan tile dasar 32–48 CSS px, terlepas dari ukuran level. Map membesar sebagai ruang permainan, bukan dengan mengecilkan karakter agar seluruh map muat.
- Tombol zoom menyediakan skala 0,8× / 1× / 1,3× / 1,65×. Tombol Peta menampilkan seluruh denah; tombol bidik kembali mengikuti ular. Kamera mempertahankan ruang aman untuk ular di antara HUD dan kontrol.
- Pesan panjang dibatasi dua baris. Bantuan menjelaskan kamera dan ambang monster. Kontrol HTML tetap dapat diakses dengan keyboard dan pembaca layar.
- Cache lantai dibatasi sisi terpanjang 2048 px; memperbesar tampilan tidak membuat bitmap lantai tumbuh tanpa batas. Penggambaran aktor tetap mengikuti resolusi canvas.

### Pos, patroli, dan lalu lintas NPC

- Penempatan membedakan sudut dinding yang masih mempunyai jalur alternatif dengan titik yang benar-benar memutus akses. Pos penjaga dipilih dekat area yang dijaga tanpa menutup akses penting.
- Titik awal dan tujuan patroli ikut dipesan, sehingga pos penjaga/anjing terikat tidak menjadi tujuan patroli NPC lain. Pos dan barang tidak memakai koordinat yang sama.
- Penjaga serta anjing bebas memakai perencana jalan dan pemeriksaan badan yang sama. Lorong satu tile mempunyai pemilik sementara; NPC berikutnya menunggu, mencari rute alternatif, atau mundur ke kantong lewat yang nyata.
- NPC yang memberi jalan melanjutkan tujuan sebelumnya setelah jalur bebas. Tidak ada teleportasi, penonaktifan collision, atau penghapusan NPC untuk menyelesaikan kemacetan.
- Perbaikan khusus untuk posisi pecahan di belokan: NPC boleh mengambil segmen berikutnya yang aman tanpa lebih dulu merapat ke tengah tile ke arah NPC yang menghalangi. Jika pihak yang diminta mundur tidak mempunyai kantong lewat, pihak lainnya dapat mengalah.
- Penjaga dan anjing yang melihat peringatan serangan monster dapat menghindar. NPC yang terpojok atau terkena stun tetap dapat dimangsa; monster tetap berbahaya untuk semua makhluk.
- Salinan state pencarian rute sekarang memisahkan memori monster, antrean lalu lintas, dan jalur mengalah antar cabang pencarian.

### Monster dan bank map

- Shadow hadir di setiap variasi mulai level 30, Mimic mulai level 36, dan laba-laba mulai level 40. Mulai level 40 ketiganya hadir bersama; tidak lagi saling menggantikan lewat slot acak.
- Sarang/mulut monster harus berada dekat jalur NPC yang terlihat, maksimal tiga tile, dan dekat jalur misi. Dinding tetap dihitung; tetangga di balik tembok tidak dianggap area ramai.
- Mimic berupa peti yang benar-benar mempunyai mulut menghadap lantai yang dapat dicapai. Shadow tetap mempunyai jalur lurus dan ruang menghindar; laba-laba memerlukan lantai sarang yang cukup terbuka.
- Builder menolak penempatan yang kehilangan monster wajib, menyumbat rute, membahayakan spawn, mematikan patroli ketika pemain diam, atau menyebabkan penantian lalu lintas berkepanjangan dalam simulasi.
- Variasi yang tidak menyediakan penempatan layak dibangun ulang dalam bentuk yang sama, kemudian diuji lagi. Tidak ada fallback diam-diam ke versi lama yang gagal pemeriksaan.
- Enam keluarga bentuk (bulat, L, C, T, gua abstrak, reruntuhan), delapan variasi tiap level, pertumbuhan luas, ID 50 level, progres, dan nilai Apple Coin dipertahankan.
- `npm run build:campaign -- --arrange` menyusun ulang bank. Opsi lama `--polish` memakai jalur yang sama. Builder dapat memakai `--workers=8` dan menyimpan checkpoint yang terikat pada sumber logika; tidak menerbitkan bank setengah jadi.

### Verifikasi hasil akhir v11

- Bank final: **400 variasi (50 level × 8)**. Semua mempunyai replay misi tanpa alarm dan tanpa gadget; semua bonus ikut direplay pada level 1–15. Delapan variasi pada masing-masing 10 level pengenalan juga diverifikasi dengan awal tertunda tiga detik.
- Audit gerakan terpisah: **400 × 45 detik**, tanpa badan penjaga/anjing bertumpuk dan tanpa menembus tembok. Jarak pusat NPC terdekat yang terukur 0,540003 tile. Ini pemeriksaan skenario idle/patroli, bukan klaim pembuktian untuk setiap kemungkinan pengejaran.
- Monster final: 168 Shadow, 120 Mimic, 88 laba-laba. Semua jenis yang sudah terbuka hadir di setiap variasi level berikutnya; lokasi dinilai kembali setelah seluruh peti dan monster selesai ditempatkan.
- Kontrak data diperiksa untuk seluruh 400 variasi: 50 ID lama, delapan ID variasi unik per level, enam keluarga bentuk, luas bertumbuh, dan waktu acuan yang mencakup waktu replay.
- Waktu acuan 62 variasi yang dibangun ulang dikalibrasi dari replay, sehingga nilai sementara generator tidak masuk ke permainan. Rentang acuan final 55–230 detik.
- **287 tes regresi lolos**: 283 tes di berkas selain `puzzle9b.test.mjs`, serta empat tes mekanik/progres/penyimpanan dalam berkas itu. Replay temporal dan pemeriksaan idle bank tidak diulang dalam hitungan tes tersebut karena sudah dijalankan oleh builder dan audit di atas. Pemilihan tes final selesai dengan exit code 0.
- `npm run build` lolos. Lima pemeriksaan browser produksi lolos: arena desktop, zoom/peta, reset kamera saat restart, info/jeda/lanjut, dan HP portrait–landscape tanpa reset waktu. Screenshot portrait serta landscape diperiksa secara visual.
- Planner verifikasi mencoba rute geometri dan perkiraan pergerakan sebelum A* penuh. Perkiraan tidak mengesahkan hasil: kandidat selalu direplay dengan pemain terlihat, AI, collision, bahaya, dan alarm normal. Tes memastikan perkiraan tidak dapat meloloskan jalan menembus penjaga.
- Animasi kaki penjaga/anjing berhenti ketika antre. Memulai ronde baru kembali ke kamera mengikuti ular agar mode Peta tidak membuat level berikutnya kembali terlihat kecil.
- Tidak menambah halaman/rute atau dokumen Markdown baru. Catatan perubahan hanya ditambahkan ke changelog ini. Aset gambar tetap sama dengan v10.
- Belum diuji pada HP fisik atau Safari. Uji sentuh memakai emulasi viewport/DPR di Chromium.

## Boss Dungeon bervariasi dan arena lebih rapi — 25 Oktober 2026 (v14)

### Pertarungan Penjaga Relik Agung

- Level 51 tetap memakai ID/progres dan hadiah Relik Agung 50 Apple Coin. Mode Boss terpisah dari Dungeon tidak diubah.
- Delapan pola dengan giliran acak tanpa pengulangan berurutan: Palu Batu, Benih Retak, Gerbang Runtuh, Sapu Tiga Jalur, Tatapan Pemburu, Gema Cincin, Salib Pecah, dan Sangkar Bergilir. Semua pola dalam daftar fase dicoba sebelum daftar diacak ulang.
- Sapuan, tatapan, cincin, dan sangkar mempunyai beberapa hantaman. Setiap hantaman mendapat peringatan baru; area yang sudah terkunci tidak mengikuti gerakan pemain selama peringatan. Waktu peringatan mempertimbangkan jarak rute aktual menuju lantai aman, termasuk pilar, dengan kecepatan jalan dan tambahan waktu reaksi.
- Lima fase mempunyai mekanik pertahanan berbeda:
  1. **Batu terbangun:** injak rune yang menyala.
  2. **Segel berdenyut:** tetap di rune selama 0,7 detik. Keluar membatalkan charge.
  3. **Urutan rune:** aktifkan rune sesuai nomor; rune berikutnya belum aktif sebelum yang pertama selesai.
  4. **Rantai penjaga:** putuskan dua rune samping dalam urutan bebas, lalu injak inti tengah untuk tiga damage. Inti tidak bisa diserang sebelum kedua rantai terputus.
  5. **Inti mengamuk:** dua pola serangan sebelum jendela balasan, diikuti urutan rune dan charge pada rune terakhir.
- Batu yang benar-benar mengenai resonator sian selama peringatan memutus serangan dan membuka rune. Counter menggunakan arah hadap, ujung lemparan dan cooldown normal, bukan tombol damage langsung. Asap menyembunyikan posisi aktual dari tatapan; trap yang terkena area serang memperpanjang peringatan berikutnya. Alat tetap pulih setiap 10 detik.
- Lima nyawa dan invulnerability setelah damage dipertahankan. Jantung pergantian fase ditempatkan pada lantai yang dapat dicapai; jantung tidak terbuang saat nyawa masih penuh. Seluruh lantai yang dapat dijangkau masuk domain pola, termasuk pintu masuk dan galeri relik.
- Arena boss disusun ulang dari 23×19 menjadi 19×17: sudut terpotong, dua pilar, serta tiga pendekatan rune yang tersambung. Golem, rantai, charge, resonator, peringatan, HP dan hati memakai gambar canvas yang mengikuti gaya Dungeon. Simbol hati/rantai digambar sebagai bentuk agar tidak bergantung glyph font perangkat.
- HUD menampilkan nama fase, nama pola, nomor hantaman, kombo, dan sisa waktu rune. Arah menuju tempat aman atau rune berikutnya muncul di tepi layar bila target berada di luar kamera. Relik tidak digambar sebelum boss kalah. Kamera boss portrait menahan batas arena agar tidak menyisakan bidang kosong besar di bawah pemain.

### Penataan map kampanye

- Audit awal seluruh 400 varian tidak menemukan dua objek/pos awal yang memakai titik yang sama. Masalah ruang yang terbukti: 219 varian mempunyai padding luar berlebih.
- Memangkas **10.255 sel padding** dari 219 varian tersebut. Semua lantai, peti, tembok di sekitar lantai, objek, sarang, arah, rute, jangkauan dan jarak relatif dipertahankan. Koordinat bersarang seperti mulut Mimic, rumah/pos, dan waypoint ikut ditranslasikan.
- Luas lantai tetap bertumbuh dari level awal sampai akhir; pengecilan dimensi hanya membuang tepi yang tidak dimainkan. ID, variasi bentuk, roster monster, hadiah dan progres tetap kompatibel.
- Dinding/peti di depan aktor atau objek penting meredup agar gambar tidak menutupinya. Penempatan NPC tidak diacak ulang tanpa bukti; jalur yang sudah diverifikasi dipertahankan.
- Generator berikutnya lebih mengutamakan pertumbuhan ke tepi dengan beberapa tetangga lantai sebelum membuat cabang satu sel. Pemadatan dipakai generator dan arranger; builder menghitung cache dari modul baru dan memakai dimensi sumber saat membangun ulang footprint yang pernah diperbesar.

### Verifikasi v14

- **307 tes regresi lolos:** 303 kasus pada seluruh berkas tes selain `puzzle9b.test.mjs`, ditambah empat kasus mekanik/progres/penyimpanan yang dipilih dari berkas tersebut. Bukan klaim `npm test` lengkap; replay temporal 400 misi tidak diulang.
- Dua belas replay boss dengan seed berbeda menamatkan kelima fase, mengambil relik dan keluar lewat gerakan biasa tanpa gadget, tanpa kehilangan nyawa. Waktu terlama 188,55 detik; kumpulan replay mencakup delapan jenis serangan. Ada pengujian terpisah untuk counter batu, asap, trap, charge batal, urutan salah, rantai, kombo, invulnerability dan relik terkunci.
- Seluruh 400 map dibandingkan dengan v13 untuk kesetaraan geometri/objek. Masing-masing disimulasikan 45 detik bersama versi asal: tidak ada NPC mati, alarm, badan bertumpuk atau menembus tembok. Jarak pusat NPC terdekat 0,540003 tile; selisih numerik posisi setelah translasi paling besar sekitar 2,03×10^-13 tile. Ini audit patroli rutin, bukan semua kemungkinan pengejaran pemain.
- `npm run build` lolos. Sembilan pemeriksaan Chromium lolos: boss produksi dengan keyboard, jeda/info/lanjut, zoom/peta, sentuh portrait/landscape, render delapan skill, antarmuka lima fase, charge/heal/arah target, map kampanye, serta tanpa error JavaScript. Fixture memastikan renderer tidak mengubah state simulasi. Pemilihan level QA memakai API controller yang sudah ada, tanpa route debug produksi.
- Screenshot boss desktop/HP, rune dan map diperiksa. Pengujian HP memakai emulasi Chromium, belum perangkat fisik atau Safari.
- Tidak menambah route/halaman, dependency, aset gambar eksternal, atau dokumen Markdown baru. Catatan perubahan ditambahkan hanya ke changelog ini; pengaturan kontrol v13 dipertahankan.

## v15 — Eksplorasi terukur, reaksi AI dan audio adaptif (25 Oktober 2026)

### A. Audit dan akar masalah

Audit v14 mencakup 15 mode: Classic, Malam, Portal, Time Attack, empat Mayhem/Impossible, dua mode 2P, Dungeon, Kurir, Ekspedisi, Boss Kebun dan Rebut Arena. Adventure adalah grup menu, bukan simulasi tersendiri.

Temuan terkonfirmasi: overlay jeda menangkap sentuhan saat mengedit kontrol; pesan Dungeon dapat menutup ular pada layar pendek; pilihan joystick ditawarkan pada mode yang tidak memakainya; pesan restart Ekspedisi tidak menjelaskan hilangnya upgrade run; aturan bintang boss berbeda dari penjelasan hasil; rekor antartab dapat saling menimpa dan kegagalan simpan tidak diberitahukan; controller Dungeon beserta 400 map ikut dimuat saat membuka Classic. Next 14.2.34 juga tertinggal patch upstream. Dugaan bahwa semua map abstrak rusak ditolak: luas lantai memang bertambah. Masalah yang diukur terpisah ialah perjalanan menuju tujuan, relevansi ruangan dan penempatan aktor. Contoh baseline: varian `gen-32-ruins-3205010`, 219 lantai tetapi jarak masuk–relik hanya 13 langkah.

### B. Implementasi dan kompatibilitas

Controller dimuat sesuai jenis mode; impor tertunda dibatalkan saat pemain berpindah sebelum pemuatan selesai. Ada status memuat dan kesalahan pemuatan. Next diperbarui ke 15.5.28, React 18 dipertahankan. Tidak menambah dependensi audio, halaman, atau berkas Markdown. Editor memakai satu pemilik jeda; zona mati berlaku untuk semua joystick; pilihan Halus/8 arah hanya muncul di Dungeon; posisi kontrol dijepit ulang setelah rotasi. Pesan misi berada di HUD; HUD boss menampilkan HP, nyawa dan fase sebagai teks tanpa menduplikasi bar canvas besar.

Rekor baru Kurir/Ekspedisi/Rebut Arena/Boss memakai jurnal lokal per ID run, sehingga tab berbeda tidak menimpa snapshot yang sama. Hasil setelah revive mengganti ID run yang sama. Snapshot `snake-records-v1` lama tetap dibaca sebagai baseline, tanpa penghapusan. Kegagalan simpan menyisakan antrean sesi yang dapat dicoba lagi, termasuk setelah pindah mode. Antrean yang belum tersimpan tidak tahan terhadap penutupan browser; UI mengatakannya. Jurnal belum dikompaksi otomatis agar tidak memperkenalkan perlombaan antartab. Progres Dungeon tetap memakai mekanisme merge/retry yang sudah bekerja. Kunci konfigurasi boss v4 dan Ekspedisi v3 memisahkan rekor pola baru dari hasil lama; entri lama tetap disimpan. Revisi kampanye 8 memisahkan waktu heist lama dari waktu denah baru, sambil mempertahankan pembukaan misi dan Apple Coin.

### C. Dungeon

`quality.js` menilai jarak jalur masuk–relik, keterhubungan tujuan, kedekatan portal dengan relik, lantai jauh dari jalur/tujuan opsional, dan sebaran fungsi ruang. Ambang jarak mengikuti ukuran lantai dan tahap pengenalan; skor bukan persentase wajib seluruh lantai. Skor tidak dijadikan bukti solvabilitas. Penerimaan bank tetap memerlukan pemeriksaan kunci/tuas, penempatan, patroli dan replay simulasi sebenarnya. Perbaikan mendahulukan posisi masuk/keluar, pemilihan pos relevan dan penataan ulang pada geometri yang sama; footprint hanya diganti dalam keluarga bentuk yang sama bila kandidat tersebut gagal. Generator tidak menghapus monster yang gagal ditempatkan. Delapan varian per misi dan enam keluarga bentuk dipertahankan.

Jumlah manusia berkurang pada tahap lanjut: satu penjaga akses cukup, patroli koridor dibatasi dua; maksimum enam manusia, ditambah anjing dan ekosistem monster sesuai level. Penjaga cepat tetap mulai level 20, maksimum dua. Pos yang menjaga keterkaitan monster dengan jalur NPC diprioritaskan saat mengurangi roster. Koin opsional dapat mengisi cabang jauh dari jalur wajib; tidak menambah kewajiban mengunjungi seluruh map. Acuan waktu juga menambahkan anggaran perjalanan bonus, sehingga cabang opsional tidak memakai batas waktu rute wajib saja. `npm run build:campaign` menjalankan penerimaan kualitas dan penataan reward, dengan cache yang dibatalkan jika source atau input bank berubah. Relik tetap berada dalam sistem brankas/kunci/tuas yang sesuai. Tujuan utama tidak dipindah ke tempat yang membatalkan puzzle.

### D. Musuh dan boss

Warden merupakan spesialisasi pos penjaga mulai level 25, bukan penambahan kerumunan. Ia menyiapkan terjangan 0,8 detik, mengunci satu jalur lurus, menerjang pendek, lalu pulih 1,1 detik. Target tidak membelok mengikuti pemain setelah terkunci. Stun membatalkan persiapan. Petunjuk jalur dan antisipasi hanya digambar untuk aktor dekat; patroli, menunggu lorong, menghindar dan pemulihan punya tanda berbeda. Navigasi/reservasi lorong yang sudah ada dipertahankan.

Penjaga memerlukan 0,2 detik dan anjing 0,12 detik untuk menanggapi peringatan monster yang terlihat. Peringatan baru mempunyai waktu observasi baru meskipun monster pernah dikenal. Ada tanda antisipasi, tanda gerakan menghindar, serta efek suara peringatan/meleset/terkena. Tidak menambah penundaan input pemain atau mengubah collision menjadi teleport.

Shadow tetap samar, memakai jalur tetap; Mimic dan laba-laba tetap hadir setelah ambang levelnya. Boss Dungeon mempertahankan delapan serangan dan lima mekanik fase v14: sentuh, tahan, urutan rune, rantai dan kombinasi finale. Delapan pola, resonator counter, smoke, trap serta jalur keluar yang sudah diuji dipertahankan. Perbaikan v15 ada pada keterbacaan, suara dan penjelasan bintang berbasis nyawa.

Boss Ekspedisi/Kebun menambahkan pola khas bergantian dengan pola bersama: Akar kembar (dua baris), Cincin spora (mengunci kepala yang diamati ketika telegraph dibuat), dan Pagar sulur (lorong aman horizontal). Waktu peringatan dihitung dari jalur keluar yang mempertimbangkan tubuh ular; pola yang tidak mendapat rute aman memakai fallback lama. Scheduler, jendela serang, interrupt, heal dan transisi fase tetap memakai kontrak yang sama.

### E. Audio

Enam identitas orisinal dibuat sebagai PCM sintetis: eksplorasi Dungeon, boss Dungeon, perjalanan Ekspedisi, boss Ekspedisi, eksplorasi Adventure dan bahaya Adventure. Identitas Adventure digunakan pada grup menu/mode terkait, termasuk perubahan tekanan pada akhir shift Kurir. Tiap identitas mempunyai tempo, progresi, motif dan lapisan sendiri; intensitas menanggapi kecurigaan/kejaran, progres rute dan fase. Variasi boss mengubah susunan motif.

Dua stem setiap skor memakai jumlah sampel dan waktu mulai yang sama. Nada dan ekornya ditulis melingkar ke buffer; `AudioBufferSourceNode.loop` menjalankan loop pada jam audio, tanpa memulai ulang lewat RAF/setInterval. Perpindahan identitas memakai fade gain, perubahan intensitas mempertahankan playhead. Satu AudioContext dimiliki game; pause/mute menangguhkannya, resume mempertahankan waktu musikal. Autoplay menunggu interaksi pemain. Volume musik/SFX dan mute disimpan terpisah. Cache maksimal dua skor, suara bersamaan dibatasi, node dibersihkan saat selesai/unmount. SFX lama tetap tersedia dan mengikuti volume SFX.

Referensi artistik yang diperiksa lewat katalog Spotify: [Mantis Lords](https://open.spotify.com/track/7uIyzCZKGk9K2EXnb3BtrR), [Greenpath](https://open.spotify.com/track/6fyI2QGPzUiqRHnuYD7oOp), [Hades: Original Soundtrack](https://open.spotify.com/album/5jTYZA6b4VoSRnR5TMldgb), dan [Secunda](https://open.spotify.com/track/38ineLIzGIXTGd8ICMvHXb). Pemeriksaan katalog bukan klaim mendengarkan rekamannya. Tidak ada rekaman, melodi, sampel Spotify atau streaming yang dimasukkan ke proyek; pengaruhnya sebatas arah suasana dan kontras eksplorasi/pertarungan.

### F. Hasil verifikasi rilis

- 311 tes regresi dan fitur baru lulus, 0 gagal, ditambah 4 tes progres/mekanik terpilih lulus. Total 315 kasus tes unik pada pemeriksaan rilis. `node --test --test-concurrency=1` dijalankan untuk seluruh berkas tes kecuali korpus replay mahal `puzzle9b.test.mjs`; empat kasus non-korpus dari berkas itu dijalankan terpisah. Ini bukan klaim seluruh `npm test` sudah diulang.
- 400/400 varian diterima melalui validasi penempatan, patroli 45 detik dan replay misi tanpa alarm/gadget. Bonus diuji dalam replay untuk 120 varian level 1–15. Pencarian memakai batas 70/170 langkah waktu dan 100/1000 node sesuai jalur builder; batas pencarian hanya menolak kandidat yang belum terbukti, tidak melonggarkan hasil replay.
- Pemeriksaan fisika bank final: 400 map × 2.700 tick, total 1.080.000 tick. Tidak ada alarm, kematian rutin manusia/anjing, tembus dinding atau overlap antarmanusia/anjing. Jarak terkecil terukur 0,5400033993 petak, di atas batas uji 0,535.
- Tes boss mencakup 12 seed Dungeon (1–12), menuntaskan lima fase dengan gerakan biasa, lima nyawa utuh, relik dan pintu keluar. Tes pola khas Ekspedisi mencakup ketiga varian pada ketiga fase dengan seed 13; corpus boss lama juga tetap lulus. Ini tidak berarti seluruh run Ekspedisi pada semua seed telah dimainkan manual.
- Browser Chromium: 45 konfigurasi (15 mode × desktop 1366×768, ponsel 360×740 dan mendatar 740×360, DPR 2 pada ponsel), mulai–jeda–lanjut, tanpa galat JavaScript atau aset aplikasi hilang. Pemilihan mode pada smoke test memakai state/controller aplikasi; bukan klaim semua perjalanan menu dimainkan manual.
- Editor diuji lewat UI: drag benar-benar menerima pointer dan posisi joystick tetap di layar setelah rotasi. Audio diuji lewat tombol UI: satu AudioContext, waktu beku saat pause, lanjut dari waktu tersebut, mute/unmute dan preferensi musik 22%/SFX 44% tersimpan. Tes PCM memeriksa enam identitas berbeda, sampel finite, headroom stem dan sambungan loop. Tes lifecycle memeriksa batas cache dan pembersihan node.
- Build produksi Next 15.5.28 berhasil. Build rilis menunjukkan First Load JS 172 kB, dibanding 450 kB pada audit v14; angka ini tidak termasuk keseluruhan aset atau semua mode yang nantinya dimuat.
- Temuan pada iterasi uji diperbaiki sebelum rilis: margin masuk terhadap monster dipulihkan menjadi minimal 5,5 petak pada enam varian; metadata waktu replay ditambahkan untuk footprint baru; fixture jumlah penjaga/padding diperbarui mengikuti desain baru. Invarian jarak fisik, keterhubungan dan keselamatan tetap diuji.

Hasil bank: 213 pintu masuk mempunyai jarak relik lebih jauh; 36 footprint diganti dalam keluarga bentuk yang sama; 277 varian memiliki reward cabang. Maksimum enam penjaga manusia. Skor heuristik penataan 72–100, rata-rata 93.9; ini bukan skor kualitas aplikasi atau jaminan seluruh ruangan wajib dikunjungi.

Batas verifikasi: belum diuji pada perangkat fisik/iOS Safari atau seluruh kombinasi pengejaran, gadget, monster dan input pemain. Kelayakan tiga bintang untuk seluruh bonus level 16–50 belum dibuktikan lewat replay lengkap; acuan waktunya menambahkan anggaran jalur bonus. Tes numerik/jam audio tidak menggantikan penilaian kenyamanan bunyi melalui speaker/headphone fisik. Kegagalan browser storage tetap membutuhkan retry sebelum sesi ditutup.

<details><summary>Seed bank yang divalidasi (50 misi × 8 varian)</summary>

```text
1: 100000, 101000, 102000, 103000, 104003, 105000, 106005, 107000
2: 200000, 201002, 202000, 203000, 204000, 205000, 206000, 207000
3: 300000, 301002, 302000, 303000, 304000, 305004, 306000, 307002
4: 400000, 401004, 402007, 403000, 404000, 405000, 406000, 407001
5: 500000, 501005, 502002, 503000, 504002, 505001, 506001, 507001
6: 600006, 601000, 602006, 603301, 604003, 605030, 606010, 607013
7: 700000, 701002, 702004, 703002, 704000, 705000, 706005, 707002
8: 800001, 801000, 802019, 803001, 804007, 805001, 806002, 807001
9: 900000, 901001, 902011, 903001, 904005, 905003, 906006, 907006
10: 1000022, 1001007, 1002000, 1003003, 1004002, 1005023, 1006002, 1007011
11: 1100007, 1101009, 1102001, 1103013, 1104073, 1105022, 1106025, 1107026
12: 1200009, 1201139, 1202055, 1203037, 1204032, 1205037, 1206007, 1207035
13: 1300024, 1301025, 1302016, 1303073, 1304030, 1305033, 1306004, 1307013
14: 1400008, 1401002, 1402010, 1403016, 1404001, 1405003, 1406004, 1407001
15: 1500014, 1501002, 1502025, 1503093, 1504018, 1505003, 1506004, 1507003
16: 1600031, 101604637, 1602024, 1603045, 1604083, 1605009, 1606012, 1607018
17: 1700018, 1701028, 1702007, 101706039, 1704008, 1705005, 1706000, 1707064
18: 1800014, 1801000, 1802017, 1803011, 1804010, 1805009, 101809537, 1807038
19: 1900008, 1901020, 101905242, 1903000, 101906027, 1905007, 101908325, 1907000
20: 2000037, 2001092, 102015333, 2003316, 2004084, 2005125, 2006010, 2007013
21: 2100001, 2101010, 2102023, 2103051, 2104022, 2105064, 102110666, 2107032
22: 2200003, 2201004, 2202012, 2203003, 2204003, 2205002, 2206005, 2207005
23: 2300007, 2301043, 2302023, 2303008, 2304004, 2305005, 2306004, 2307031
24: 2400005, 2401010, 2402028, 2403000, 2404007, 102407328, 2406017, 102410035
25: 2500006, 2501001, 2502011, 2503036, 2504003, 102509248, 2506003, 2507013
26: 102602232, 2601003, 2602015, 2603035, 102606426, 2605000, 2606005, 2607005
27: 2700012, 2701001, 2702007, 2703023, 102706435, 2705039, 102708833, 2707019
28: 2800001, 2801016, 102806390, 2803059, 2804007, 2805024, 2806009, 2807005
29: 102902424, 102903039, 2902005, 2903000, 2904003, 2905005, 2906037, 2907008
30: 3000006, 3001030, 3002000, 3003025, 3004003, 3005001, 3006015, 3007131
31: 3100004, 103103084, 3102010, 3103017, 3104005, 3105001, 3106007, 3107010
32: 3200015, 3201008, 103204125, 3203002, 3204008, 3205010, 3206017, 3207002
33: 3300001, 3301017, 3302006, 3303026, 103307133, 3305001, 3306000, 3307027
34: 3400013, 3401010, 3402017, 3403007, 3404003, 3405018, 3406000, 3407009
35: 3500001, 235010022, 3502001, 3503001, 103508955, 235050052, 235060030, 3507000
36: 3600032, 236010027, 3602043, 3603000, 3604051, 3605087, 3606133, 103609498
37: 3700012, 3701008, 103704407, 3703026, 3704014, 3705063, 103709363, 3707027
38: 3800048, 3801006, 3802001, 3803011, 3804113, 3805006, 3806034, 103809286
39: 239000025, 3901020, 3902005, 3903025, 3904014, 239050017, 3906045, 3907099
40: 4000014, 4001011, 240020019, 240030079, 4004045, 4005004, 4006005, 240070023
41: 4100020, 241010030, 241020061, 4103041, 4104024, 104107531, 4106023, 4107005
42: 4200000, 4201018, 4202052, 4203000, 4204008, 242050055, 242060060, 4207011
43: 4300017, 4301019, 4302007, 104305024, 243040017, 143050028, 243060022, 143070016
44: 4400056, 244010019, 244020018, 4403003, 4404019, 244050041, 4406007, 104409445
45: 245000021, 104505243, 4502002, 145030064, 145040234, 245050023, 245060031, 245070036
46: 4600017, 146010109, 146020101, 246030017, 4604003, 146050014, 146060027, 146070012
47: 4700046, 247010066, 4702016, 247030119, 247040025, 247050033, 247060027, 147070013
48: 4800034, 248010030, 248020021, 248030023, 4804046, 4805019, 4806011, 4807020
49: 249000027, 149010284, 149020019, 149030046, 249040038, 149050048, 149060018, 249070032
50: 105004472, 250010025, 5002018, 250030036, 150040196, 150050060, 150060042, 150070060
```

SHA-256 CSV seed berurutan: `6700e5176507fcda26cfe144874722f2e64e297e9e36850b9aae8de6de91761b`. Posisi, seed, skor, waktu bukti dan varian tersimpan dalam `lib/puzzle/campaignData.js`.
</details>

### G. Paket proyek

ZIP rilis berisi source K-Snake, aset yang dipertahankan, pengujian, lockfile dan changelog ini. Dependensi terpasang, cache, hasil build serta screenshot QA tidak dimasukkan. Jalankan `npm ci`, lalu `npm run dev` atau `npm run build`. `npm run build:campaign` adalah pekerjaan offline yang lebih berat: menghasilkan kembali bank yang lolos bukti sebelum mengganti data kampanye.


## v15.1 — Verifikasi penuh dan perbaikan pencari rute (25 Oktober 2026)

Status terbaru: seluruh `npm test` kini dijalankan dan lulus **377 tes, 0 gagal, 0 dilewati**. Catatan v15 tentang korpus yang belum diulang merupakan status historis sebelum pemeriksaan ini. Build produksi Next 15.5.28 juga lulus.

Pemeriksaan lengkap mencakup replay delapan varian pada seluruh 50 misi, patroli 45 detik untuk setiap varian, serta sepuluh skenario mulai terlambat tiga detik. Batas verifikasi bonus tetap sama: replay dengan seluruh bonus mencakup level 1–15. Ini bukan klaim seluruh bonus level 16–50 atau perangkat fisik sudah diverifikasi.

Run penuh pertama menemukan satu kegagalan pada varian `gen-11-L-1101009`. Forecast panjang memilih jalur yang terlalu lama menunggu sehingga gagal membuktikan jalan keluar sebelum acuan 140 detik. Replay lain berhasil menuntaskan semua bonus, tanpa alarm, dalam 64,05 detik. Masalah ini berada pada pencari bukti otomatis, bukan bukti bahwa map mustahil dimainkan.

`verifyMission` kini mencoba forecast pendek terlebih dahulu dan memakai forecast panjang sebagai fallback. Kedua percobaan memakai dunia awal yang terpisah dan tetap tunduk pada simulasi, alarm, bonus, serta waktu acuan asli. Tidak menaikkan par atau mengubah posisi musuh untuk meloloskan tes. Tes regresi level 11 juga memastikan pencarian tidak memutasi data map. Builder mencatat horizon yang benar-benar berhasil untuk bukti berikutnya.

Korpus verifikasi dibagi per level ke maksimal empat worker bawaan Node, masing-masing dengan state simulasi sendiri dan cache modul hanya-baca. Seluruh pemeriksaan dipertahankan; proses tidak lagi menumpuk semua pekerjaan panjang dalam satu alur sinkron. Tidak menambah dependensi, halaman aplikasi, atau berkas Markdown.

## v16 — Audio setiap mode, identitas boss, dan event permainan lengkap (25 Oktober 2026)

### Audit lanjutan dan hasil implementasi

Laporan v15 sebelumnya terlalu luas: enam identitas musikal memang ada, tetapi sepuluh mode arcade masih masuk ke tema Adventure yang sama. Variasi boss Ekspedisi hanya menukar motif pada satu komposisi. Ditemukan pula event interaksi Dungeon yang dapat hilang saat tick berikutnya mengosongkan event, pemetaan pukulan ke boss Kebun ke suara pemain terluka, dan suara meleset Shadow yang dipicu berulang selama terjangan. Ini diperbaiki pada sumber yang sama, bukan dengan menambah halaman.

- **20 komposisi orisinal:** sepuluh identitas arcade terpisah (Classic, Malam, Portal, Time Attack, Mayhem, Mayhem+, Hard, Impossible, 2P, Mayhem Duo); eksplorasi dan boss Dungeon; perjalanan Ekspedisi serta tiga tema boss (Akar, Spora, Sulur); dan empat identitas Adventure untuk perjalanan Kurir, tahap pengantaran sibuk, Rebut Arena, dan keadaan bahaya. Pergantian keadaan mengikuti HUD simulasi yang sebenarnya. Gelombang antek memakai identitas perjalanan/tempur Ekspedisi; musik boss utama baru masuk pada ronde boss.
- **Aransemen:** setiap komposisi memiliki frasa 16 bar, harmoni, instrumen, bass, motif tanya-jawab dan pola perkusi tersendiri. PCM dibuat dari sintesis orisinal; tidak memakai rekaman/melodi Spotify. Dua stem tetap sinkron pada jumlah sampel dan titik mulai yang sama. Nada dan ekornya membungkus batas buffer. Peak gabungan kedua stem dibatasi untuk menyediakan headroom.
- **Fase boss:** pergantian fase menambahkan motif balasan, ostinato dan aksen perkusi, bukan menaikkan playback rate. Aransemen tema yang sama dimulai pada offset musikal yang sedang berlangsung dan di-crossfade. Perubahan kecurigaan, kejaran, kemajuan rute, akhir waktu dan tekanan duel mencampur stem tanpa mengulang frasa.
- **Respons input:** komposisi PCM dipindahkan ke satu Web Worker. Hanya satu pekerjaan berjalan; perpindahan mode cepat digabung menuju permintaan terakhir. Tema aktif tetap berjalan sampai penggantinya siap. Ada fallback komposisi lokal untuk browser yang menolak worker, pembatalan saat unmount, dan cache dua skor.
- **Satu sistem audio:** lima aset SFX lama didekode ke AudioContext yang sama dengan musik dan efek sintetis. Autoplay menunggu gesture; audio yang masih diunduh memakai cue sintetis langsung dan tidak memutar event lama ketika unduhan selesai. Kegagalan aset tetap punya fallback. Musik/SFX mengikuti preferensi volume, mute, pause/resume dan pembersihan yang sama. Suara gerak dibatasi frekuensinya, pengulangan sampel menghentikan instans lama, maksimum 20 suara sintetis/sampel bersamaan, dan cue prioritas dapat menggantikan suara yang kurang penting. Peringatan eits dihentikan sebelum suara kematian.
- **Feedback permainan:** portal, pintu/tuas, asap, batu, trap, sembunyi, langkah pemain yang benar-benar bergerak, persiapan/eksekusi serangan, antisipasi, menghindar, meleset, damage, relik, rune, heal, fase dan boss tumbang mempunyai event yang terhubung. Tombol aksi menguras event segera; tick berikutnya tidak memutar ulang atau membuangnya. Pukulan ke boss dibedakan dari pemain kehilangan hati. Time Attack dan hasil 2P juga memakai cue hasil melalui kontrak suara yang sudah ada.

### Dungeon dan validasi yang dipertahankan/dilengkapi

Perubahan map, pertumbuhan lantai, 400 varian, penempatan tujuan/pos pertahanan, batas enam penjaga, Warden, CCTV, anjing, Shadow, Mimic, laba-laba, trap, kamera, kontrol mobile, delapan serangan/lima fase boss Dungeon serta tiga pola khas boss Ekspedisi dari v15 tetap tersedia. Rilis ini tidak memindahkan objek, mengganti roster, memperpanjang par, atau mengubah data progres untuk membuat tes lulus.

Pencari bukti kini melewati pickup yang sudah benar-benar terambil dan memiliki alternatif urutan kunjungan. Trace lengkap dapat mencatat menunggu, interaksi tuas/pintu, gadget dan durasi menahan arah, lalu diputar ulang dari dunia baru. Pencarian taktis opsional (`gadgets: true`) memakai aksi asap dan cooldown 10 detik yang asli. Langkah yang direncanakan melewati jaring dapat mempunyai durasi lebih panjang; perlambatan tetap dihitung oleh simulasi normal. Pencarian standar tetap tanpa gadget. Tidak ada teleportasi, invulnerability tambahan, NPC dinonaktifkan atau pelonggaran syarat tiga bintang dalam admission replay.

### Verifikasi rilis

- **Seluruh `npm test`: 390 tes, 390 lulus, 0 gagal, 0 dilewati**, 219,77 detik pada lingkungan pengujian ini. Termasuk 13 regresi tambahan untuk pemetaan semua mode, identitas boss, headroom/determinisme PCM, cue aksi langsung, SFX asli/fallback, batas suara, async worker lifecycle, offset fase, gerak di jaring, cooldown dan replay trace dengan pintu/kunci.
- Korpus tersebut mencakup replay misi untuk **400/400 varian Dungeon**, idle survival setiap varian, 10 kasus mulai terlambat, serta replay bonus/tiga bintang level 1–15. Dua belas replay boss Dungeon menuntaskan lima fase, relik dan pintu keluar dengan gerakan biasa. Tes boss Ekspedisi mencakup pola, fase, celah, damage dan scheduler yang sudah ada.
- **Build produksi Next 15.5.28 berhasil.** Tidak ada dependensi baru, halaman aplikasi baru, atau berkas Markdown baru.
- **Chromium produksi: 45 konfigurasi** = 15 mode × 1366×768, 360×740 dan 740×360 (DPR 2 pada emulasi HP). Controller mulai/jeda/lanjut, canvas dan overflow diperiksa. Semua mode menunggu komposisi yang benar-benar selesai dibuat dan source WebAudio loop aktif; satu AudioContext digunakan. Tidak ada galat JavaScript atau respons aset aplikasi 4xx/5xx.
- Integrasi audio native tambahan memutar **18 kombinasi tema/aransemen** (Dungeon boss, tiga boss Ekspedisi, Adventure sibuk/bahaya × tiga variasi), tanpa fallback worker. Kelima SFX asli selesai didekode dan sampel asli dimainkan. Pause membekukan jam audio, resume melanjutkannya. Tombol mute/unmute dan slider UI diuji dengan musik **22%**, SFX **44%**; preferensi tersimpan.
- Pemilihan mode dalam matriks browser menggunakan state/controller aplikasi untuk cakupan lintas mode; pengaturan audio menggunakan kontrol UI. Ini bukan klaim seluruh permainan diselesaikan manual pada ketiga ukuran layar, atau mode 2P mendapatkan kontrol sentuh baru.

### Batas bukti

Belum diuji pada perangkat fisik Android/iOS Safari atau dinilai melalui pendengaran speaker/headphone. Sintesis, headroom, kontinuitas sampel, loop native dan transisi lifecycle diuji secara teknis; kenyamanan mendengarkan tetap memerlukan playtest manusia. Angka 390 bukan sertifikasi setiap kombinasi seed, pengejaran, alat dan input. Percobaan pencarian seluruh bonus level lanjut dengan batas node/urutan tertentu tidak selalu menemukan rute; kegagalan pencarian bukan bukti map mustahil. Rilis ini tidak mengklaim seluruh bonus level 16–50 sudah tersertifikasi tiga bintang. Batas penyimpanan browser yang ditolak tetap mengikuti mekanisme retry yang sudah dijelaskan pada v15.

## v17 — Musik dan efek suara menjadi file audio (25 Oktober 2026)

Musik latar kini dibaca dari aset fisik. Pemutaran produksi tidak lagi memanggil komposer PCM atau Web Worker musik; `renderer.js` dan `score.worker.js` dilepas. Komposisi v16 tetap menjadi sumber ekspor offline, sehingga identitas musik dan aransemen yang sudah dibuat tetap tersedia.

### Lokasi file

- `public/sounds/music/`: **30 MP3 full mix** untuk didengarkan langsung, serta **60 FLAC** untuk 30 pasang stem `base` dan `danger`. Ada 20 tema; Dungeon dan empat tema boss memiliki tiga aransemen. Contoh: `dungeon.mp3`, `dungeon.base.flac`, `dungeon.danger.flac`, `dungeon-boss-v2.mp3`. MP3 adalah versi siap dengar; game memuat stem FLAC, bukan MP3 pratinjaunya.
- `public/sounds/effects/`: **30 WAV** untuk portal, langkah, serangan, relik, rune, boss, alat dan cue lainnya.
- Lima SFX lama tetap berada di `public/sounds/`. Total 35 file efek suara tersedia untuk pemutaran.
- `lib/audio/catalog.js`: pemetaan tema/aransemen dan alamat file. Frame count, sample rate serta durasi hasil ekspor dicatat di sini.

FLAC 16-bit mono 22.050 Hz dipakai untuk stem karena mempertahankan jumlah sampel dan batas loop tanpa encoder padding dari kompresi lossy. [Panduan codec MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs#flac_free_lossless_audio_codec) menjadi acuan pemilihan format; kompatibilitas fisik iOS tidak diklaim sudah diuji. MP3 full mix disediakan agar lagu mudah dibuka di pemutar audio biasa.

### Pemutaran dan penggantian

Loader hanya mengambil dua stem tema yang diminta, mendekodenya lewat AudioContext, lalu menjalankan loop native yang sinkron. Cache tetap dibatasi dua aransemen. Crossfade, perpindahan fase pada posisi musikal yang sama, intensitas, pause/resume, mute dan volume tetap bekerja. File MP3 pratinjau tidak ikut diunduh oleh permainan. Efek WAV memakai BufferSource setelah siap; cue sintetis pendek hanya menjadi fallback ketika aset belum siap atau gagal, dan event lama tidak diputar terlambat.

Untuk mengganti musik, ganti file stem yang dipetakan pada katalog dengan pasangan yang sama durasinya. Bisa pula mengarahkan `base` ke satu file MP3/WAV/FLAC sendiri dan mengatur `danger: null`; loader membuat lapisan kedua hening dan memakai durasi file yang baru. Ini menonaktifkan lapisan intensitas untuk tema tersebut. Jika tema mempunyai beberapa aransemen, perbarui entri tiap aransemen yang hendak diganti. Mengganti MP3 pratinjau saja tidak mengubah musik permainan.

`npm run build:audio` mengekspor ulang seluruh file melalui komposisi orisinal. Perintah ekspor membutuhkan FFmpeg di PATH. Menjalankan `npm run dev` atau `npm run build` tidak membutuhkan FFmpeg karena semua aset sudah disertakan. Tidak ada dependensi npm, halaman, atau Markdown baru.

### Verifikasi

- **27 tes terarah lulus, 0 gagal, 0 dilewati.** Termasuk pemeriksaan 60 header/frame FLAC, 30 WAV tidak hening, keberadaan 30 MP3, request/decode, pasangan stem tidak cocok, file gagal, pembatalan, mode, cue, volume, cache dan lifecycle. Ini bukan klaim seluruh korpus replay Dungeon dijalankan ulang pada v17; hasil 390 tes penuh adalah verifikasi v16 sebelumnya.
- **Build produksi lulus**, First Load JS halaman utama 175 kB. Aset audio dimuat terpisah sesuai kebutuhan; ukuran ini tidak mencakup seluruh musik.
- **45 konfigurasi browser produksi lulus:** 15 mode × desktop, ponsel tegak, ponsel mendatar. Setiap mode menunggu `activeTrack` yang sesuai dan loop dari file yang telah dimuat. Tidak ada galat JavaScript atau aset aplikasi 4xx/5xx.
- Integrasi Chromium mendekode dan memainkan seluruh **30 aransemen/60 stem FLAC**, mendekode seluruh **30 MP3** dengan durasi dan energi audio valid, memuat **35 file efek**, serta memastikan cue portal memakai BufferSource. Tidak ada pekerjaan komposisi musik dalam worker. Pause/resume membekukan/melanjutkan jam audio; mute/unmute dan slider musik 22%/SFX 44% tetap bekerja melalui UI.
- Paket aset baru berukuran 31.205.470 byte sebelum pengemasan ZIP. Tidak ada perubahan data map, aturan gameplay atau progres pada v17. Batas playtest pendengaran dan perangkat fisik pada v16 tetap berlaku.
<<<<<<< HEAD

## v20 — Aset Delivery: kebun buah dan peternakan (26 Oktober 2026)

Delivery Mayhem kini memakai ilustrasi kebun dan peternakan yang benar-benar dimuat oleh renderer. A Lumbung, B Kandang, C Kios tetap memakai huruf, warna, dan bentuk berbeda. Reguler memakai peti apel, Ekspres keranjang stroberi berpita, Rapuh telur, Berat karung pakan, Multi-stop dua keranjang. Tram tampil sebagai gerobak panen, gerbang memakai pagar kayu buka/tutup, dan guncangan berupa tanah berlumpur. Menu memakai ular bertopi jerami dengan identitas wajah/tubuh yang sama.

### Berkas aset dan integrasi

- `public/assets/delivery/farm-environment.webp`: atlas transparan 768×512, lumbung, kandang, kios, pohon apel, bedeng sayuran, jerami/pakan, pagar mendatar dan tegak.
- `public/assets/delivery/farm-cargo.webp`: atlas transparan 768×512, lima jenis paket, gerobak, pagar tertutup dan terbuka.
- `public/assets/delivery/farm-terrain.webp`: 512×512, empat tekstur rumput/jalan/tanah/lumpur. Ketiga atlas sekitar 155 kB total; bukan gambar placeholder.
- `public/assets/game/bg-delivery.webp` dan `bg-delivery-m.webp`: hero transparan untuk menu desktop dan HP, memakai jalur aset responsif yang sudah ada.
- `farmAssets.js` memuat atlas bersama satu kali; ikon tujuan tetap terbaca saat berkas gagal atau belum selesai dimuat. `farmPlan.js` mengisi hanya petak rintangan asli dan memilih persegi panjang penuh untuk bangunan. `farmRender.js` menyimpan lapisan statis 48 piksel per petak, memperbaruinya saat map/aset berubah dan melepasnya saat controller dihentikan. Gambar pagar tetap berada di sisi dalam petak terhalang.
- Normal tetap 25×23, jalan utama 2–3 petak dan bantuan belok awal; Hard tetap 17×15 dengan belok presisi. Simulasi, pembuatan map, perhitungan rute, misi, progres, rekor dan runtime audio sama byte demi byte dengan bagian v19 yang pulih. Penggantian nama/bangunan tidak menambah collision, NPC, timer atau loop permainan.

### Prompt set ilustrasi

Dibuat dengan **imagegen built-in**, bukan CLI/API fallback. Atlas PNG asli dibuat pada giliran desain sebelumnya; rilis ini menggunakan ilustrasi yang sama, dinormalisasi ukuran dan dienkode WebP dengan alpha tetap dipertahankan.

1. **Environment — stylized-concept, atlas sprite game:** 1536×1024 transparan, empat kolom dua baris; urutan lumbung merah, kandang atap biru, kios hasil panen, pohon apel / bedeng sayuran, jerami dan karung, pagar mendatar, pagar tegak. Kartun hangat seperti gambar tangan, outline gelap zaitun, kayu hangat, sudut atas dengan sedikit bagian depan. Objek terpisah, tidak berpotongan, tidak ada huruf, label, garis grid, watermark atau latar adegan.
2. **Cargo — stylized-concept, atlas pickup dan bahaya:** format dan gaya sama, transparan. Urutan peti apel, keranjang stroberi pita merah, karton tiga telur, karung pakan / dua keranjang tersambung, gerobak jerami menghadap kanan, pagar tertutup, pagar terbuka. Bentuk dan warna harus mudah dibedakan pada ukuran kecil, tanpa tulisan.
3. **Hero — identity-preserve edit:** referensi hero Delivery sebelumnya dan `mascot-idle.png`. Pertahankan ular hijau, perut krem, mata bulat gelap, pipi merah, tanpa tangan/kaki. Tambahkan topi jerami, muatan apel/telur, kebun apel, lumbung merah, kandang biru, kios dan pagar kayu. Massa ilustrasi di kanan sekitar 60%, kiri sekitar 40% transparan untuk judul; tanpa teks/watermark. Hasil 1672×941, versi HP 960×540.
4. **Terrain — stylized-concept, atlas tekstur:** empat kuadran sama besar, rumput, jalan tanah krem, tanah tanam cokelat, lumpur. Pandangan atas, detail tenang dengan kontras rendah, tanpa objek atau tulisan, latar opak. Hasil 1254×1254 dinormalisasi menjadi 512×512 untuk runtime.

### Pemulihan arsip dan batas kesetiaan

ZIP v19 yang tersedia terpotong pada `timeattack.danger.flac` dan tidak memiliki central directory. Seluruh **312 entri lengkap** berhasil diekstrak dengan ukuran dan CRC yang sah. **43 berkas bagian akhir** yang tidak tersedia dipulihkan dari arsip unggahan utuh `Eat-eat-main(1).zip`, tanpa menimpa satu pun berkas lengkap v19. Ini mencakup konfigurasi Tailwind, skrip offline, tes dan tiga berkas audio. Tidak mengklaim bahwa tes tambahan dari sesi kerja yang hilang dapat dipulihkan persis.

`poison-death.mp3` diambil dari unggahan utuh. Stem danger Time Attack direkonstruksi dari komposisi yang sama dan envelope mastering stem base v19 yang masih utuh; 463.104 frame pertama memakai PCM asli yang masih dapat didekode dari fragmen. Sisa 198.396 frame direkonstruksi; MP3 pratinjau dibuat kembali dari pasangan ini. Bagian pembanding yang dapat dipulihkan memiliki selisih RMS sekitar 0,000017 sebelum PCM asli dipasang kembali. **Ini pemulihan perkiraan untuk bagian yang hilang, bukan klaim identik bit dengan audio v19 penuh.** Seluruh 145 berkas audio lengkap v19 tetap identik. Runtime audio, katalog, routing tema, loop, gain, retry dan transisi tidak diubah. Skrip ekspor offline yang dipulihkan mempertahankan flag `loop:false` bagi sting hasil; skrip lama ini tidak diklaim mereproduksi mastering seluruh rilis v19 secara identik.

Fixture tes dari arsip lama disesuaikan dengan kontrak yang memang sudah ada pada source v19: lima tema Delivery, 35 aransemen, gain master, request audio yang dibatalkan, fallback MP3 serta durasi misi. Tes shift lama menggunakan konfigurasi legacy eksplisit; tes Mayhem baru memeriksa perilaku default dan pemisahan Normal/Hard. Aturan game tidak dilonggarkan agar tes lulus.

### Bukti pemeriksaan rilis

- Suite awal: **396 tes**, 389 lulus dan 7 fixture lama gagal. Tujuh kegagalan tersebut diperbaiki pada fixture/harapan tes sesuai kontrak v19, lalu **74 tes terarah final lulus, 0 gagal, 0 dilewati** (audio, Delivery, aset baru, registry, regresi overhaul). Ini bukan klaim satu eksekusi ulang penuh `npm test` setelah seluruh penyesuaian fixture.
- Seluruh **400 varian Dungeon** beserta replay/idle dan kasus mulai terlambat pada suite awal lulus. Source Dungeon tidak diubah. Pengujian ulang terarah bukan pengganti klaim semua kemungkinan seed/input telah dimainkan manusia.
- Tes farm memeriksa **192 kombinasi** 12 misi × dua kesulitan × delapan seed: dekorasi hanya di rintangan, tiga alamat berbeda, data arena tidak dimutasi. Render tidak mengubah state, memakai cache tunggal dan membersihkannya saat selesai. Alpha, dimensi atlas dan UV sprite diperiksa.
- **288 konfigurasi Delivery** = 12 misi × dua kesulitan × tiga interval × empat seed memutar ulang bukti antrean pesanan awal yang diterima, dengan tubuh, muatan, fitur map dan deadline asli. Ini bukti antrean awal, bukan klaim seluruh misi ditamatkan untuk setiap seed.
- **Build produksi Next 15.5.28 berhasil.** Tidak ada dependensi baru, halaman baru, Markdown baru, atau perubahan kode mode lain.
- Chromium produksi pada 1366×768, 390×844 dan 844×390: menu, follow camera, overview, misi 1 dan 12, serta Hard; atlas benar-benar selesai didekode, dua kartu pesanan tidak overflow, Rem sentuh bekerja pada profil touch asli, tidak ada page error atau aset aplikasi 4xx/5xx. Audio Time Attack yang dipulihkan (kedua stem serta MP3) dan efek poison didekode native dengan durasi/energi valid; pasangan stem tetap tepat 30 detik.
- Belum diuji pada HP fisik Android/iOS atau dinilai lewat pendengaran manusia. Tidak ada klaim pengujian menyeluruh setiap interaksi pada seluruh mode. Paket akhir diperiksa CRC dan kelengkapan seluruh berkas.
=======
>>>>>>> d8551af93c55dca40eaf20b0da1fc20f965809e6
