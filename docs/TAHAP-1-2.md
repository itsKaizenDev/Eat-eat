# Tahap 1–2: Stabilisasi engine

Cakupan: lifecycle eksplisit, jam & RNG injeksi, perbaikan P0/P1/P2 dari audit. Tidak ada mode baru, tampilan lama utuh.

## API engine (`createSnakeGame`)
`startRun` · `pauseRun(reason)` · `resumeRun` · `releasePause(reason)` · `togglePause` · `returnToMenu` · `setDir` · `setDirMP` · `getState` · `destroy`.
State: `menu | playing | paused | won | lost`. `startRun` hanya berhasil dari `menu/won/lost` (tidak lagi toggle pause).
Opsi injeksi: `rng`, `now`, `inspect` (hook test; tidak dipakai di produksi).

## Aturan yang diputuskan (D1–D6)
- **Ekor:** boleh masuk sel ekor bila ular tidak tumbuh di langkah itu (single & 2P).
- **Apel besar:** teks bantuan Classic/Portal/Time Attack/Malam dikoreksi (apel besar memang tidak pernah muncul di sana). Balance tidak berubah.
- **Pause:** alasan `user | help | hidden | orientation`. Bantuan/tab/orientasi menjeda; melepasnya TIDAK melanjutkan. Lanjut = Lanjut / Esc / tombol Jeda / arah (selama tidak ada penghalang). Tombol Jeda ikon di HUD sentuh.
- **2P:** tick transaksional (snapshot → collision bersama → commit → hasil sekali). Tembus 50 bersamaan: skor lebih tinggi menang, sama = seri. Respawn mencari 3 sel lurus yang bebas; retry terbatas.
- **Arena Sempit non-hard:** tetap instan (identitas mode); makanan pengganti kini dipilih di dalam arena baru.
- **Waktu:** semua deadline gameplay memakai jam simulasi yang membeku saat pause. Langkah game dijadwalkan dari RAF terhadap jam itu (tanpa `setInterval`).
- **Storage:** nilai divalidasi (allowlist); skor terbaik disimpan saat ronde selesai, bukan tiap apel.

## Bug → test
| Temuan | Test |
|---|---|
| Efek habis setelah game over menghidupkan tick | `P0: efek yang habis SETELAH game over…` |
| `spawnFood` hang di papan penuh | `P0: spawnFood di papan penuh…` |
| 2P hasil ganda / pemenang bergantung urutan | `P0: kematian serentak…`, `P0: dua pemain tembus 50…` |
| Efek/makanan/ranjau jalan saat pause | `P1: pause membekukan…` |
| Time Attack resume via arah | `P1: Time Attack — resume…`, `…berakhir tepat sekali` |
| Arah pertama hilang; antrean input | `P1: arah pertama…`, `P1: dua input cepat…` |
| Aturan ekor | `P1: masuk sel ekor…` |
| Shrink: makanan di luar arena | `P1: shrink biasa…` |
| Spawn menimpa tubuh/ranjau; respawn 2P | `P1: spawn tidak menimpa…`, `P1: respawn 2P aman…` |
| `snake_best` rusak → NaN | `P1: best rusak…`, `storage: …` |
| PLAY terlambat menjeda ronde; alasan pause | `lifecycle: …` |
| Interval vs interpolasi; timer HUD per frame | `interval langkah…`, `HUD: timer…` |
| Regresi 10 mode | `fuzz <mode>` ×10 |

## Menjalankan test
`npm test` (Node ≥ 20, tanpa dependensi tambahan). Helper menyalin `lib/` ke `node_modules/.cache/snake-tests` sebagai `.mjs`.

## Belum diverifikasi di browser
Dark veil (layer offscreen), garis tubuh 2P saat wrap, tombol Jeda & fokus dialog, swipe, `visibilitychange`/`blur`, tampilan di viewport nyata. Lihat laporan checkpoint.
