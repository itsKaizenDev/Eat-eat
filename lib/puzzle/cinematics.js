export const ARENA_TRANSITION_MS = 1050;
export const ARRIVAL_MS = 1050;
export const DESCENT_FADE_MS = 380;

function withImages(folder, frames) {
  return frames.map((frame, index) => ({
    ...frame,
    image: '/assets/dungeon/' + folder + '/' + String(index + 1).padStart(2, '0') + '.webp',
  }));
}

const storyArt = '/assets/dungeon/story/';
const opening = [
  { image: storyArt + 'apple.webp', ms: 2400, tone: 'dawn', text: 'Ular berjalan santai di tepi hutan. Ia membawa apel emas kesukaannya.' },
  { image: storyArt + 'theft.webp', ms: 2600, tone: 'dawn', motion: 'snap', text: 'Larry menyambar apel emas dan melesat ke tangga reruntuhan.' },
  { image: storyArt + 'dungeon.webp', ms: 2650, motion: 'breathe', text: 'Ular mengejar Larry sampai ke bawah tanah. Ia menelan ludah. Ada mata mengawasinya dari kegelapan.' },
  { image: storyArt + 'dungeon.webp', ms: 2900, focus: 'shard', text: 'Pecahan relik menyala di kaki tangga. Kumpulkan pecahannya untuk membuka jalan ke ruang berikutnya.' },
];
const returnShots = [
  { image: '/assets/dungeon/pulang/01.webp', ms: 1850, text: 'Raja Bara tumbang. Mahkotanya membuka jalan keluar dari Neraka.' },
  { image: '/assets/dungeon/pulang/03.webp', ms: 1800, motion: 'rise', text: 'Ular mendaki saat suara lahar perlahan menjauh.' },
  { image: '/assets/dungeon/pulang/05.webp', ms: 2050, tone: 'dawn', cue: 'surfaceDawn', text: 'Di mulut gua, udara pagi menyambutnya.' },
  { image: storyArt + 'forest.webp', ms: 2550, tone: 'dawn', motion: 'snap', text: 'Larry menoleh sambil menyeringai. Apel emas masih di mulutnya.' },
  { image: storyArt + 'animals.webp', ms: 2800, tone: 'dawn', motion: 'snap', text: 'Larry kabur ke tengah hutan. Ular menyusul, dan hewan-hewan yang terusik mulai menyerang.' },
];

export const CINEMATICS = {
  opening: { title: 'Apel Emas', frames: opening },
  ascentStory: { title: 'Jejak Larry', openingCue: 'riftRise', frames: returnShots },
  descent: {
    title: 'Gerbang Neraka',
    openingCue: 'riftCrack',
    frames: withImages('turun', [
      { ms: 1300, motion: 'reveal', text: 'Relik Agung akhirnya di tangan.' },
      { ms: 1450, motion: 'rumble', text: 'Cahaya merah menyusup dari sela batu.' },
      { ms: 1350, motion: 'rumble', cue: 'riftCrack', text: 'Lantai runtuh di bawah ular.' },
      { ms: 1450, motion: 'drop', cue: 'descent', text: 'Ular dan reliknya jatuh bersama reruntuhan.' },
      { ms: 1450, motion: 'drop', text: 'Cahaya Dungeon menghilang di atas.' },
      { ms: 1600, motion: 'drop', text: 'Jauh di bawah, lahar menerangi dinding jurang.' },
      { ms: 1650, motion: 'rumble', cue: 'riftLand', text: 'Ular mendarat di atas batu yang panas.' },
      { ms: 2150, motion: 'breathe', text: 'Di balik gerbang, sesuatu menunggu.' },
    ]),
  },
  ascent: {
    title: 'Ular pulang',
    button: 'Kembali ke menu',
    openingCue: 'riftRise',
    frames: [
      ...returnShots.slice(0, 3),
      { image: '/assets/dungeon/pulang/06.webp', ms: 2400, tone: 'dawn', cue: 'surfacePeace', text: 'Ular beristirahat di tepi kolam.' },
    ],
  },
};

export function cinematicFrame(movie, elapsedMs) {
  let remaining = elapsedMs - ARENA_TRANSITION_MS;
  if (remaining < 0) return -1;
  for (let i = 0; i < movie.frames.length; i++) {
    if (remaining < movie.frames[i].ms) return i;
    remaining -= movie.frames[i].ms;
  }
  return movie.frames.length;
}
