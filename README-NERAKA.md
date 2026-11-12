# K-Snake · Bab II Neraka

Masuk ke **Petualangan → Dungeon** dari menu utama. Level 50 kini berisi arena Penjaga Relik Agung. Seusai menang dan mengambil Relik Agung, lantai di pintu keluar retak. Masuki retakan untuk membuka komik tiga panel Bab II. Pilih **Masuk level 51** untuk mulai bermain.

| Level | Wilayah | Isi |
| --- | --- | --- |
| 1–50 | Dungeon | Level 50 menjadi arena Penjaga Relik Agung |
| 51–62 | Penjara Abu | Penjaga korup dan Pemakan Gema pertama |
| 63–74 | Tambang Bara | Dua relik, monster tambahan, dan jalur samping |
| 75–86 | Katakomba Gema | Warden korup dan Peniru di dekat rute keluar |
| 87–98 | Benteng Mahkota | Enam penjaga dan tujuh monster per denah |
| 99 | Takhta Neraka | Raja Bara, 34 HP dalam lima fase, Mahkota senilai 100 Apple Coin |

Penjaga korup punya 120 HP dan tetap dapat terkena duri atau dimangsa. Pemakan Gema mendeteksi suara lari, batu, dan gonggongan yang merambat melalui lantai. Lingkaran ungu mengunci posisi serangan. Bergerak pelan saat mendekat, atau lempar batu untuk memancingnya ke penjaga.

Raja Bara memakai Belahan Api dengan lorong aman yang berpindah dan Ledakan Bara yang mengunci posisi baru di setiap gelombang. Musik boss 148 BPM memakai lapisan bahaya yang menguat sesuai fase dan tahap serangan. Deru pembuka, peringatan, hantaman, dan perubahan fase punya efek suara sendiri.

Simpanan lama tetap dapat dibaca. ID internal arena Penjaga Relik Agung tetap `gen-51` agar rekor dan kemenangan lama membuka level 51 yang baru. Denah reguler lama pada slot 50 digantikan arena boss. Koin yang sudah tercatat untuk denah lama tetap dihitung.

## Menjalankan

Dari folder `K-Snake`:

```sh
npm ci
npm run dev
```

Untuk produksi jalankan `npm run build`. Jika memasang ke repo yang sudah tersambung ke Vercel, salin isi folder `K-Snake` ke checkout repo tersebut, periksa diff, lalu commit dan push ke branch yang terhubung ke Vercel. Gunakan checkout yang sudah mencadangkan pekerjaan lokalmu.

Aset komik, musik, dan efek suara sudah ada di `public/`. `npm run build:inferno` membangkitkan ulang denah dan memverifikasi replay dengan simulasi. `npm run build:audio -- --inferno` membangkitkan ulang soundtrack dan efek suara chapter ini memakai FFmpeg.


## Verifikasi

Build produksi berhasil. Semua 48 denah Neraka lolos replay misi tanpa alarm dan uji patroli diam selama 45 detik. Pertarungan Raja Bara berhasil diselesaikan di simulasi sampai Mahkota dibawa ke pintu keluar. Tes penuh lulus 488 dari 489. Satu kegagalan berasal dari tes gerbang Mayhem yang juga gagal di source sebelumnya. Tes audio ulang terhadap aset hasil mastering lulus 19 dari 19.

Aset komik dan audio dapat dimuat dari server produksi lokal. Arena Neraka diperiksa pada render 390 × 844 dan arena Raja Bara pada 1100 × 720. Chromium tidak dapat mulai di lingkungan pengujian karena pembuatan socket ditolak, sehingga playtest browser interaktif belum dilakukan.

## Aset komik

Komik dibuat dengan generator gambar bawaan menggunakan tangkapan layar ular K-Snake sebagai referensi karakter. Aset yang dipakai game adalah `public/assets/dungeon/neraka-komik.webp`.

<details>
<summary>Prompt ilustrasi</summary>

> Use case: illustration-story. Create one finished portrait 2:3 digital comic page for the K-Snake game, with EXACTLY THREE equal-height wide cinematic comic panels stacked vertically, separated by two straight dark horizontal gutters. The attached game screenshot is ONLY a character design reference: the small heroic lime/olive green snake with a cream chin, big round eyes and curled body, shown near the lower center. Ignore the screenshot layout and HUD. Keep the same green snake recognizable in all three panels, no limbs, expressive eyes. Panel 1: after winning the dungeon boss battle, the green snake beside a glowing blue diamond relic in an ancient teal stone throne chamber, a defeated enormous stone serpent silhouette behind it, victory interrupted as an orange fissure splits the tiles below. Panel 2: overhead wide diagonal view as the same snake and the blue relic fall through a deep broken stone shaft, red-orange light below and pebbles suspended. Panel 3: snake awake in an infernal basalt prison at the foot of a red cracked gateway, orange lava in a lower channel, the dark silhouette of a distant helmeted corrupt guard and a horned creature behind the gates. Horror adventure, tense but suitable for a fantasy arcade game, no blood or gore. Hand-inked graphic novel, painterly shadows, deep forest teal above, black and ember vermilion below, clean silhouettes, strong thick inks, very clear storytelling. Fill page edge-to-edge. Absolutely no text, no letters, no speech bubbles, no watermark, no UI, no border around the overall page. Keep hero and action inside each individual panel so the page works on a phone.

</details>
