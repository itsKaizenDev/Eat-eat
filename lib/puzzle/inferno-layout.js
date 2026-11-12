import { createRng } from '../sim/rng';

export const INFERNO_START = 51;
export const INFERNO_FINAL = 99;
export const INFERNO_REVISION = 11;

const districts = [
  { name: 'Penjara Abu', shape: 'Gerbang sel', rooms: ['Sel Terbakar', 'Gerbang Rantai', 'Lorong Abu'] },
  { name: 'Tambang Bara', shape: 'Galeri tambang', rooms: ['Galeri Obsidian', 'Tambang Arang', 'Jembatan Peleburan'] },
  { name: 'Katakomba Gema', shape: 'Katakomba', rooms: ['Kubur Bergema', 'Altar Retak', 'Ruang Bisikan'] },
  { name: 'Benteng Mahkota', shape: 'Benteng basalt', rooms: ['Barak Korup', 'Pelataran Hitam', 'Pintu Takhta'] },
];

function guard(route, stage, index, rng) {
  const [start, end] = route;
  const veteran = index === 0 || index >= 3;
  return {
    ...start, route, corrupted: true, role: index === 0 ? 'access' : 'corridor',
    awareness: veteran ? 'veteran' : 'rookie', kind: veteran ? 'runner' : 'scout',
    facing: Math.atan2(end.y - start.y, end.x - start.x),
    range: 3.55 + stage * .18, fov: Math.PI * .44,
    speed: 1.15 + stage * .12 + (veteran ? .12 : 0),
    dwell: .7 + rng() * .7, pause: .55 + rng() * 2.4,
    ...(stage >= 2 && index === 3 ? { specialty: 'warden' } : {}),
  };
}

