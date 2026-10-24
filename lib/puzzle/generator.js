// Authored floorplans and mission briefs, not random mazes. All coordinates are tile centres.
export const CAMPAIGN_REVISION = 7;
export const MAX_LEVEL = 50;
export const TUTORIAL_COUNT = 5;
export const TIERS = [
  { from: 1, to: 5, name: 'Dasar Penyusupan' }, { from: 6, to: 15, name: 'Lorong Bayangan' },
  { from: 16, to: 25, name: 'Mesin Kuno' }, { from: 26, to: 35, name: 'Cahaya & Bayangan' },
  { from: 36, to: 45, name: 'Benteng Terjaga' }, { from: 46, to: 50, name: 'Pencurian Terakhir' },
];
export const tierOf = n => TIERS.find(t => n >= t.from && n <= t.to);

// ---- Level plan: roster, monsters, cameras and map growth for all 50 missions. ----
export const ROLE_LABELS = { relic: 'Penjaga Relik', corridor: 'Patroli Koridor', access: 'Penjaga Akses', investigator: 'Penyisir' };
const ENVELOPES = [[1, 5, [13, 11], [15, 13]], [6, 10, [15, 13], [17, 15]], [11, 19, [17, 15], [21, 17]], [20, 29, [21, 17], [23, 21]], [30, 39, [23, 21], [27, 23]], [40, 50, [27, 23], [29, 25]]];
const odd = v => { v = Math.round(v); return v % 2 ? v : v + 1; };
export function envelopeOf(n) {
  const [a, b, from, to] = ENVELOPES.find(([lo, hi]) => n >= lo && n <= hi), t = (n - a) / Math.max(1, b - a);
  return { width: odd(from[0] + (to[0] - from[0]) * t), height: odd(from[1] + (to[1] - from[1]) * t) };
}
// Usable floor (rooms + corridors + vault) must rise every level; a variant lands within +-2 tiles of this target.
export const AREA_TOLERANCE = 2;
export const areaTarget = n => Math.round(64 + 5.2 * (n - 1));
export const cameraCap = n => n < 10 ? 0 : n < 20 ? 1 : n < 35 ? 2 : n < 45 ? 3 : 4;
export const cameraCount = n => n < 10 ? 0 : Math.min(cameraCap(n), n >= 35 ? 2 : 1 + Math.floor((n - 10) / 6));
// Once introduced, each monster is present in every variant of later missions.
export function monsterSlots(n) {
  return [...(n >= 30 ? ['shadow'] : []), ...(n >= 36 ? ['mimic'] : []), ...(n >= 40 ? ['spider'] : [])];
}
export function levelPlan(n) {
  if (!Number.isInteger(n) || n < 1 || n > 50) throw new RangeError('Nomor misi harus 1–50');
  const roles = [], add = (role, count) => { for (let i = 0; i < count; i++) roles.push(role); };
  add('relic', n >= 45 ? 2 : 1); add('corridor', n < 3 ? 0 : n < 11 ? 1 : n < 40 ? 2 : 3);
  add('access', n < 6 ? 0 : n < 25 ? 1 : 2); add('investigator', n >= 16 ? 1 : 0);
  const fast = n < 20 ? 0 : n < 30 ? 1 : n < 45 ? 2 : 3;
  return { number: n, ...envelopeOf(n), area: areaTarget(n), roles, humans: roles.length, fast,
    dogs: { tethered: n >= 35 ? 1 : 0, free: n < 35 ? 0 : 1 }, monsters: monsterSlots(n), cameras: cameraCount(n) };
}
const P = (x, y) => ({ x: x + .5, y: y + .5 });
// Each plan specifies a distinct room topology: walls [x1,y1,x2,y2], openings and cover.
const PLANS = [
  { walls: [[6, 1, 6, 10], [7, 6, 13, 6]], gaps: [[6, 3], [6, 9], [9, 6]], cover: [[3, 6], [10, 9]] },
  { walls: [[5, 1, 5, 8], [5, 8, 12, 8], [10, 1, 10, 6]], gaps: [[5, 3], [8, 8], [10, 4]], cover: [[3, 5], [12, 6]] },
  { walls: [[3, 5, 11, 5], [7, 5, 7, 11]], gaps: [[5, 5], [10, 5], [7, 9]], cover: [[5, 8], [11, 8]] },
  { walls: [[5, 3, 11, 3], [5, 3, 5, 9], [5, 9, 11, 9], [11, 3, 11, 9]], gaps: [[7, 3], [5, 6], [9, 9], [11, 6]], cover: [[8, 6]] },
  { walls: [[4, 1, 4, 8], [8, 4, 8, 11], [12, 1, 12, 8]], gaps: [[4, 3], [8, 8], [12, 5]], cover: [[6, 6], [10, 3]] },
  { walls: [[2, 4, 10, 4], [5, 8, 13, 8], [7, 4, 7, 8]], gaps: [[4, 4], [9, 8], [7, 6]], cover: [[11, 6], [3, 8]] },
  { walls: [[5, 1, 5, 11], [9, 3, 13, 3], [9, 9, 13, 9]], gaps: [[5, 2], [5, 6], [5, 10], [11, 3], [11, 9]], cover: [[8, 5], [8, 7]] },
  { walls: [[3, 3, 11, 3], [3, 3, 3, 9], [3, 9, 11, 9], [7, 6, 13, 6]], gaps: [[6, 3], [3, 6], [8, 9], [10, 6]], cover: [[5, 7], [11, 5]] },
  { walls: [[4, 4, 6, 4], [9, 4, 12, 4], [4, 8, 6, 8], [9, 8, 12, 8], [8, 5, 8, 7]], gaps: [], cover: [[3, 6], [12, 6], [6, 6], [10, 6]] },
  { walls: [[4, 2, 4, 10], [8, 1, 8, 9], [12, 2, 12, 11]], gaps: [[4, 4], [4, 9], [8, 3], [8, 7], [12, 5], [12, 10]], cover: [[6, 9], [10, 2]] },
];
// Name, plan, vault entry row, start side, key anchor, lever anchor.
// These are explicit tactical variations: entrance, objective order and return route differ.
const BRIEFS = [
  ['Langkah Pertama',0,3,0,0,0], ['Di Balik Sorot',2,3,0,0,0], ['Ceruk Sunyi',3,9,1,0,0], ['Pintu Kuningan',1,4,0,1,0], ['Batu Pengalih',5,9,1,2,0],
  ['Gudang Barat',0,3,0,1,0], ['Lorong Dua Arah',1,9,1,0,0], ['Galeri Tua',2,3,0,2,0], ['Halaman Dalam',3,9,1,1,0], ['Tiga Sekat',4,5,0,2,0],
  ['Jalur Memutar',5,9,1,0,0], ['Sayap Perpustakaan',6,3,0,2,0], ['Ruang Tapal Kuda',7,9,1,1,0], ['Pilar Kembar',8,3,0,0,0], ['Jalan Berliku',9,10,1,2,0],
  ['Tuas Pertama',0,9,0,1,2], ['Roda Kuningan',1,3,1,2,0], ['Dua Ruang Terhubung',2,9,0,0,1], ['Jantung Halaman',3,3,1,2,0], ['Pelat Berwaktu',4,9,0,1,2],
  ['Lonceng Penjaga',5,3,1,2,1], ['Jendela Kesempatan',6,9,0,0,2], ['Sirkuit Kuno',7,3,1,2,0], ['Pilar dan Tuas',8,9,0,1,2], ['Gerbang Terakhir',9,3,1,0,1],
  ['Sorot Obor',0,3,1,2,0], ['Kristal Pengawas',1,9,0,1,2], ['Bayang Bergerak',2,3,1,0,2], ['Lingkar Cahaya',3,9,0,2,1], ['Lorong Berasap',4,5,1,0,2],
  ['Denting Malam',5,9,0,1,2], ['Ruang Cermin',6,3,1,2,0], ['Jembatan Sunyi',7,9,0,0,1], ['Mata Zamrud',8,3,1,2,0], ['Jejak Terakhir',9,10,0,1,2],
  ['Benteng Utara',0,9,1,0,2], ['Gerbang Tanpa Paritas',1,3,0,2,1], ['Dua Penjaga',2,9,1,1,0], ['Ruang Segel',3,3,0,0,2], ['Lintasan Rahasia',4,9,1,2,1],
  ['Tiga Persimpangan',5,3,0,0,1], ['Menara Pengawas',6,9,1,1,2], ['Portal Benteng',7,3,0,2,1], ['Hening di Antara Pilar',8,9,1,0,2], ['Malam di Benteng',9,3,0,2,1],
  ['Dua Relik',2,9,0,2,0], ['Jalur Penyelundup',7,3,1,1,2], ['Segel Raja',4,9,0,0,1], ['Ruang Mahkota',8,9,1,2,1], ['Bayangan Terakhir',9,3,0,1,0],
];
function floorPoint(map, x, y, used = new Set()) {
  const spots = [];
  for (let cy = 1; cy < map.length - 1; cy++) for (let cx = 1; cx < 14; cx++) if (map[cy][cx] === '.' && !used.has(`${cx},${cy}`)) spots.push({ x: cx, y: cy, d: Math.abs(cx - x) + Math.abs(cy - y) });
  const a = spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x)[0];
  used.add(`${a.x},${a.y}`); return P(a.x, a.y);
}
export function missionSpec(n) {
  if (!Number.isInteger(n) || n < 1 || n > 50) throw new RangeError('Nomor misi harus 1–50');
  const [name, planIndex, entryY, reverse, keyAnchor, leverAnchor] = BRIEFS[n - 1];
  const width = 19, height = 13, plan0 = PLANS[planIndex], plan = levelPlan(n);
  const map = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.'));
  for (const [x1, y1, x2, y2] of plan0.walls) for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) map[y][x] = '#';
  plan0.gaps.forEach(([x,y]) => { map[y][x] = '.'; }); plan0.cover.forEach(([x,y]) => { map[y][x] = 'C'; });
  for (let y = 1; y <= 11; y++) map[y][14] = '#'; map[entryY][14] = '.'; map[entryY][13] = '.';
  // Later vaults have an optional timed shortcut; the lever-controlled main route always remains available.
  const shortcutY = entryY < 6 ? 10 : 2;
  if (n >= 20) { map[shortcutY][14] = '.'; map[shortcutY][13] = '.'; }
  const used = new Set([`13,${entryY}`, `13,${shortcutY}`]), spawn = floorPoint(map, 2, reverse ? 10 : 2, used);
  const exit = { ...spawn }, anchors = [[3, 9], [9, 2], [10, 10]];
  const locked = n >= 4, machinery = n >= 16;
  const keys = locked ? [{ id: 'key-a', ...floorPoint(map, ...anchors[keyAnchor], used), key: 'a', kind: 'key' }] : [];
  const doors = locked ? [{ id: 'vault', ...P(14, entryY), kind: 'key', key: 'a' }] : [];
  const levers = [];
  if (machinery) {
    // Two gates in series: the key opens the vestibule, the lever opens the inner vault.
    for (let y = 1; y <= 11; y++) map[y][16] = '#'; map[entryY][16] = '.';
    doors.push({ id: 'seal', ...P(16, entryY), kind: 'lever', label: 'A' });
    levers.push({ id: 'lever-a', ...floorPoint(map, ...anchors[leverAnchor], used), label: 'A', doors: ['seal'] });
    if (n >= 46) {
      // Wide escape pockets: the vault patrol must never form an unavoidable one-tile plug.
      for (const y of [2, 5, 8, 10].filter(y => y !== entryY)) {
        map[y][16] = '.'; const id = `seal-${y}`;
        doors.push({ id, ...P(16, y), kind: 'lever', label: 'A' }); levers[0].doors.push(id);
      }
    }
  }
  const plates = n >= 20 ? [{ id: 'plate-a', ...P(13, shortcutY), door: 'shortcut', duration: n === 37 ? 10 : 7 }] : [];
  if (plates.length) doors.push({ id: 'shortcut', ...P(14, shortcutY), kind: 'plate', label: 'P' });
  const artifacts = [{ id: 'relic-a', ...P(17, entryY < 6 ? 2 : 10), kind: 'artifact' }];
  if (n >= 46) artifacts.push({ id: 'relic-b', ...floorPoint(map, 7, reverse ? 2 : 10, used), kind: 'artifact' });
  const loot = [
    { id: 'loot-a', ...floorPoint(map, 3, reverse ? 2 : 10, used), kind: 'loot' },
    { id: 'loot-b', ...floorPoint(map, 11, reverse ? 10 : 2, used), kind: 'loot' },
    ...(n >= 10 ? [{ id: 'loot-c', ...P(15, entryY < 6 ? 10 : 2), kind: 'loot' }] : []),
  ];
  const hides = [[2,6], [9,6], [13, entryY]].map(([x,y], i) => ({ id: `hide-${i}`, ...floorPoint(map, x, y, used) }));
  const shadows = [...hides.map(h => ({ ...h, radius: 1.1 })), { ...spawn, radius: 1.05 }];
  const guardCount = plan.humans;
  const guards = [];
  // Routes are authored patrol regions. BFS joins their two/three waypoints around each floorplan.
  const regions = [[9,7,12,9], [3,7,5,10], [11,2,13,4], [15,3,15,9]];
  for (let i = 0; i < guardCount; i++) {
    const [ax,ay,bx,by] = regions[i % regions.length];
    const a = floorPoint(map, ax, ay, used);
    const b = floorPoint(map, bx, by, used);
    guards.push({ ...a, facing: reverse ? 0 : Math.PI / 2, route: reverse ? [b,a] : [a,b], range: n < 6 ? 3.0 : 3.5 + Math.min(.7, n / 80), fov: Math.PI * .46, speed: n < 6 ? .7 : .82 + n / 230, dwell: 1.1, pause: 1 + i * .7, kind: i % 2 ? 'warden' : 'scout', role: plan.roles[i] });
  }
  const torches = n >= 26 ? [{ ...floorPoint(map, 9, 3, used), range: 4, fov: .9, facing: Math.PI / 2, rate: .6, phase: n % 4 }] : [];
  const crystals = n >= 27 ? [{ id: 'eye-a', ...P(15, 6), range: 4.5, fov: .7, facing: -Math.PI / 2, baseFacing: -Math.PI / 2, rate: .45, phase: n % 3, sweep: 1.1 }] : [];
  const bells = n >= 21 ? [{ ...floorPoint(map, 11, 7, used) }] : [];
  const portals = n >= 40 ? [{ id: 'portal-a', ...floorPoint(map, 2, reverse ? 3 : 9, used), pair: 'portal-b', label: 'I' }, { id: 'portal-b', ...floorPoint(map, 12, reverse ? 9 : 3, used), pair: 'portal-a', label: 'I' }] : [];
  const tips = [
    'Tahan WASD/panah atau joystick. Ambil relik biru, lalu kembali ke lingkar pintu hijau.',
    'Perhatikan kerucut pandang. Tahan Shift untuk mengendap; dinding dan peti memutus pandangan.',
    'Ceruk ungu bertanda F bisa menyembunyikanmu. Jangan masuk saat sedang dilihat penjaga.',
    'Ambil kunci A, dekati pintu A, lalu tekan E. Relik ada di baliknya.',
    'Hadap ke lokasi kosong lalu Q untuk melempar batu. X memilih asap atau trap. Tiap alat siap lagi dalam 10 detik.',
  ];
  const tip = tips[n - 1] || (n >= 35 ? 'Anjing terikat dibatasi rantai; anjing lepas mengejar cepat. Gonggongan memanggil penjaga. Bayangan menerjang lurus dan memakan siapa pun.' : n >= 30 ? 'Bayangan di dinding/pintu palsu menerjang jalur tetap setelah garis merah menyala. Bergerak ke samping; trap bisa menahannya.' : n >= 20 && n < 26 ? 'Penjaga merah bergerak 18% lebih cepat. Duri lantai menyala berkala; tunggu padam atau cari jalan samping.' : n === 37 ? 'Gerbang P terbuka 10 detik setelah pelat diinjak, lalu menetap terbuka saat dilewati. Tuas A juga membuka jalur utama.' : n >= 46 ? 'Dua relik wajib dibawa pulang. Bonus dan jalur portal memberi pilihan rute.' : n >= 27 ? 'Sorot kristal memicu alarm. Asap memutus penglihatan; obor mempercepat deteksi penjaga.' : n >= 20 ? 'Pelat P membuka pintasan sementara. Lewati gerbang agar menetap terbuka; jalur utama tetap tersedia.' : n >= 16 ? 'Tuas A membuka segel A permanen. Kunci A membuka pintu luar.' : 'Pilih celah patroli. Koin emas opsional; relik biru wajib dibawa keluar.');
  return { id: n <= 5 ? `jk-${n}` : `gen-${n}`, name, revision: CAMPAIGN_REVISION, number: n, tier: tierOf(n).name, tutorial: n <= 5,
    plan, width, height, map: map.map(r => r.join('')), spawn, exit, keys, doors, levers, plates, artifacts, loot, hides, shadows, guards, torches, crystals, bells, portals,
    gadgets: { stone: 1, smoke: 1, trap: 1, cooldown: 10 }, par: n < 6 ? 120 : n < 16 ? 180 : n < 36 ? 240 : 300,
    goal: `Ambil ${artifacts.length} relik, lalu kembali ke pintu keluar.`, tip, intro: tip,
  };
}
export const getLevel = n => ({ spec: missionSpec(n), fallback: false });

