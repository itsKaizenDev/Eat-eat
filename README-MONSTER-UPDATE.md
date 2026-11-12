# K-Snake — Monster Update

Source lengkap siap dipasang ke checkout repo yang sama. Revisi campaign: **10**. Verifikasi selesai pada 12 November 2026; lihat hasil dan satu kegagalan lama di bawah.

Paket ini berisi source aplikasi lengkap, termasuk redesign sebelumnya dan perbaikan monster. Bukan file patch. Basis GitHub: `itsKaizenDev/Eat-eat`, commit `10b4728fbb50159a693e8684a9f2e99dec4ce79b`.

## Perubahan

- Shadow, Mimic, dan Spider memangsa penjaga dan anjing. Mimic/Spider tetap berbahaya sepanjang fase serang aktif; Spider memilih mangsa terdekat yang terlihat.
- Bahaya monster dikenali lewat pandangan pribadi, penghalang, waktu reaksi, dan ingatan. Veteran lebih cepat bereaksi, tetapi tidak tahu serangan baru di belakangnya. Anjing tidak membaca bahaya monster dari segala arah.
- Penjaga memiliki 100 HP, anjing 70 HP. Duri mengurangi 35 HP sekali per aktivasi per pelat, lalu bleeding 5 HP/detik selama 4 detik. Bleeding memperlambat gerak 20% dan dapat membunuh.
- HP bar muncul saat terluka; bleeding ditandai tetes merah. Monster menampilkan `TELAN` singkat saat memangsa NPC.
- NPC mati berhenti bergerak, mengisi alarm, menggonggong, menyerbu, dan memesan jalur.
- Penempatan duri dan patroli disesuaikan untuk aturan luka baru. Pemain tetap dapat memancing NPC keluar dari rute patrolinya.

## Hasil verifikasi

- `npm run build`: berhasil, termasuk kompilasi dan 6 halaman statis.
- Authoring ulang: **400/400 variasi diterima**, dengan 120 titik ekstraksi terpisah. Penempatan duri berubah pada 72 variasi dan penjaga pada 15 variasi.
- `npm test`: **480 lolos dari 481**, tidak ada tes yang dilewati. Satu kegagalan lama ada di `tests/delivery-mayhem.test.mjs:15` (gerbang Mayhem, hasil `1 !== 0`). Kegagalan yang sama tercatat pada source sebelum perubahan ini; `npm test` karena itu masih mengembalikan exit code 1.
- Kesembilan tes luka/monster baru lolos, termasuk umpan batu pada penjaga dan anjing, serangan aktif, pause/restart, dan isolasi state pencari rute.
- Render canvas produksi diperiksa pada ukuran 390 × 780 dan 1100 × 700. Ini pemeriksaan renderer; playtest browser interaktif belum berhasil dijalankan karena Chromium dibatasi lingkungan.
- Runtime pengujian: Node.js 24.22.1. Log tersedia di `docs/validation/`.

## Menjalankan

Gunakan Node.js yang kompatibel dengan Next.js 15 dan npm. Dari folder `K-Snake`:

```sh
npm ci
npm run dev
```

Verifikasi produksi:

```sh
npm test
npm run build
```

## Memasang ke repo GitHub dan Vercel yang sama

Pada checkout repo milikmu yang bersih dan sudah berada di `main`, buat branch:

```sh
git switch -c fix/monster-ecosystem
```

Salin isi folder `K-Snake` dari arsip ke root checkout tersebut. Pertahankan folder `.git`, konfigurasi environment lokal, dan remote repo yang sudah ada. Paket ini tidak membawa `.git`, `node_modules`, hasil build, ZIP lain, atau patch besar lama. Jika `main` sudah lebih baru dari basis commit di atas, tinjau perbedaan sebelum menimpa file agar perubahanmu tidak hilang.

Setelah menginstal dependensi dan memeriksa hasilnya:

```sh
git add lib scripts tests docs package.json README-MONSTER-UPDATE.md
git commit -m "fix: make dungeon monsters lethal to NPCs and add bleeding"
git switch main
git merge --ff-only fix/monster-ecosystem
git push origin main
```

Jika fast-forward gagal karena branch berubah, selesaikan perbedaan branch terlebih dahulu; jangan force push. Vercel akan mengikuti mekanisme deployment repo/branch yang sudah terhubung. Tidak perlu mengganti remote atau membuat proyek Vercel baru.

Perubahan ini belum di-push atau di-deploy dari chat. Akses penulisan integrasi GitHub sebelumnya ditolak, sehingga hasil dikirim sebagai source lengkap.
