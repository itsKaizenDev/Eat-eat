# Dungeon: monster, pengamatan, dan luka NPC

## Temuan awal

Pada GitHub `itsKaizenDev/Eat-eat` commit `10b4728fbb50159a693e8684a9f2e99dec4ce79b`, redesign sebelumnya masih berupa penambahan `k-snake-redesign.patch`. Source game belum menerima isi patch tersebut. Paket ini menerapkan redesign pada source dan menambahkan aturan ekosistem berikut.

## Aturan perilaku

Shadow memakai jalur serang yang diumumkan. Mimic menggigit di mulutnya dan Spider menyerang titik yang ditandai. Semua memangsa pemain, penjaga, dan anjing yang memenuhi kondisi serangan. Mimic dan Spider memilih mangsa terdekat dalam jangkauan yang tidak terhalang dinding. Fase BITE/STRIKE memeriksa korban setiap tick, termasuk NPC yang baru masuk saat fase sudah berlangsung. Serangan fatal pada NPC memberikan HP 0, menghentikan perilakunya, dan menampilkan `TELAN` selama 0,8 detik. Satu mayat tidak dihitung sebagai mangsa lagi.

Pengetahuan penjaga berasal dari serangan yang dilihat sendiri. Rookie bereaksi setelah 0,5 detik dan mengingat jalur 10 detik; veteran 0,2 detik dan 25 detik. Anjing bereaksi setelah 0,3 detik dan mengingat 8 detik, dengan sudut pandang bahaya 120 derajat bila tidak ditentukan. Deteksi pemain oleh anjing tetap memakai aturan jarak dan penghalang sebelumnya. Dinding dan asap menghalangi pengamatan serangan. Ingatan jalur tidak memberi akses ke waktu serangan baru di belakang NPC. Menghindar tidak lagi mendapat pengali kecepatan khusus penjaga.

## HP dan bleeding

| Aturan | Nilai |
| --- | --- |
| HP penjaga | 100 |
| HP anjing | 70 |
| Luka duri aktif | 35 HP |
| Frekuensi luka | Sekali per pelat per aktivasi |
| Bleeding | 5 HP/detik selama 4 detik |
| Perlambatan gerak biasa saat bleeding | 20% |
| Stun luka duri | 0,4 detik |

Pelat lain dapat melukai secara terpisah. Luka baru memperpanjang bleeding tanpa menggandakan jumlah tick pada waktu yang sama. Satu luka lengkap mengurangi total 55 HP, tidak langsung membunuh NPC sehat. HP tidak pulih otomatis. Pause membekukan waktu simulasi; restart memulihkan keadaan awal. Luka duri membatalkan charge Warden yang sedang aktif; lunge baru tetap memakai kecepatan serbuan khususnya.

Kematian membersihkan charge, status bark/alarm, suspicion, intent, path, dan kepemilikan traffic. Mayat tidak dapat menangkap pemain atau merespons suara. Status luka hanya hidup dalam state sesi. Cabang simulasi pencari rute menyalin `spikeHits` secara terpisah dan membedakan keadaan HP/bleeding dalam identitas pencariannya.

## Penempatan dan validasi

Revisi campaign menjadi 10. Penataan duri dilakukan saat authoring, bukan sebagai pengetahuan bahaya global di AI runtime. Duri yang memotong rutinitas patroli dapat dipindah ke lantai dekat rute, dengan jarak terhadap spawn dan properti penting. NPC tetap bisa diarahkan ke sana melalui suara atau pengejaran.

Builder memeriksa penempatan, kualitas layout, kelangsungan NPC selama idle 45 detik, dan penyelesaian misi melalui simulasi fixed-step untuk 400 variasi. Bank hanya ditulis setelah semua variasi diterima. Cache hasil diikat ke isi source simulasi, aturan luka, generator, dan builder. Ini memberi bukti rute yang dapat diselesaikan; tidak menjamin setiap gaya bermain atau semua urutan gadget sudah teruji.

Tes regresi mencakup luka per aktivasi, bleeding fatal, pause/restart, pelepasan jalur saat mati, isolasi state planner, tiga monster melawan dua jenis NPC, pemilihan mangsa, masuk terlambat ke fase serang, serta umpan batu yang sungguh disimulasikan. Playtest manusia tetap diperlukan untuk menilai tingkat kesulitan dan rasa bermain.

## Hasil authoring revisi 10

Seluruh 400 variasi diterima, termasuk 120 variasi dengan titik ekstraksi terpisah. Dibanding bank redesign revisi 9, 72 variasi berubah penempatan durinya dan 15 variasi berubah susunan/rute penjaganya. Ada variasi yang masuk kedua kelompok. Log dan ringkasan tersedia di `docs/validation/monster-campaign.log` dan `monster-campaign-summary.json`.
