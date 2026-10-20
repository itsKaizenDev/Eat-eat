// Registry mode: satu sumber untuk identitas tiap mode (id stabil, label, grup, pemain, sentuh,
// deskripsi, kontrol, jenis kecepatan, kondisi selesai). Perilaku simulasi TIDAK ada di sini.
// 10 mode lama didaftarkan sebagai adapter (kind: 'arcade' -> lib/gameEngine.js, perilaku tidak berubah).
// kind: 'arcade' (lib/gameEngine.js), 'territory' (lib/territory/controller.js), 'boss' (lib/boss/controller.js), 'puzzle' (lib/puzzle/controller.js), 'delivery' (lib/delivery/controller.js), 'roguelite' (lib/roguelite/controller.js).
// goal/preview/duration hanya dipakai layar Petualangan: tujuan, pratinjau aturan sebelum PLAY, dan durasi TETAP yang benar-benar didukung.
// speedMode: 'pref' = chip Santai/Normal/Ngebut/Konstan, 'locked' = Ngebut terkunci,
//            'pref+duration' = chip kecepatan + durasi, 'none' = tidak ada pengaturan kecepatan (mis. Puzzle berbasis langkah).

const ARCADE_CTRL = 'Panah / WASD, atau geser layar';

export const GROUPS = [
  { key: 'classic', label: 'Classic', icon: 'classic', arcade: true },
  { key: 'mayhem', label: 'Mayhem', icon: 'mayhem', arcade: true },
  { key: 'mp', label: '2P Lokal', icon: 'multiplayer', arcade: true },
  { key: 'adventure', label: 'Petualangan', icon: 'compass', arcade: false },
];

