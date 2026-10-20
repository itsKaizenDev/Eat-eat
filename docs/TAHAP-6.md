# Tahap 6: Territory "Rebut Arena" + tata letak info dua kolom untuk laptop

## A. Perubahan tampilan (dari umpan balik)
| Keluhan | Perbaikan |
|---|---|
| Layar Petualangan di laptop: satu kolom panjang, perlu scroll di dalam kanvas ("dipaksa") | Di lebar viewport >= 640 px (bukan panel samping HP) info dibagi **dua kolom**: kiri = deskripsi, tujuan, pratinjau aturan; kanan = pengaturan (level / durasi / kecepatan / rekor), kontrol, tombol PLAY. Layar sempit tetap satu kolom. |
| Kartu HUD Delivery/Ekspedisi: statistik bertumpuk dengan ruang kosong di kanan | `.hud-cols`: dua kolom (statistik + slot | pesanan/upgrade + pesan) pada lebar >= 640 px. HUD panel samping HP tidak berubah. |
| 4 mode Petualangan tidak muat 3 kolom | Jumlah kolom dari CSS (`data-n`), bukan gaya inline, sehingga aturan responsif tetap berlaku. |

## B. Rebut Arena (Territory, 2P lokal keyboard)
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

## C. Test (`npm test`, 191)
Arena valid/invalid; basis awal; jejak; klaim loop, bentuk persegi, jalur terbuka; area berbatas tepi atas **dan** kiri; kematian tepi/dinding/jejak sendiri; berbalik arah; jejak diinjak; head-on & tukar kepala; cermin P1<->P2; **death+claim serentak**; **dua klaim serentak** (petak sengketa netral); reclaim + jejak lawan tidak dipotong; **properti 60 permainan acak** (jumlah <= ownable, invarian jejak/kepala/dinding); hasil seri/menang/sekali; target; waktu habis; respawn biasa dan base darurat; flood fill 80x80 < 500 ms; determinisme; rekor; controller (PLAY sekali, pause membeku, hasil + rekor sekali, destroy).
Mutasi (9) tertangkap semua setelah dua test tepi ditambahkan: aturan sengketa, kematian mengalahkan klaim, pengecualian jejak hidup, injak-jejak, dinding, target, seed tepi atas/kiri-kanan.

## D. Belum diverifikasi di browser
Rasa gerak dan **balance** (60%, 90 dtk, interval, ukuran arena 24x21, jumlah dinding); tata letak dua kolom di lebar nyata laptop (hanya markup SSR dan CSS yang diperiksa, belum screenshot); fokus keyboard dua pemain dengan tombol bersamaan (keyboard ghosting pada beberapa keyboard membatasi tombol serempak); `prefers-reduced-motion` nyata. Bot satu pemain tidak dibuat (pengayaan opsional).
