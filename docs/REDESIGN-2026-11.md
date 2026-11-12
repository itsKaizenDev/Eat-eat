# K-Snake: layout, penempatan, dan pengetahuan penjaga

Perubahan ini berangkat dari `itsKaizenDev/Eat-eat`, commit
`0da6a32a64732ee3aada07e3ab0d0392c5007bdf`. Fokusnya Dungeon dan jalur
Ekspedisi sebelum boss. Angka tuning di bawah adalah keputusan untuk K-Snake,
bukan angka baku yang diklaim berasal dari sumber riset.

## Temuan yang mendasari perubahan

Masalah penjaga bukan sekadar kecepatannya. Implementasi lama mengenali serangan
monster dalam radius enam sel dan garis pandang, tanpa memeriksa arah pandang
penjaga. Jalur bahaya kemudian dihindari. Akibatnya penjaga dapat terlihat tahu
serangan dari belakang. Mengurangi kecepatan saja tidak memperbaiki informasi
yang seharusnya belum dimiliki AI.

Validasi portal juga hanya membandingkan jaraknya dengan relik pertama. Pada
map dengan dua relik, portal bisa terlalu dekat dengan relik kedua. Sementara
itu, skor kualitas dan keterhubungan lantai saja tidak membuktikan misi dapat
diselesaikan ketika patroli dan monster benar-benar bergerak.

## Riset dan penerapannya

