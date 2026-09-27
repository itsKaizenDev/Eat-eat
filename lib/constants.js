export const COLS = 17;
export const ROWS = 15;

// icon dihapus dari sini — dipetakan lewat lib/icons.js (ICONS[type]) pas render,
// biar nggak ada emoji ke-hardcode.
export const EFFECTS = {
  fast:     { label: 'Cepat',          dur: 6000, timed: true },
  slow:     { label: 'Lambat',         dur: 6000, timed: true },
  shrink:   { label: 'Arena Sempit',   dur: 8000, timed: true },
  swarm:    { label: 'Racun Serbu',    dur: 8000, timed: true },
  teleport: { label: 'Tembus Tepi!',   dur: 9000, timed: true },
  nerf:     { label: 'Nerf! -3 Skor',  dur: 1500, timed: false },
  buff:     { label: 'Buff! +5 Skor',  dur: 1500, timed: false },
  bomb:     { label: 'Bom Ditanam!',   dur: 1500, timed: false },
  dark:     { label: 'Gelap!',         dur: 9000, timed: true },
};

export const MODE_NAMES = {
  classic: 'Classic',
  portal: 'Portal',
  mayhem: 'Mayhem',
  mayhemplus: 'Mayhem+',
  timeattack: 'Time Attack',
  multiplayer: '2P Lokal',
};

// Rules bantuan per mode — dirender pakai icon (lucide) di HelpModal, bukan
// emoji nempel di kalimat. `icon` merujuk ke key di lib/icons.js (ICONS[key]).
const MAYHEM_RULES = [
  { icon: 'normal', text: 'Apel normal +1 skor' },
  { icon: 'big', text: 'Apel besar +3 skor' },
  { icon: 'poison', text: 'Apel racun -2 skor & badan susut' },
  { icon: 'dark', text: 'Apel gelap: area gelap sementara, cuma keliatan sekitar kepala' },
  { icon: 'lucky', text: 'Apel lucky: efek acak (cepat/lambat/sempit/dll)' },
  { icon: 'teleport', text: 'Apel teleport: tembus tepi arena sementara' },
  { icon: 'bomb', text: 'Apel bom: taruh ranjau di papan, kena = mati' },
  { icon: 'wall', text: 'Tabrak tepi arena = game over (kecuali lagi efek Teleport)' },
];

export const MODE_RULES = {
  classic: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'big', text: 'Apel besar +3 skor' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over' },
  ],
  portal: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'big', text: 'Apel besar +3 skor' },
    { icon: 'teleport', text: 'Tepi arena selalu tembus (wrap-around), nggak akan mati kena tembok' },
  ],
  timeattack: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'big', text: 'Apel besar +3 skor' },
    { icon: 'timeattack', text: 'Kejar skor sebelum waktu 90 detik habis' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over' },
  ],
  mayhem: MAYHEM_RULES,
  mayhemplus: [
    ...MAYHEM_RULES,
    { icon: 'mayhemplus', text: 'Semua efek lebih sering & lebih intens dari Mayhem biasa' },
  ],
  multiplayer: [
    { icon: 'multiplayer', text: 'P1 pakai Panah, P2 pakai WASD, berebut apel' },
    { icon: 'heart', text: '3 nyawa tiap pemain (respawn tiap mati)' },
    { icon: 'trophy', text: 'Menang duluan skor 50, atau lawan kehabisan nyawa' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over untuk pemain itu' },
  ],
};

export function colorForKind(k) {
  return k === 'poison' ? '#7b3fa0'
    : k === 'big' ? '#f5b942'
    : k === 'lucky' ? '#9aa0a6'
    : k === 'teleport' ? '#3fa0d8'
    : k === 'bomb' ? '#3a3a3a'
    : k === 'dark' ? '#161018'
    : '#e64b3d';
}
