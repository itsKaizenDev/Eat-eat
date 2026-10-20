// Satu tempat buat semua urusan "scene" menu: gambar bg, urutan geser, warna aksen,
// posisi crop, dan partikel ambient per mode. Dipakai BackgroundLayer, Overlay, LoadingScreen.

export const BG = {
  classic: '/assets/game/bg-classic.webp',
  classicnight: '/assets/game/bg-classicnight.webp',
  portal: '/assets/game/bg-portal.webp',
  timeattack: '/assets/game/bg-timeattack.webp',
  mayhem: '/assets/game/bg-mayhem.webp',
  mayhemplus: '/assets/game/bg-mayhemplus.webp',
  mayhemhard: '/assets/game/bg-mayhemhard.webp',
  impossible: '/assets/game/bg-impossible.webp',
  multiplayer: '/assets/game/bg-multiplayer.webp',
  mayhemduo: '/assets/game/bg-mayhemduo.webp',
  puzzle: '/assets/game/bg-puzzle.webp',
  delivery: '/assets/game/bg-delivery.webp',
  roguelite: '/assets/game/bg-roguelite.webp',
  territory: '/assets/game/bg-territory.webp',
  boss: '/assets/game/bg-boss.webp',
};

// Urutan "kanonik": pindah ke mode yang lebih kanan di daftar ini = scene baru
// menyabet masuk dari kanan (dan sebaliknya).
export const ORDER = ['classic', 'classicnight', 'portal', 'timeattack', 'mayhem', 'mayhemplus', 'mayhemhard', 'impossible', 'multiplayer', 'mayhemduo', 'puzzle', 'delivery', 'roguelite', 'boss', 'territory'];

// Warna aksen per mode: dipakai flash, garis slash, speed lines, glow tombol aktif, judul mode.
export const ACCENT = {
  classic: '#9be04a',
  classicnight: '#7fb0ff',
  portal: '#b77bff',
  timeattack: '#ffc94a',
  mayhem: '#ff8a3d',
  mayhemplus: '#ff5a36',
  mayhemhard: '#ff8f1f',
  impossible: '#ff3b4d',
  multiplayer: '#ffd84a',
  mayhemduo: '#ff9f43',
  puzzle: '#6ed3ff',
  delivery: '#ffb347',
  roguelite: '#7ee081',
  territory: '#8fd13f',
  boss: '#ffa94d',
};

// background-position per mode. Di layar lebar (HP landscape) gambar ke-crop atas-bawah,
// jadi geser sedikit ke bawah supaya maskot + objek utama tetap kelihatan.
export const POS = {
  classic: '50% 70%',
  classicnight: '50% 70%',
  portal: '50% 62%',
  timeattack: '58% 62%',
  mayhem: '50% 72%',
  mayhemplus: '50% 72%',
  mayhemhard: '50% 72%',
  impossible: '50% 72%',
  multiplayer: '50% 72%',
  mayhemduo: '50% 72%',
  puzzle: '50% 50%',
  delivery: '50% 60%',
  roguelite: '50% 60%',
  territory: '50% 55%',
  boss: '50% 55%',
};

// Partikel ambient (canvas ringan). kind: pollen | firefly | suck | dust | ember | ash | sparkle
export const FX = {
  classic:      { kind: 'pollen',  n: 26, colors: ['#fffbe0', '#ffe98a', '#ffffff'] },
  classicnight: { kind: 'firefly', n: 22, colors: ['#fff59a', '#d6ff7a'] },
  portal:       { kind: 'suck',    n: 40, colors: ['#c58bff', '#7f5bff', '#ff8be9'], cx: 0.5, cy: 0.42 },
  timeattack:   { kind: 'dust',    n: 34, colors: ['#ffe08a', '#ffcf5a', '#fff3c4'] },
  mayhem:       { kind: 'ember',   n: 34, colors: ['#ffb347', '#ff7a2f', '#ffd76a'] },
  mayhemplus:   { kind: 'ember',   n: 44, colors: ['#ffd76a', '#ff5a36', '#ffb347'], fast: 1.3 },
  mayhemhard:   { kind: 'ember',   n: 44, colors: ['#ffb347', '#ff6a1f', '#ffdd55'], fast: 1.2 },
  impossible:   { kind: 'ash',     n: 44, colors: ['#ff3b3b', '#ff7a5a', '#a89a9a'] },
  multiplayer:  { kind: 'sparkle', n: 26, colors: ['#ffffff', '#ffe27a', '#9ff3ff'] },
  mayhemduo:    { kind: 'ember',   n: 34, colors: ['#ffc65a', '#ff8a3d', '#ffffff'] },
  puzzle:       { kind: 'dust',    n: 26, colors: ['#bfeaff', '#6ed3ff', '#ffffff'] },
  delivery:     { kind: 'pollen',  n: 22, colors: ['#ffe2a8', '#ffb347', '#ffffff'] },
  roguelite:    { kind: 'firefly', n: 24, colors: ['#d9ffb0', '#7ee081', '#ffffff'] },
  boss:         { kind: 'firefly', n: 20, colors: ['#ffe9a8', '#ffa94d', '#ffffff'] },
  territory:    { kind: 'sparkle', n: 24, colors: ['#bff08a', '#8fd13f', '#9ad7ff'] },
};

// HP (layar sentuh) pakai varian 960px (-m.webp): decode lebih ringan & hemat memori.
// Pemilihan varian untuk tampilan dilakukan di CSS (.bgimg-<mode>), ini cuma buat preload.
export const isCoarse = () => typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
export const bgFiles = () => Object.values(BG).filter(Boolean).map(src => (isCoarse() ? src.replace('.webp', '-m.webp') : src));