| Sumber primer | Prinsip yang relevan | Keputusan untuk K-Snake |
| --- | --- | --- |
| [Postmortem Mark of the Ninja, Nels Anderson dan Jamie Cheng](https://www.gamedeveloper.com/design/classic-postmortem-klei-entertainment-s-i-mark-of-the-ninja-i-) | Stealth memberi ruang untuk mengamati, memilih tindakan, dan merespons akibatnya; playtest diperlukan untuk menguji asumsi desainer. | Lemparan batu dan posisi pemain harus bisa menghasilkan taktik memancing penjaga. Penanda veteran membantu pemain membaca perbedaannya. |
| [Epic: AI Perception](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine) | Persepsi mempunyai radius, sudut pandang, kejadian sensorik, dan umur ingatan. Informasi yang pernah diketahui berbeda dari yang sedang terlihat. | Setiap penjaga menyimpan pengamatan sendiri, dengan waktu reaksi dan kedaluwarsa ingatan. Ini adaptasi prinsipnya di JavaScript; tidak menambahkan Unreal Engine. |
| [Red Blob Games: 2D Visibility](https://www.redblobgames.com/articles/visibility/) | Area terlihat dapat dibatasi penghalang, radius, dan kerucut arah; hasilnya dapat digunakan untuk keputusan AI. | Pengamatan monster memakai pemeriksaan pandangan game yang juga memperhitungkan tembok dan asap. Tidak mengganti sistem dengan algoritme visibility baru. |
| [Mike Booth, Valve: The AI Systems of Left 4 Dead](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), halaman PDF 79–82 | Kepadatan ancaman perlu mempunyai jeda; sistem pacing memisahkan tekanan biasa dari peran encounter boss. | Jalur menuju encounter diberi pilihan rute dan bekal. Boss tetap memakai sistem yang ada. Ini penerapan layout statis, bukan penambahan AI Director adaptif. |

Kesimpulan desain untuk proyek ini: rute, penglihatan, dan posisi ancaman harus
menghasilkan keputusan yang bisa dibaca pemain. Menambah obstacle secara acak
atau memperpanjang prompt tidak menjamin hubungan tersebut. Karena itu aturan
penempatan disertai pemeriksaan geometri dan simulasi permainan.

## Dungeon

- Tetap 50 misi dengan delapan varian per misi, total 400 map.
- Ada 120 varian dengan pintu keluar terpisah dari titik masuk. Varian lain
  mempertahankan perjalanan kembali ke pintu masuk.
- Portal berjarak sedikitnya delapan langkah jalur dari **setiap** relik.
  Pasangan portal juga mempunyai jarak jalur minimal delapan langkah.
- Pintu keluar terpisah berjarak minimal empat sel secara geometris dari spawn
  dan delapan langkah jalur dari setiap relik.
- Patroli rutin diperbaiki agar tidak mati sendiri di jalur monster saat pemain
  diam. Rute aman ini merupakan instruksi patroli yang disusun saat authoring,
  bukan pemberian pengetahuan global kepada AI saat bermain.
- Penjaga yang meninggalkan patroli untuk menyelidiki umpan atau mengejar pemain
  tetap tunduk pada batas penglihatannya dan dapat dibunuh monster.
- Warden tetap hadir mulai misi 25. Tipe ini dipasang sebelum simulasi penerimaan,
  termasuk jika footprint perlu diregenerasi.
- Revisi campaign menjadi 9. Penyelesaian dan Apple Coin lama dipertahankan;
  waktu terbaik dari layout lama tidak dibandingkan langsung dengan layout baru.

### Pengetahuan penjaga

| Profil | Waktu reaksi setelah melihat peringatan | Ingatan area bahaya |
| --- | --- | --- |
| Rookie | 0,50 detik | 10 detik |
| Veteran | 0,20 detik | 25 detik |
| Anjing | 0,15 detik | 12 detik |

Penjaga cepat dan investigator memakai profil veteran. Penjaga lain memakai
rookie, kecuali profilnya ditentukan secara eksplisit. Veteran memiliki tanda
dua garis. Perbedaan ini ditentukan per aktor; tidak menambahkan menu pengaturan
kecerdasan baru.

Serangan yang tidak terlihat tidak memicu pengetahuan baru. Jika penjaga sudah
melihat peringatan, ia boleh menyelesaikan gerakan menghindarnya walaupun kemudian
berpaling. Namun ingatan terhadap serangan sebelumnya tidak mengungkap serangan
baru yang terjadi di belakangnya. Area yang pernah diketahui tetap dihindari
sampai ingatannya kedaluwarsa. Jadi memancing penjaga lebih mudah dilakukan
sebelum ia mengamati bahaya, bukan selalu berhasil tanpa memperhatikan posisinya.

Anjing mempertahankan persepsi radialnya; tembok, asap, dan jangkauan tetap
berlaku. Parameter di atas masih membutuhkan playtest untuk menilai apakah
rookie terasa cukup lambat dan veteran cukup menantang.

## Ekspedisi sebelum boss

| Wilayah | Penataan pendekatan | Penempatan pendukung |
| --- | --- | --- |
| Hutan Akar | Loop di persimpangan awal dan pintasan bekal setelah segel pertama | Scout mengawasi cabang baru; bekal ditempatkan pada rute tersebut |
| Rawa | Tepi barat lebih lapang dan jalur menuju sisi timur | Scout dan bekal mengikuti rute rawa; pilihan urutan miniboss tetap berlaku |
| Reruntuhan | Galeri atas dan koridor pilar selatan | Scout menjaga kedua pilihan pendekatan; bekal berada pada koridor timur |

Peta overview menampilkan nama jalur dan lantai memiliki penanda batu pijakan.
Seluruh lantai yang semula bisa dilalui tetap bisa dilalui, supaya posisi di
save lama tidak mendadak menjadi tembok. Save lama dimigrasikan untuk memakai
anchor patroli baru tanpa mereset pemain, inventaris, atau progres.

Definisi arena dan encounter boss/miniboss dipertahankan. Jalur tambahan ditutup
saat pertarungan aktif agar tidak menjadi celah kabur atau melewati syarat segel.

## Cara penerimaan dan pemeriksaan

`scripts/redesign-campaign.mjs` mengerjakan penataan secara offline. Runtime
memuat bank map yang sudah diterima; tidak menjalankan generator berat setiap
frame. Bank hanya ditulis jika semua varian diterima.

Pemeriksaan penerimaan mencakup validasi penempatan, jarak antarobjek, simulasi
diam selama 45 detik, dan penyelesaian misi melalui simulasi fixed-step game.
Misi 1–15 turut membuktikan rute bonus. Batas solver: 1.000 node dan horizon
170 detik. Hasil lolos membuktikan adanya rute yang diuji, bukan bahwa setiap
strategi pemain akan berhasil atau tingkat kesulitannya sudah ideal.

Regresi yang diperiksa meliputi serangan dari belakang, penghalang tembok/asap,
reaksi veteran, ingatan kedaluwarsa, lemparan batu nyata yang memancing penjaga
sampai mati, jarak portal terhadap relik kedua, segel arena, dan migrasi save.

Perintah pemeriksaan:

```sh
npm test
npm run build
```

Untuk membangun ulang campaign dari pipeline authoring, gunakan
`npm run build:campaign`. Proses ini jauh lebih mahal daripada build aplikasi
dan dapat mencari penempatan pengganti; tidak perlu dijalankan hanya untuk
memakai bank yang disertakan.

Validasi browser interaktif belum berhasil dijalankan di lingkungan pengerjaan.
Hasil simulasi dan build tidak menggantikan playtest sentuhan pada HP. Area yang
perlu diperiksa setelah patch diterapkan: keterbacaan veteran, belokan jalur
baru, dan kemudahan memancing penjaga dari balik tembok.
