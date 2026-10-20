# Tahap 3: Registry mode + Puzzle "Jejak Kunci"

## Cakupan
- **Registry mode** (`lib/modes/registry.js`): satu sumber untuk id stabil, label, grup, jumlah pemain, dukungan sentuh, deskripsi, kontrol, jenis kecepatan (`pref | locked | pref+duration | none`), dan kondisi selesai. Sepuluh mode lama didaftarkan sebagai adapter (`kind: 'arcade'`); perilakunya tidak berubah. Menu membaca grup, sub-mode, dan deskripsi dari registry.
- **Puzzle** sebagai mode mandiri (`kind: 'puzzle'`, grup `adventure`) dengan lima level buatan tangan.
- **Menu "Petualangan"** (keputusan D5): tombol terpisah di layar arkade → layar mode petualangan dengan tombol **Kembali** (kembali ke mode arkade sebelumnya). Layar tiga grup lama tidak diubah.

## Arsitektur (empat tanggung jawab terpisah)
| Tanggung jawab | Berkas |
|---|---|
| Simulasi (murni; tanpa React/GSAP/storage/jam/RNG) | `lib/puzzle/sim.js` |
| Data level | `lib/puzzle/levels.js` |
| Lifecycle/state + progres + emit ke UI | `lib/puzzle/controller.js`, `lib/progress.js` |
| Render Canvas | `lib/puzzle/render.js` |

`GameCanvas` memilih controller menurut `kindOf(mode)`: `createSnakeGame` (arkade) atau `createPuzzleGame` (puzzle). API lifecycle keduanya sama (`startRun/pauseRun/resumeRun/releasePause/togglePause/returnToMenu/setDir/destroy`).

## Aturan Puzzle
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

## Level (par = optimum BFS, diverifikasi test)
| # | Nama | Par | Mekanik yang terbukti dibutuhkan (ablasi) |
|---|---|---|---|
| 1 | Kunci dan Pintu | 15 | kunci (tanpa syarat kunci: 3 langkah) |
| 2 | Panjang Tubuh | 16 | makanan (tanpa: tak solvable), plate (tanpa syarat: 10) |
| 3 | Dua Plate | 13 | makanan (tanpa: tak solvable), dua plate (tanpa syarat: 9) |
| 4 | Portal Berpasangan | 6 | portal (tanpa portal: tak solvable) |
| 5 | Ekspedisi Kecil | 19 | makanan, portal (tak solvable tanpa), kunci (7), plate (13) |

Format level: peta ASCII (`#` tembok, `.` lantai, `F` makanan, `K` kunci, `E` pintu, `a`–`c` plate, `1`–`3` pasangan portal) + `snake` (kepala dulu), `dir`, `exit: { keys, plates }`, `par`. Level tidak valid **ditolak** oleh `buildLevel`/`loadLevels` (validator memeriksa ukuran, tembok, kontiguitas ular, arah, tumpang tindih objek, portal harus berpasangan, syarat pintu, par). Tidak ada generator acak.

## Penyimpanan
Key baru `snake-progress-v1` (JSON ber-versi: `{ v: 1, puzzle: { levels: { "<id>": { best } } } }`). Dibaca lewat `parseProgress` (versi asing/rusak → kosong; id/angka liar dibersihkan). Ditulis hanya saat level selesai. Rekor = langkah minimum; replay lebih panjang tidak merusaknya. Level terbuka bila **semua** level sebelumnya selesai. Key lama (`snake_best`, `snake-speed`, `snake-ta`, `snake-lefty`) tidak disentuh.

## Kontrol
Panah / WASD / geser layar / DPad = satu langkah · **Z** (atau tombol Undo) = undo · **R** (atau tombol Ulang) = ulang level · Esc / tombol Jeda = jeda · Bantuan menjeda.

## Visual & aksesibilitas
Canvas 2D sederhana tanpa aset baru. Status terbaca tanpa warna: pintu terkunci = gembok, terbuka = panah; plate = huruf A/B/C, putus-putus saat kosong, lencana "A✓" di atas ular saat tertahan; portal = angka + jumlah cincin; kunci = glyph kunci. HUD memuat level, langkah/par, kunci, plate, dan pesan (live region). Latar menu memakai **fallback gradien CSS** (`.bgimg-puzzle`) — belum ada aset gambar final.

## Perbaikan bug yang ditemukan di tahap ini
- Tahap 1: `killVisualTweens` tidak mereset posisi canvas DOM, sehingga restart saat guncangan bisa menyisakan geseran.
- Integrasi: engine arkade baru (setelah Puzzle) kembali ke kecepatan default; kini preferensi diterapkan saat engine dibuat.
- `bgFiles()` akan melempar untuk mode tanpa aset gambar; kini aman.
- Aturan level terbuka diperketat menjadi rantai penuh.

## Test
`npm test` (95 test). Puzzle: lima solusi beku diputar ulang, par = optimum BFS, ablasi mekanik, aturan langkah (ekor, plate pada okupansi akhir, portal dua arah, tabrak tubuh), undo persis untuk semua level, validasi 15 jenis level invalid, kemurnian (state beku), progres, controller (lifecycle, selesai sekali, rekor), konsistensi registry ↔ constants/tema/ikon/CSS.

## Belum diverifikasi
Perilaku di browser nyata: klik/keyboard/swipe pada layar Petualangan, tampilan menu & HUD di 360/390/768/1366 px dan landscape HP, fokus keyboard pada layar hasil, transisi scene ke mode baru, dan pergantian controller arkade ↔ puzzle di React. Yang sudah diperiksa: render SSR komponen baru (18 pemeriksaan markup) dan gambar Canvas level lewat renderer asli.
