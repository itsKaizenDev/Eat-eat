# Konsistensi Scene Adventure dan Arcade

Tanggal: 20 Oktober 2026. Basis: ZIP Dungeon terakhir yang dikirim, dengan revisi kampanye 4.

## Yang diperbaiki

Aset sebelumnya sudah digambar ulang, tetapi belum cukup seragam dengan Arcade: detail dan shading Adventure lebih padat, bentuk wajah/garis berbeda, serta tepi lingkungan dan skala karakter belum konsisten. Batch ini menyamakan gaya, bukan mengubah mekanik permainan.

Acuan visual tetap **Mayhem+ dan Hard** yang sudah ada: garis tebal gelap, bentuk kartun sederhana, warna flat dengan bayangan ringan, mata putih besar, perut krem bersegmen, pipi merah, dan ekspresi yang jelas. Kedua aset acuan tidak diubah. Classic, Night, Portal, Impossible dan Duo juga tidak diubah pada batch ini.

## Scene yang disesuaikan

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

## File yang berubah

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

Dokumentasi tambahan: `README.md`, `CHANGELOG.md`, dan dokumen ini. Kode aplikasi, CSS, seluruh engine/controller, kampanye, input, localStorage, revive, formula boss, dependency dan lockfile identik dengan ZIP basis. Perbaikan Dungeon dan movement dari batch sebelumnya tetap ikut dalam ZIP lengkap.

## Verifikasi

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

## Prompt aset

Metode: penyuntingan gambar melalui alat imagegen bawaan, dengan Mayhem+ sebagai referensi utama, Hard sebagai referensi pendukung, dan gambar mode sebelumnya sebagai target. Berikut prompt lengkap per scene untuk revisi lanjutan.

### Mayhem biasa

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

### Time Attack

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

### Dungeon

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

### Kurir Apel

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

### Ekspedisi

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

### Rebut Arena

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

### Penjaga Kebun

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

