# Panduan aset Fokus

## Identitas visual

Satu ular hijau gemuk, perut krem, mata gelap, pipi koral, garis luar zaitun. Hindari anggota tubuh tambahan, tekstur rumit, neon dominan, tipografi dalam gambar, atau gaya 3D fotorealistis. Tombol, judul, angka, dan teks dibuat di React, tidak ditanam di ilustrasi.

Metode: image generation bawaan dengan satu referensi karakter Classic. Gambar yang salah dikoreksi melalui image generation: apel normal dibuat tanpa maskot, dan kunci Puzzle diletakkan di tanah agar ular tidak mempunyai tangan. Sharp hanya dipakai untuk resize/kompresi/konversi format, bukan menggambar aset.

## Rasio dan penempatan

- Scene: rasio sekitar 16:9, karakter utama di kanan, area kiri tenang untuk teks. Seluruh karakter masuk frame.
- HP: banner mengikuti rasio gambar asli. Desktop: gambar tetap utuh di sisi kanan banner lebar dengan transisi halus ke warna dasar di kiri.
- Nama file desktop `bg-{id}.webp`; varian HP `bg-{id}-m.webp`. Mode ID mengikuti registry.
- Desktop 1672 × 941, WebP kualitas 82. HP 960 × 540, kualitas 78. Budget tiap file < 300 KB.
- Maskot transparan 320 × 320; item transparan 128 × 128. Ikon aplikasi menggunakan maskot idle pada 192 dan 512 px.
- Jangan mengganti object-fit menjadi cover tanpa mengecek posisi karakter pada 360 px dan landscape.

## Prompt dasar scene

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

## Prompt maskot dan item

Setiap prompt menghasilkan satu gambar, bukan lembar sprite. Semua dipakai dari `public/assets/game/{nama}.png`.

### mascot-idle

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green snake from reference, coiled upright, friendly closed-mouth smile, curious black eyes, cream belly, coral cheeks. NO arms, legs, hands. No props. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

### mascot-win

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, joyful closed crescent eyes and happy open smile, three small gold celebratory stars above head. No limbs. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

### mascot-sick

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, queasy expression half closed eyes, tiny purple bubble above head, still cute not scary. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

### mascot-shock

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, round surprised eyes and small O mouth, two short orange surprise marks above head. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

### apple-normal

```text
One isolated coral-red apple with a small green leaf and thick dark olive outline; same shape and shading as apple-big. No plus sign, no face, no snake, no mascot, no scenery. Centered, fully visible, transparent background. Readable at 24 pixels.
```

### mascot-dizzy

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. The exact green legless snake from reference, coiled upright, small spiral eyes, two little yellow stars above head, harmless dizzy expression. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 100 pixels.
```

### apple-big

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE large golden yellow apple with green leaf and bold simple PLUS symbol on center, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-poison

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE purple apple with green leaf and bold simple skull symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-dark

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE dark navy apple with green leaf and bold simple cream crescent moon centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-lucky

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE pink apple with green leaf and bold simple four leaf clover symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-teleport

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE cyan apple with green leaf and bold simple spiral symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-bomb

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE orange-red apple with green leaf and bold simple bomb symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### apple-time

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE cyan-green apple with green leaf and bold simple clock symbol centered, no face. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### bomb

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE round charcoal cartoon bomb with a short curved fuse and tiny orange spark. Friendly cartoon style. Clear silhouette. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

### portal

```text
Use case: illustration-story. Production transparent game sprite for eat-eat. Reference image is style and mascot identity reference only. Create ONE isolated centered square image, transparent background, subject fully visible with 15% empty margin. ONE thick purple oval magical portal ring seen upright, cyan inner edge, transparent center, two tiny simple sparkles. No base, no scenery. Crisp friendly 2D cartoon, confident thick dark olive outline, flat color plus one shadow color, no texture, no text, no realistic 3D, no scenery or cast shadow. Must read at 24 pixels.
```

## Pembaruan berikutnya

Pertahankan nama file dan alpha PNG supaya kontrak renderer tidak berubah. Periksa item pada ukuran 24 px, maskot pada 64–120 px, dan seluruh scene pada HP. Penggantian aset tidak memerlukan perubahan aturan engine.