export const MODES = [
  { id: 'classic', label: 'Classic', short: 'Classic', group: 'classic', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak tembok atau tubuh.', description: 'Makan apel, tumbuh panjang, hindari tembok.' },
  { id: 'classicnight', label: 'Malam', short: 'Malam', group: 'classic', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak tembok atau tubuh.', description: 'Arena malam dengan kepala ular menyala.' },
  { id: 'portal', label: 'Portal', short: 'Portal', group: 'classic', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak tubuh.', description: 'Tembus tepi arena dan muncul di sisi lainnya.' },
  { id: 'timeattack', label: 'Time Attack', short: 'Time Attack', group: 'classic', kind: 'arcade', players: 1, touch: true, speedMode: 'pref+duration', controls: ARCADE_CTRL, finish: 'Berakhir saat waktu habis.', description: 'Kejar skor sebelum waktu habis.' },
  { id: 'mayhem', label: 'Mayhem', short: 'Mayhem', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Apel spesial, efek acak, dan ranjau menanti.' },
  { id: 'mayhemplus', label: 'Mayhem+', short: 'Mayhem+', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Kekacauan Mayhem yang lebih intens.' },
  { id: 'mayhemhard', label: 'Mayhem Hard', short: 'Hard', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'pref', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Waspadai racun tersamar dan kontrol terbalik.' },
  { id: 'impossible', label: 'Impossible', short: 'Impossible', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'locked', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Tantangan ekstrem dengan kecepatan Ngebut.' },
  { id: 'multiplayer', label: '2P Lokal', short: '2P Lokal', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Berebut apel berdua dengan satu keyboard.' },
  { id: 'mayhemduo', label: 'Mayhem Duo', short: 'Mayhem Duo', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Duel berdua dengan efek acak dan ranjau.' },
  { id: 'puzzle', label: 'Dungeon', short: 'Dungeon', group: 'adventure', kind: 'puzzle', players: 1, touch: true, speedMode: 'none', controls: 'Panah / WASD / geser = satu langkah. Z undo, R ulang level.', finish: 'Selesai saat kepala masuk pintu keluar yang syaratnya terpenuhi. Tiga hati habis = game over.', description: 'Jelajahi 50 ruang: cari kunci, buka tuas, hindari jebakan, dan hadapi dua jenis musuh.',
    goal: 'Selesaikan 50 level (5 tutorial, lalu 45 buatan sistem) dengan langkah sesedikit mungkin.',
    preview: ['Ketuk untuk satu langkah, tahan untuk berjalan; tanpa batas waktu. Gerakan yang tertahan tidak memakai langkah.', 'Ambil kunci dan injak sakelar sekali. Maskot satu petak; apel emas adalah koin bonus untuk rencana skin.', 'Tiga hati. Slime 1 HP, penjaga batu 2 HP. Arah ke musuh = serang. Hindari petak ! sebelum giliran berikutnya; tuas membuka jeruji permanen.', 'Undo (Z) bisa berulang; R mengulang level.'] },
  { id: 'delivery', label: 'Kurir Apel', short: 'Kurir Apel', group: 'adventure', kind: 'delivery', players: 1, touch: true, speedMode: 'pref', controls: 'Panah / WASD, atau geser layar. Esc jeda.', finish: 'Shift berakhir saat waktu habis: menang bila terkirim >= 5, kalah bila kurang atau menabrak.', description: 'Ambil paket, antar ke rumah yang tepat sebelum paket basi. Satu shift penuh.',
    goal: 'Antar minimal 5 paket dalam satu shift tanpa menabrak.',
    duration: { fixedSec: 120, label: '120 detik (tetap)' },
    preview: ['Ambil paket A/B/C; semua paket dengan tujuan sama diantar sekaligus.', 'Tiap paket = 1 segmen kargo di ekor; kapasitas 3, pesanan aktif maksimal 2.', 'Paket punya umur: basi = kargo dibuang dan skor berkurang.'] },
  { id: 'roguelite', label: 'Ekspedisi Mayhem', short: 'Ekspedisi', group: 'adventure', kind: 'roguelite', players: 1, touch: true, speedMode: 'pref', controls: 'Panah / WASD, atau geser layar. Esc jeda. Tekan arah untuk memulai tiap ronde.', finish: 'Lima rute dilanjutkan pertahanan kebun; menang setelah boss tiga fase kalah.', description: 'Kumpulkan apel, pilih upgrade, tembus antek, lalu taklukkan boss tiga fase.',
    goal: 'Tuntaskan 5 rute, lalu 9 gelombang antek dan boss acak pada gelombang 10.',
    preview: ['Apel normal, besar, racun, dan keberuntungan (memicu efek untung atau rugi); ranjau mematikan.', 'Tiap ronde tuntas: pilih 1 dari 3 upgrade. Tiap upgrade punya manfaat dan harga.', 'Upgrade dibawa ke kebun. Saat kalah, pakai revive untuk lanjut: 3 jatah, pulih penuh 72 jam sejak pemakaian pertama. Main lagi mengulang dari rute 1.'] },
  { id: 'boss', hidden: true, label: 'Penjaga Kebun', short: 'Penjaga Kebun', group: 'adventure', kind: 'boss', players: 1, touch: true, speedMode: 'pref', controls: 'Panah / WASD, atau geser layar. Esc jeda.', finish: 'Menang setelah boss ronde 10 kalah; run berakhir jika hati habis.', description: 'Tembus sembilan ronde antek, kumpulkan hati, lalu hadapi boss acak dengan tiga fase.',
    goal: 'Selesaikan 10 ronde: antek dahulu, lalu boss dengan HP fase 3 / 5 / 10.',
    duration: { fixedSec: 0, label: 'Tanpa batas waktu' },
    preview: ['Antek menyerang bergiliran. Apel mengisi energi: 1 per pukulan ke antek, 3 ke boss.', 'Boss acak punya pola favorit. Fase makin cepat dan keras, tetapi membuka 1 / 2 / 3 titik lemah.', 'Mulai 5 hati. Ambil heal untuk menambah simpanan hati; fase akhir memberi damage 2 hati.'] },
  { id: 'territory', label: 'Rebut Arena', short: 'Rebut Arena', group: 'adventure', kind: 'territory', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard). Esc jeda.', finish: 'Berakhir saat satu pemain menguasai 60% wilayah, lawan kehabisan nyawa, atau 90 detik habis.', description: 'Duel 2 pemain: keluar dari wilayahmu, gambar jejak, lalu kembali untuk merebut area.',
    goal: 'Kuasai 60% wilayah, atau punya wilayah terbanyak saat 90 detik habis.',
    duration: { fixedSec: 90, label: '90 detik (tetap)' },
    preview: ['Keluar dari wilayahmu = menggambar jejak; kembali ke wilayahmu menutup jejak dan merebut area di dalamnya.', 'Jejakmu diinjak kepala lawan = kamu kehilangan 1 dari 3 nyawa. Menabrak tepi, dinding, atau jejak sendiri juga.', 'Tabrakan kepala dan tukar kepala: keduanya kehilangan nyawa. Nyawa terakhir habis bersamaan = seri.'] },
];

const byId = Object.fromEntries(MODES.map(m => [m.id, m]));
export const getMode = (id) => byId[id] || null;
export const kindOf = (id) => (byId[id] ? byId[id].kind : 'arcade');
export const isAdventure = (id) => !!byId[id] && byId[id].group === 'adventure';
export const modesInGroup = (g) => MODES.filter(m => m.group === g && !m.hidden);
export const arcadeModes = () => MODES.filter(m => m.kind === 'arcade');
export const needsKeyboard = (id) => !!byId[id] && !byId[id].touch;
export const isTwoPlayer = (id) => !!byId[id] && byId[id].players === 2;
