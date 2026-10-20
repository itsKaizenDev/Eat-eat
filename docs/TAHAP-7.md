# Tahap 7: Boss Battle "Penjaga Kebun"

Satu boss, 3 fase, 3 pola serangan, 1 pemain (sentuh + keyboard). Aturan lengkap ada di komentar kepala `lib/boss/sim.js`.

## Aturan
- Arena 17x15; area boss 5x3 di tengah atas = terlarang (menabraknya = kehilangan nyawa, seperti tepi).
- Boss 3 HP (= 3 fase), pemain 3 nyawa. Apel energi: +1 energi (maks 6), +1 segmen. **Satu pukulan = 3 energi**, tubuh memendek 3 segmen (min 3).
- **Siklus per fase:** jeda 1,5 dtk -> serangan (peringatan -> aktif -> pemulihan) -> **jendela titik lemah** terbuka -> jeda. Serangan dan jendela tidak pernah bersamaan, jadi titik lemah selalu terjangkau.
- **Pukulan:** kepala MASUK tile titik lemah saat jendela terbuka, energi >= 3, dan jendela itu belum kena. Satu jendela = satu pukulan (bukan per frame). Tile terkunci atau energi kurang = hanya dilalui.
- **Transisi:** setelah pukulan non-final semua ancaman dibersihkan, titik lemah terkunci 2,5 dtk; fase baru baru aktif setelah transisi, lalu jeda sebelum serangan.
- **Mati:** -1 nyawa; respawn 3 segmen lurus di tempat aman (bukan di boss/bahaya/apel), ancaman radius 3 dibersihkan, **kebal bahaya 2,5 dtk** (waktu simulasi, cincin putus-putus di kepala). Energi dipertahankan, panjang reset ke 3. Tepi/area boss/tubuh tetap mematikan saat kebal.
- **Prioritas:** pukulan final + bahaya pada tick yang sama = **menang**. Pukulan non-final + mati pada tick yang sama = keduanya berlaku.
- Bahaya hanya mengenai **kepala yang masuk** sel bahaya aktif ("dinilai saat masuk"); tubuh tidak mati oleh bahaya. Tubuh tetap tantangan lewat tabrakan diri dan panjang akibat apel.

## Tiga pola (tiap pola: peringatan -> aktif -> pemulihan)
| Pola | Fase | Peringatan (min) | Aktif | Keadilan |
|---|---|---|---|---|
| Baris berbahaya | 1-3 | 1,6 dtk | 0,8 dtk | satu baris penuh di luar area boss; peringatan >= (1+3 langkah) x interval + 0,6 dtk; baris yang menjebak kepala dihindari |
| Ranjau kebun | 2-3 (5 / 7 ranjau) | 2,0 dtk | 4,5 dtk | tidak di kepala/depan kepala (jarak >= 3), tubuh, apel, titik lemah, area boss; >= 70% sel bebas tetap terjangkau (maks 12 percobaan) |
| Koridor menyempit | 3 | 2,5 dtk (naik sesuai rute) | 2,5 dtk | koridor 3 kolom yang TERJANGKAU lewat BFS; peringatan >= (langkah + 3) x interval + 0,6 dtk, maks 5 dtk |
Pola tidak valid (koridor terlalu jauh, ranjau mustahil) -> **fallback baris**.

## Tampilan & aksesibilitas
Peringatan = arsir + garis putus-putus; aktif = merah gelap + **X** (baris/koridor) atau **bom** (ranjau); koridor aman = bingkai hijau putus-putus + "AMAN"; titik lemah terkunci = abu-abu + gembok, terbuka = biru + bintang + "LEMAH". **Tidak ada kedipan**; peringatan menebal pelan, statis bila `prefers-reduced-motion`. HUD: HP boss, fase, nyawa, bilah energi (`progressbar`), status titik lemah (teks + ikon), sisa kebal, tahap serangan, pesan `aria-live`; HUD dikirim hanya saat tampilannya berubah. Menu: tanpa batas waktu (bukan chip palsu), chip kecepatan berlaku, rekor.

## Rekor
`boss|hp:3|lives:3|speed:<pref>` di `snake-records-v1`: kerusakan boss terbesar, menang/main, **kemenangan tercepat** (`bestSecs`, opsional, kompatibel ke belakang). Disimpan sekali per run.

## Test (`npm test`, 216; +25)
Arena valid/invalid; penjadwal (tahap, ketepatan waktu, idempoten); serangan tidak bersamaan dengan jendela; pukulan sekali per jendela, terkunci/energi kurang, energi menyusul; shrink tubuh; transisi fase; menang sekali + prioritas menang; pukulan+mati serentak; kematian 4 sebab; respawn aman + pembersihan radius + kebal; nyawa habis sekali; apel/energi; baris/ranjau/koridor (properti 60 seed) dan fallback; **pause di tengah peringatan**; restart tidak membawa serangan lama; HUD tidak dikirim tiap frame; determinisme; properti 80 permainan acak; rekor; registry/ikon/aset.
**Mutasi:** 15 perusakan aturan inti tertangkap (satu lolos awalnya: pemendekan tubuh, test diperketat; satu mutan tidak berarti diabaikan).

## Belum diverifikasi
Di browser: rasa gerak, **balance** (semua angka di `DEFAULT_CONFIG`: peringatan, 3 energi per pukulan, jumlah ranjau, 2,5 dtk kebal), keterbacaan arsir/X/bom di sel 40 px dan layar kecil, geser layar di HP, suara. Boss tidak punya batas waktu; belum ada integrasi boss ke Roguelite (pengayaan opsional).