export function infernoLayout(number, seed) {
  if (number < INFERNO_START || number >= INFERNO_FINAL) throw new RangeError('Ruang Neraka harus 51–98');
  const rng = createRng(seed);
  const offset = number - INFERNO_START;
  const stage = Math.floor(offset / 12);
  const district = districts[stage];
  const roomWidth = 7 + (stage >= 2 ? 1 : 0);
  const height = 17 + (stage % 2) * 2;
  const width = 3 * (roomWidth + 1) + 1;
  const lower = height - 7;
  const turn = offset % 3 === 1;
  const flipX = offset % 2 === 1;
  const flipY = offset % 4 >= 2;
  const cell = (x, y) => {
    const tx = flipX ? width - 1 - x : x;
    const ty = flipY ? height - 1 - y : y;
    return turn ? [ty, tx] : [tx, ty];
  };
  const point = (room, x, y) => {
    const [tx, ty] = cell(room * (roomWidth + 1) + x, y);
    return { x: tx + .5, y: ty + .5 };
  };
  const rows = Array.from({ length: turn ? width : height }, () => Array(turn ? height : width).fill('#'));
  function tile(room, x, y, value) {
    const [tx, ty] = cell(room * (roomWidth + 1) + x, y);
    rows[ty][tx] = value;
  }
  for (let room = 0; room < 3; room++) {
    for (let y = 1; y < height - 1; y++) for (let x = 1; x <= roomWidth; x++) tile(room, x, y, '.');
    const divider = 7 + (height - 17) / 2 + Math.floor(rng() * 2);
    const open = 2 + Math.floor(rng() * (roomWidth - 3));
    for (let x = 1; x <= roomWidth; x++) {
      if (x === open || x === open + 1 || (stage >= 1 && x === (open > 3 ? 1 : roomWidth))) continue;
      tile(room, x, divider, '#');
    }
    // Broken basalt columns block vision without closing the room's two approaches.
    tile(room, 2 + Math.floor(rng() * 4), 6, rng() < .5 ? 'C' : '#');
    tile(room, 2 + Math.floor(rng() * 4), height - 5, rng() < .5 ? 'C' : '#');
    if (rng() < .5) tile(room, 1, 1, '#');
    if (rng() < .5) tile(room, roomWidth, height - 2, '#');
  }

  const upperGate = 4 + Math.floor(rng() * 2);
  const lowerGate = lower + Math.floor(rng() * 2);
  tile(0, roomWidth + 1, upperGate, '.');
  tile(1, roomWidth + 1, lowerGate, '.');
  const lockedGate = offset % 3 === 0 ? 0 : 1;
  const useLever = offset % 2 === 1;
  const gate = {
    id: 'inferno-gate',
    ...point(lockedGate, roomWidth + 1, lockedGate === 0 ? upperGate : lowerGate),
    kind: useLever ? 'lever' : 'key', key: 'a', label: 'A',
  };
  const keyPoint = point(0, 2 + Math.floor(rng() * 3), height - 2);
  const spawn = point(0, 1, height - 2);
  const exit = point(2, roomWidth - 1, height - 2);

  const lane = (room, y, id) => {
    const home = point(room, 1, y), next = point(room, 2, y);
    return { id, kind: 'shadow', ...home, dx: next.x - home.x, dy: next.y - home.y,
      length: roomWidth - 1, speed: 8 + stage * .55, windup: 1.28 - stage * .09, entrance: 'wall' };
  };
  const chest = (room, x, y, id) => {
    tile(room, x, y, 'C');
    return { id, kind: 'mimic', ...point(room, x, y), mouth: point(room, x + 1, y),
      trigger: 1.5, reach: 1.15, windup: .98 - stage * .06, recover: 2.2 };
  };
  const echo = (room, x, y, id) => ({
    id, kind: 'echo', ...point(room, x, y), hearing: 6.8 + stage * .35,
    strike: .95 + stage * .08, windup: 1.25 - stage * .09, recover: 3.4 - stage * .25,
  });

  const beasts = [
    chest(0, 3, 2, 'inferno-mimic'),
    lane(1, 2, 'inferno-shadow'),
    { id: 'inferno-spider', kind: 'spider', ...point(1, roomWidth - 1, height - 3),
      web: 1.9 + stage * .1, strike: .64, windup: 1.08, recover: 2.8 },
    echo(2, roomWidth - 2, 2, 'inferno-echo'),
  ];
  if (stage >= 1) beasts.push(echo(0, roomWidth - 1, height - 3, 'inferno-echo-entrance'));
  if (stage >= 2) beasts.push(chest(2, 2, height - 3, 'inferno-mimic-exit'));
  if (stage >= 3) beasts.push(lane(2, 4, 'inferno-shadow-throne'));

  const patrols = [
    [point(0, 2, 4), point(0, roomWidth - 1, 4)],
    [point(1, 2, lower), point(1, 5, lower)],
    [point(2, 2, 6), point(2, roomWidth - 1, 6)],
    [point(2, 2, lower), point(2, roomWidth - 1, lower)],
  ];
  if (stage >= 1) patrols.push([point(1, 2, 5), point(1, roomWidth - 1, 5)]);
  if (stage >= 3) patrols.push([point(0, 2, lower), point(0, 4, lower)]);
  // Keep patrol tiles clear of decorative rubble, including tiles between endpoints.
  for (const [a, b] of patrols) {
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
    const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let i = 0; i <= steps; i++) rows[Math.floor(a.y + dy * i)][Math.floor(a.x + dx * i)] = '.';
  }
  const guards = patrols.map((route, i) => guard(rng() < .5 ? route : [...route].reverse(), stage, i, rng));
  const dogHome = point(1, 1, height - 3);
  const dogs = [{
    ...dogHome, route: [dogHome], facing: 0,
    range: 3.25 + stage * .2, speed: 4.7 + stage * .15, tethered: true, leash: 1.6,
  }];
  const loot = [
    { id: 'inferno-coin-a', ...point(0, 1, 2), kind: 'loot', value: 3 + stage },
    { id: 'inferno-coin-b', ...point(1, roomWidth, height - 4), kind: 'loot', value: 4 + stage },
    { id: 'inferno-coin-c', ...point(2, roomWidth, 3), kind: 'loot', value: 5 + stage },
  ];
  const artifacts = [{ id: 'inferno-relic-a', ...point(2, 2, 2), kind: 'artifact', value: 3 + stage }];
  if (stage >= 1) artifacts.unshift({ id: 'inferno-relic-b', ...point(1, roomWidth - 1, 6), kind: 'artifact', value: 2 + stage });
  const hides = [
    { id: 'inferno-hide-a', ...point(0, 1, height - 4) },
    { id: 'inferno-hide-b', ...point(1, 1, 4) },
    { id: 'inferno-hide-c', ...point(2, roomWidth, lower + 1) },
  ];
  const hazards = [
    { id: 'inferno-spikes-a', ...point(0, 5, height - 4), kind: 'spikes', period: 5.2, active: 1.2, phase: rng() * 4 },
    { id: 'inferno-spikes-b', ...point(1, roomWidth - 1, lower + 1), kind: 'spikes', period: 5, active: 1.35, phase: rng() * 4 },
    { id: 'inferno-spikes-c', ...point(2, 5, height - 3), kind: 'spikes', period: 4.8, active: 1.35, phase: rng() * 4 },
  ];
  for (const p of [spawn, exit, keyPoint, ...artifacts, ...loot, ...hides, ...hazards]) rows[Math.floor(p.y)][Math.floor(p.x)] = '.';
  const name = number === INFERNO_START ? 'Mulut Neraka' : district.rooms[offset % district.rooms.length] + ' ' + (Math.floor(offset % 12 / 3) + 1);
  return {
    id: 'inferno-' + number, number, name, chapter: 'inferno', tier: district.name, shapeLabel: district.shape,
    revision: INFERNO_REVISION, tutorial: false, width: rows[0].length, height: rows.length,
    map: rows.map(row => row.join('')), spawn, exit, flow: 'extraction',
    keys: useLever ? [] : [{ id: 'inferno-key', ...keyPoint, kind: 'key', key: 'a' }],
    levers: useLever ? [{ id: 'inferno-lever', ...keyPoint, doors: [gate.id], label: 'A' }] : [],
    doors: [gate], plates: [], artifacts, loot, hides,
    shadows: [...hides, spawn].map(p => ({ ...p, radius: 1.1 })),
    guards, dogs, beasts, hazards, crystals: [], torches: [], portals: [], bells: [], transitions: [],
    gadgets: ['stone', 'smoke', 'trap'], par: 230 + stage * 25,
    goal: 'Buka gerbang, ambil relik bara, lalu cari jalan keluar di sisi lain.',
    tip: number === INFERNO_START
      ? 'Pemakan Gema memburu suara lari, batu, dan gonggongan. Lingkaran ungu mengunci titik serang. Endap atau lempar batu untuk memancingnya.'
      : 'Penjaga korup masih bisa dipancing ke monster dan duri. Baca rute mereka sebelum menyeberang.',
  };
}
