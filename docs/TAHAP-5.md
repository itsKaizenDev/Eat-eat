> Arsip versi sebelumnya. Aturan terbaru dan hasil validasi ada di [ADVENTURE_REVISION.md](../ADVENTURE_REVISION.md).

# Tahap 5: Roguelite "Ekspedisi Mayhem"

## Alur run
Satu run = **5 ronde pendek**. Tiap ronde punya target poin (28, 40, 52, 64, 76). Begitu target tercapai, simulasi **dibekukan** dan muncul menu: pilih **1 dari 3 upgrade**. Setelah ronde 5 tuntas run **menang** (tanpa menu upgrade). Menabrak = run **kalah**; upgrade **tidak** dibawa ke run baru. Run yang sedang berjalan tidak disimpan (hanya rekor saat run selesai). Lima ronde bisa diselesaikan tanpa boss.

Ronde baru: arena, posisi, dan panjang awal di-reset; efek sementara dibuang; perisai/penawar diisi ulang; **upgrade dan total skor dibawa**. Tiap ronde menunggu **arah pertama** pemain (tidak ada timer yang menyerang saat menu upgrade baru ditutup); menekan arah yang sama dengan hadap awal (kanan) memulai ronde, berbalik arah diabaikan.

## Isi ronde
Arena 17×15, tembok luar mematikan. 3 apel aktif: **normal +4**, **besar +10**, **racun −6 (dan ekor −2)**, **keberuntungan +4 + efek sementara**. Ranjau mematikan (2/3/4/4/5 per ronde, ≥ 4 sel dari kepala, tidak di lajur depan kepala). Efek (6 dtk dasar): **menguntungkan** Waktu Melambat (interval ×1,5), Skor Ganda (×2); **merugikan** Terburu-buru (interval ×0,7), Kontrol Terbalik. Peluang efek merugikan dasar 50%. Bentuk apel dibedakan selain warna (apel, apel bercincin emas, apel bersilang, bintang "?").

## Upgrade (semua angka = parameter awal, balance belum teruji main)
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

## Menu upgrade
Dialog modal: fokus pindah ke kartu pertama dan terkunci di dalam dialog (Tab/panah berputar), tombol **1–3** memilih langsung, Esc tidak menutup (wajib memilih). Tiap kartu menulis **Manfaat** dan **Harga**, tingkat, dan nama beraria. Setelah satu pilihan semua kartu dinonaktifkan; controller menolak pilihan kedua. Selama menu terbuka ular, jam, efek, dan RNG tidak berubah; input gameplay, pause, dan bantuan tidak berpengaruh.

## Determinisme
Satu aliran RNG per run (`seed`): spawn apel/ranjau, efek keberuntungan, dan penawaran upgrade. Seed + input + pilihan sama = run identik (diuji; seed berbeda menghasilkan run berbeda).

## Penyimpanan
`snake-records-v1`, kunci `roguelite|rounds:5|speed:<pref>`: skor total terbaik, ronde tertinggi, jumlah run, run tuntas. Disimpan sekali per run. Skema rekor diperluas **kompatibel ke belakang** (`bestRounds` opsional; entri Delivery lama tetap valid).

## Arsitektur
`lib/roguelite/upgrades.js` (data + kalkulasi murni) · `sim.js` (satu ronde, murni) · `controller.js` (run, lifecycle, jam, upgrade, rekor) · `render.js` · `components/UpgradeDialog.jsx`.

## Test (`npm test`, 156)
Stacking nilai pasti 0/1/2 tingkat, urutan kalkulasi, clamp, **properti kombinasi terlarang** (eksplorasi semua build sah sampai 4 pengambilan: apel normal tidak pernah < 3), penawaran (tanpa duplikat/capped, deterministik, pool < 3, kosong), arena valid (200 seed), makan/racun/penawar/efek, tabrakan, **perisai** (belok aman, relokasi, ranjau, properti 150 seed: kepala selalu valid), alur run lengkap 5 ronde, **menu upgrade membeku** (termasuk RNG dan emisi), klik ganda hanya satu, kematian dan upgrade tidak terbawa, determinisme, fuzz controller, rekor. Mutasi (6 + 1 diperketat) tertangkap semua.

## Bug yang ditemukan saat menulis tahap ini
Menekan arah yang sama dengan hadap awal diabaikan sebagai duplikat sehingga ronde tidak pernah mulai (ditemukan test controller; diperbaiki). Impor ikon `Zap` ganda ditangkap test sebelum build.

## Belum diverifikasi di browser
**Balance** (target 28→76, nilai apel, 2 tingkat/upgrade, peluang efek, jumlah ranjau, interval) — semua angka awal; rasa gerak; dialog upgrade di layar kecil/landscape HP dan navigasi keyboard/pembaca layar nyata; fokus kembali ke canvas sesudah memilih. Yang sudah diperiksa: SSR markup menu/HUD/dialog (20 pemeriksaan), gambar Canvas arena dan latar lewat renderer.