// ---- Level 51: the Grand Relic Guardian. One authored arena, no random variants. ----
export const BOSS_LEVEL_NUMBER = 51;
export function bossLevel() {
  const width = 23, height = 19, rows = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.'));
  for (let y = 3; y <= 5; y++) for (let x = 10; x <= 12; x++) rows[y][x] = '#';
  for (const [x, y] of [[5, 10], [17, 10], [5, 14], [17, 14]]) rows[y][x] = 'C';
  const spawn = { x: 11.5, y: 16.5 };
  return { id: 'gen-51', name: 'Penjaga Relik Agung', revision: 7, number: BOSS_LEVEL_NUMBER, tier: 'Penjaga Agung', special: true, tutorial: false, plan: null, width, height, map: rows.map(r => r.join('')),
    spawn, exit: { ...spawn }, keys: [], doors: [], levers: [], plates: [], artifacts: [{ id: 'relic-boss', x: 11.5, y: 1.5, kind: 'artifact', value: 50, locked: 'boss' }], loot: [], hides: [], shadows: [], guards: [], torches: [{ x: 8.5, y: 2.5, range: 3.4, fov: Math.PI * 2, facing: 0 }, { x: 14.5, y: 2.5, range: 3.4, fov: Math.PI * 2, facing: 0 }],
    crystals: [], bells: [], portals: [], gadgets: ['stone', 'smoke', 'trap'], beasts: [], dogs: [], hazards: [], transitions: [], par: 300,
    boss: { x: 11.5, y: 4.5, size: 3, zone: { x0: 1, y0: 6, x1: 21, y1: 17 }, weak: [{ x: 11.5, y: 7.5 }, { x: 6.5, y: 7.5 }, { x: 16.5, y: 7.5 }] },
    goal: 'Kalahkan Penjaga Relik Agung dalam 5 fase, ambil relik (50 Apple Coin), lalu kembali ke pintu keluar.',
    tip: 'Hindari area merah. Saat celah terbuka, injak lingkaran bercahaya di depan penjaga untuk memukulnya. Jantung hijau memulihkan nyawa.', intro: 'Penjaga Relik Agung: 5 fase, celah besar, hukuman berat.' };
}
