const stages = [
  ['Jejak di Semak', 'Kumbang yang terusik mengejar ular. Usir lalu ikuti jejak Larry.'],
  ['Akar Tumbang', 'Ikuti jejak apel di balik akar. Lewati satwa di jalan.'],
  ['Rimbun Berduri', 'Buka jalan melewati penghuni semak.'],
  ['Lintasan Babi Hutan', 'Hadapi babi hutan. Menyamping saat ia bersiap menerjang.'],
  ['Sungai Dangkal', 'Waspadai arus yang menutup jalur secara berkala.'],
  ['Celah Pohon Tua', 'Jejak Larry membelok di antara batang tumbang.'],
  ['Sarang Kumbang', 'Gunakan semburan bisa saat beberapa hewan mendekat.'],
  ['Daun yang Bergerak', 'Belalang pemburu mengintai di sela dedaunan.'],
  ['Jalur Serbuk', 'Amati jalur duri sambil menjauh dari tembakan spora.'],
  ['Gerbang Rimba', 'Taklukkan Penjaga Akar untuk mencapai rawa.'],
  ['Tepi Rawa', 'Ikuti kilau apel di antara gelagah.'],
  ['Rawa Beriak', 'Amankan jalur sebelum menyeberangi lumpur.'],
  ['Sarang Katak', 'Hindari lidah katak dan tanda tempat ia akan mendarat.'],
  ['Kabut Spora', 'Cari celah aman di antara tembakan spora.'],
  ['Jalur Kayu Apung', 'Seberangi jalur kayu dan jangan sampai terpojok.'],
  ['Lumpur Dalam', 'Jalur menuju Larry dijaga penghuni rawa.'],
  ['Jamur Parasit', 'Hancurkan simpul pelindung sebelum menyerang jamur.'],
  ['Kelokan Gelagah', 'Duri dan satwa menutup pendekatan terakhir.'],
  ['Jejak Apel Emas', 'Jejak Larry berhenti di sarang paling dalam.'],
  ['Sarang Larry', 'Taklukkan Larry dalam tiga fase, lalu rebut kembali apel emas.'],
];

const duels = {
  4: ['boar', 'Babi Hutan Berzirah', [72]],
  8: ['mantis', 'Belalang Pemburu', [90]],
  10: ['root', 'Penjaga Akar', [95, 115, 135]],
  13: ['frog', 'Katak Rawa', [110]],
  17: ['fungus', 'Jamur Parasit', [128]],
  20: ['larry', 'Larry · Pencuri Apel Emas', [130, 160, 200]],
};

function buildStage([name, goal], index) {
  const number = index + 1;
  const region = number <= 10 ? 0 : 1;
  const id = 'story-exp-' + number;
  const width = 23 + 2 * (index % 3);
  const height = 19 + index % 4;
  const middle = (width - 1) / 2;
  const map = Array.from({ length: height }, () => Array(width).fill('#'));
  for (let y = 3; y < height - 4; y++) {
    for (let x = 2; x < width - 2; x++) map[y][x] = '.';
  }
  for (const y of [1, 2, height - 4, height - 3, height - 2]) {
    for (let x = middle - 1; x <= middle + 1; x++) map[y][x] = '.';
  }
  const duel = duels[number];
  const arena = { x: 2, y: 3, w: width - 4, h: height - 7 };
  const encounters = duel ? [{
    id: id + '-duel', type: duel[0], name: duel[1], hp: duel[2], kind: duel[2].length > 1 ? 'boss' : 'mini',
    index: 0, region, arena, x: middle + .5, y: 7.5, shrine: { x: middle + .5, y: height - 6.5 },
  }] : [];
  if (duel) {
    const alcove = 4 + index % 7;
    map[alcove][1] = '.';
    map[alcove + 1][width - 2] = '.';
  } else {
    const left = 3 + index % 4;
    const right = width - 5 - index % 3;
    if (region === 1) map[4][3 + index % 4] = '#';
    for (const [x, y] of [[left, 6], [left + 1, 6], [right, 9], [right, 10], [3 + (index * 3) % (middle - 5), height - 7]]) map[y][x] = '#';
  }

  const mobs = duel ? [] : Array.from({ length: number === 1 ? 1 : Math.min(4, 2 + Math.floor(index / 7)) }, (_, i) => {
    const [x, y] = [[middle, height - 8], [middle - 4, 8], [middle + 4, 6], [middle, 5]][i];
    map[y][x] = '.';
    const ranged = index >= 4 && (i + index) % 3 === 0;
    return { id: id + '-mob-' + i, type: ranged ? 'spitter' : 'crawler', name: ranged ? 'Kumbang Spora' : 'Kumbang Rimba', x: x + .5, y: y + .5, hp: 18 + index + i * 3 };
  });
  const avoid = [2, 6, 11, 15].includes(number);
  const required = duel ? encounters.map(e => e.id) : avoid ? [] : mobs.map(m => m.id);
  const traps = !duel && number >= 5 ? [{
    id: id + '-duri', offset: index % 6, period: 8.5, rest: 6.2, warning: 1.4, active: .9, damage: 10 + region * 4,
    tiles: Array.from({ length: 5 }, (_, i) => ({ x: middle - 2 + i, y: height - 9 })),
  }] : [];
  const mud = region === 1 && !duel
    ? Array.from({ length: 3 }, (_, i) => ({ x: middle + i - 1, y: 8 + index % 2 }))
    : [];
  const start = { x: middle + .5, y: height - 2.5 };
  const camp = { ...start, id: id + '-entry', name: 'Pijakan Aman' };
  const loot = [];
  if (number === 20) loot.push({ id: id + '-cache', kind: 'cache', x: middle + .5, y: height - 4.5 });
  else if (number > 1 && !duel) loot.push({
    id: id + '-food', kind: number % 5 === 0 ? 'herb' : 'food', x: middle - 3.5, y: height - 5.5,
  });
  return {
    id, number, name, goal, region, width, height, map: map.map(row => row.join('')), start, rooms: [arena],
    exit: { x: middle + .5, y: 1.5 }, camps: [camp], loot, mobs, traps, mud, encounters, required,
  };
}

export const EXPEDITION_STAGES = stages.map(buildStage);
export const EXPEDITION_LENGTH = EXPEDITION_STAGES.length;
