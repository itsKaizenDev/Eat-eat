export const COLS = 17;
export const ROWS = 15;

// icon dihapus dari sini — dipetakan lewat lib/icons.js (ICONS[type]) pas render,
// biar nggak ada emoji ke-hardcode.
// Penyempitan arena (semua mode Mayhem): menyempit 1 ubin demi 1 ubin dengan perlahan, bertahan `EFFECTS.shrink.dur`, lalu melebar lagi.
export const SHRINK = { maxInset: 3, tileMs: 1500, widenMs: 1200 };

export const EFFECTS = {
  fast:     { label: 'Cepat',          dur: 6000, timed: true },
  slow:     { label: 'Lambat',         dur: 6000, timed: true },
  shrink:   { label: 'Arena Sempit',   dur: 15000, timed: true }, // dur = lama bertahan SETELAH selesai menyempit (animasi tidak dihitung)
  swarm:    { label: 'Racun Serbu',    dur: 8000, timed: true },
  teleport: { label: 'Tembus Tepi!',   dur: 9000, timed: true },
  nerf:     { label: 'Nerf! -3 Skor',  dur: 1500, timed: false },
  buff:     { label: 'Buff! +5 Skor',  dur: 1500, timed: false },
  bomb:     { label: 'Bom Ditanam!',   dur: 1500, timed: false },
  dark:     { label: 'Gelap!',         dur: 9000, timed: true },
  reverse:  { label: 'Kontrol Kebalik!', dur: 7000, timed: true },
  timebonus:{ label: '+2 detik!',      dur: 1500, timed: false },
};

export const MODE_NAMES = {
  classic: 'Classic',
  classicnight: 'Malam',
  mayhemduo: 'Mayhem Duo',
  mayhemhard: 'Mayhem Hard',
  impossible: 'Impossible',
  portal: 'Portal',
  mayhem: 'Mayhem',
  mayhemplus: 'Mayhem+',
  timeattack: 'Time Attack',
  multiplayer: '2P Lokal',
  puzzle: 'Dungeon',
  delivery: 'Delivery Mayhem',
  roguelite: 'Ekspedisi Mayhem',
  territory: 'Rebut Arena',
  boss: 'Penjaga Kebun',
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
    { icon: 'wall', text: 'Tabrak tepi arena = game over' },
  ],
  portal: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'teleport', text: 'Tepi arena selalu tembus (wrap-around), nggak akan mati kena tembok' },
  ],
  timeattack: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'timeattack', text: 'Kejar skor sebelum waktu habis (pilih 30/60/90/120 detik)' },
    { icon: 'timeattack', text: 'Apel jam (tosca): tambah waktu +2 detik' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over' },
  ],
  classicnight: [
    { icon: 'normal', text: 'Apel normal +1 skor' },
    { icon: 'dark', text: 'Sama kayak Classic, tampilan malam: kepala ular menyala biar gampang diikuti' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over' },
  ],
  mayhemduo: [
    { icon: 'multiplayer', text: 'P1 pakai Panah, P2 pakai WASD, berebut apel' },
    { icon: 'poison', text: 'Apel racun -2 skor & badan susut' },
    { icon: 'bomb', text: 'Apel bom: taruh 4 ranjau, siapa pun yang kena mati' },
    { icon: 'teleport', text: 'Apel teleport: tepi arena tembus untuk kedua pemain' },
    { icon: 'lucky', text: 'Apel lucky: cepat/lambat untuk semua, atau buff +5 / nerf -3 buat yang makan' },
    { icon: 'heart', text: '3 nyawa tiap pemain, menang duluan skor 50 (tembus bersamaan: skor lebih tinggi menang, sama = seri)' },
  ],
  mayhemhard: [
    ...MAYHEM_RULES.slice(0, 7),
    { icon: 'poison', text: 'Apel racun NYAMAR jadi apel normal (cuma kedip sebentar pas muncul) & motong 50% badan' },
    { icon: 'reverse', text: 'Efek Kontrol Kebalik: arah tombol/swipe dibalik sementara' },
    { icon: 'shrink', text: 'Tembok menyempit pelan-pelan selama efek, lalu melebar lagi (ring merah = peringatan)' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over. Ranjau tetap hilang sendiri setelah 30 detik' },
  ],
  impossible: [
    { icon: 'mayhemplus', text: 'Semua aturan Mayhem Hard, tapi kecepatan dikunci Ngebut' },
    { icon: 'poison', text: 'Apel racun & lucky lebih sering, apel lebih cepat hilang' },
    { icon: 'wall', text: 'Selamat berjuang.' },
  ],
  mayhem: MAYHEM_RULES,
  mayhemplus: [
    ...MAYHEM_RULES,
    { icon: 'mayhemplus', text: 'Semua efek lebih sering & lebih intens dari Mayhem biasa' },
  ],
  multiplayer: [
    { icon: 'multiplayer', text: 'P1 pakai Panah, P2 pakai WASD, berebut apel' },
    { icon: 'heart', text: '3 nyawa tiap pemain (respawn tiap mati)' },
    { icon: 'trophy', text: 'Menang duluan skor 50 (kalau tembus bersamaan: skor lebih tinggi menang, sama = seri), atau lawan kehabisan nyawa' },
    { icon: 'wall', text: 'Tabrak tepi arena = game over untuk pemain itu' },
  ],
  puzzle: [
    { icon: 'map', text: 'Arena memenuhi layar portrait maupun landscape. +/− mengatur zoom; Peta menampilkan seluruh denah, ikon bidik kembali mengikuti ular. Jeda untuk mengamati dengan tenang.' },
    { icon: 'steps', text: 'Tahan WASD/panah atau joystick untuk bergerak. Diagonal sama cepatnya. Lepas arah untuk berhenti; Esc menjeda.' },
    { icon: 'slow', text: 'Shift = mengendap, Spasi = lari. Di layar sentuh, pilih Mengendap/Jalan/Lari. Lari terdengar lebih jauh.' },
    { icon: 'eye', text: 'Kerucut menunjukkan bidang pandang. ? = curiga/menyelidiki, ! = mengejar, … = mencari. Tertangkap menggagalkan misi.' },
    { icon: 'shield', text: 'Lencana permata menandai penjaga relik; kunci untuk penjaga akses, kaca pembesar untuk penyisir. Helm chevron merah menandai penjaga cepat.' },
    { icon: 'dark', text: 'Dinding/peti menghalangi pandangan. Ceruk ungu: F untuk sembunyi/keluar. Penjaga yang melihatmu masuk akan memeriksanya.' },
    { icon: 'key', text: 'Ambil kunci A, lalu E di pintu A. Tuas A membuka segel A permanen. Pelat P membuka gerbang berwaktu; setelah dilewati, gerbang menetap terbuka.' },
    { icon: 'flask', text: 'Q = pakai alat; X = ganti. Batu dilempar ke arah hadap dan memancing suara. Asap memutus pandangan 4,5 detik. Trap menahan penjaga/anjing 4,5 detik atau bayangan 3 detik. Tiap alat pulih 10 detik, tanpa batas pemakaian.' },
    { icon: 'gift', text: 'Relik biru wajib. Koin emas opsional, masing-masing bernilai 5 Apple Coin. Bawa semua relik ke pintu keluar hijau untuk menyelesaikan misi.' },
    { icon: 'trophy', text: '1 bintang: misi tuntas. 2: tanpa alarm. 3: tanpa alarm, semua bonus dan waktu acuan tercapai. Progres lama tetap membuka level.' },
    { icon: 'eye', text: 'CCTV langsung mendeteksi saat kamu masuk sorot tanpa penghalang. Alarm memberi tahu semua penjaga lokasi terakhirmu. Putus pandangan lalu pindah tempat; dinding dan asap tetap melindungi.' },
    { icon: 'portal', text: 'E di portal I menuju pasangannya. Obor menerangi radius bulat, terhalang tembok, dan mempercepat deteksi penjaga. Lari di dekat lonceng terdengar jauh.' },
    { icon: 'fast', text: 'Level 20+: penjaga merah 18% lebih cepat. Duri lantai: padam aman, kuning peringatan, merah aktif. Duri juga menahan penjaga dan anjing.' },
    { icon: 'dark', text: 'Level 30+: makhluk bayangan bersarang di tembok/pintu palsu. Tubuhnya samar saat diam; jalur berwarna dan tanda arah memperingatkan sebelum terjangan lurus. Bisa memakan ular, penjaga, dan anjing. Menyingkir ke samping atau pasang trap.' },
    { icon: 'eye', text: 'Level 35+: anjing melihat sekeliling hingga 4,8 petak dan mengejar lebih cepat dari ular. Rantai membatasi anjing terikat; yang lepas bisa mengejar. Gonggongan memanggil penjaga sekitar lewat koridor.' },
    { icon: 'gift', text: 'Mulai level 36, Peniru hadir di setiap variasi map dan menyerupai peti biasa, dengan celah samar pada tutupnya. Rahang terbuka menandai serangan; batu dapat memancingnya.' },
    { icon: 'eye', text: 'Mulai level 40, laba-laba selalu hadir bersama Shadow dan Peniru, menjaga sarang berjaring. Tanda silang di lingkaran menunjukkan tempat ia akan menyambar. Jaring memperlambat ular, penjaga, dan anjing.' },
    { icon: 'boss', text: 'Level 51: lima fase boss dengan delapan pola. Tiap hantaman bertahap ditandai sebelum aktif. Rune fase 1 diinjak, fase 2 ditahan 0,7 detik, fase 3 berurutan, fase 4 dua rantai lalu inti, fase 5 kombo dan rune terakhir ditahan.' },
    { icon: 'flask', text: 'Boss: batu yang tepat mengenai resonator sian saat peringatan memutus serangan dan membuka rune. Asap menyembunyikan posisi dari Tatapan Pemburu; trap di jalur hantaman memperpanjang peringatan berikutnya. Cooldown alat tetap 10 detik.' },
    { icon: 'restart', text: 'Mulai atau R mengacak bentuk denah dan posisi untuk ronde baru. Pause/resume mempertahankan denah. Berpindah tab/kehilangan fokus menjeda.' },
  ],
  delivery: [
    { icon: 'steps', text: 'Normal memberi jalan 2–3 petak; belokan yang langsung menuju tembok dapat ditahan hingga dua petak sebelum bukaan. Hard mempertahankan lorong sempit dan input presisi. Pilihan kecepatan terpisah.' },
    { icon: 'delivery', text: 'Ambil paket bertanda A/B/C, lalu antar ke A Lumbung, B Kandang, atau C Kios sesuai hurufnya. HUD menampilkan tujuan, deadline, dan hadiah.' },
    { icon: 'timeattack', text: '12 misi bertahap. Target, waktu, dan kapasitas tercantum di menu. Menang langsung saat target kiriman tercapai.' },
    { icon: 'normal', text: 'Reguler seimbang; Ekspres berdeadline pendek; Rapuh rusak oleh guncangan; Berat memakai 2 slot dan memperlambat gerak; Multi-stop harus ke dua alamat.' },
    { icon: 'steps', text: 'Setiap paket menambah satu segmen ekor. Semua paket yang cocok diantar sekaligus. Rute efisien, kecepatan, kondisi, dan combo memberi bonus.' },
    { icon: 'pause', text: 'Tahan Rem atau Spasi untuk menunggu pagar dan gerobak panen; deadline tetap berjalan. Jeda menghentikan waktu dan lalu lintas.' },
    { icon: 'wall', text: 'Ikuti panah satu arah. Gerbang dan jalan pintas boleh dihindari lewat jalur luar. Menabrak gedung atau tubuh sendiri mengakhiri misi.' },
  ],
  boss: [
    { icon: 'shield', text: 'Fase 3: tiap serangan selesai menjadwalkan shield +10 pada detik 5, 10, 15 (maks 100). Ambil orb ×2 untuk menumpuk damage; setiap 5 shield memberi pengali ×2 tambahan selama kamu punya orb. Shield menyerap damage lebih dulu' },

    { icon: 'steps', text: 'Panah / WASD, atau geser layar. Esc untuk jeda' },
    { icon: 'boss', text: 'Ronde 1–9: kalahkan antek bergiliran (1, 2, lalu 3 antek per ronde). Boss acak muncul di ronde 10 dengan tiga fase: 3, 5, dan 10 HP' },
    { icon: 'bolt', text: 'Apel memberi +1 energi (maks 9) dan memanjangkan tubuh. Masuk bintang terbuka: 1 energi untuk antek, 3 untuk boss; tubuh memendek 3 segmen' },
    { icon: 'key', text: 'Boss membuka 1 / 2 / 3 celah sesuai fase. Setiap bintang hanya bisa dipukul sekali per jendela. Bahaya berhenti selama celah terbuka' },
    { icon: 'wall', text: 'Baris, ranjau, dan koridor dipilih acak. Hindari arsiran sebelum X/bom aktif. Fase makin cepat, serangan fase 3 mengurangi 2 hati' },
    { icon: 'heart', text: 'Mulai dengan 5 hati. Ambil hati merah untuk heal yang bisa ditabung tanpa batas awal. Hadiah pasti: +1 per ronde antek, +2 per pergantian fase boss. Sebagian antek juga menjatuhkan heal acak' },
    { icon: 'shield', text: 'Tepi, tubuh sendiri, dan area musuh mengurangi 1 hati. Setelah kena kamu muncul di tempat aman dan kebal bahaya sementara; tembok tetap berbahaya' },
    { icon: 'trophy', text: 'Habiskan seluruh HP fase 3 untuk menang. Pukulan terakhir diprioritaskan bila bersamaan dengan damage. Rekor aturan baru terpisah dari boss lama' },
  ],
  territory: [
    { icon: 'multiplayer', text: 'P1 pakai Panah, P2 pakai WASD, satu keyboard. Esc untuk jeda' },
    { icon: 'steps', text: 'Keluar dari wilayahmu menggambar jejak. Kembali ke wilayahmu menutup jejak dan merebut area yang terkurung' },
    { icon: 'heart', text: '3 nyawa tiap pemain. Hilang nyawa bila menabrak tepi, dinding, jejak sendiri, atau jejakmu diinjak kepala lawan' },
    { icon: 'wall', text: 'Tabrakan kepala dan tukar kepala: keduanya kehilangan 1 nyawa. Wilayah lama tetap milikmu, kamu muncul lagi di wilayahmu' },
    { icon: 'trophy', text: 'Menang: kuasai 60% wilayah, atau wilayah terbanyak saat 90 detik habis. Lawan kehabisan nyawa = kamu menang' },
    { icon: 'help', text: 'Area yang hanya berbatas tepi papan tidak ikut direbut; susuri tepi dengan jejakmu. Dua klaim serentak atas petak yang sama: petak tetap netral' },
  ],
  roguelite: [
    { icon: 'heart', text: 'Hidup lagi: 3 jatah bersama untuk semua run dan kecepatan. Pulih penuh 72 jam sejak revive pertama. Rute, fase, skor dan upgrade tetap; di kebun kembali dengan 3 hati. Tekan arah untuk lanjut, dengan perlindungan 3 detik.' },
    { icon: 'shield', text: 'Fase 3: tiap serangan selesai menjadwalkan shield +10 pada detik 5, 10, 15 (maks 100). Ambil orb ×2 untuk menumpuk damage; setiap 5 shield memberi pengali ×2 tambahan selama kamu punya orb. Shield menyerap damage lebih dulu' },

    { icon: 'heart', text: 'Bekal kebun: Kulit tebal +2 hati/tingkat; Penawar +1 hati/tingkat; Bekal manis +2 energi/tingkat. Tubuh ringkas, kecepatan Langkah berani, dan durasi kebal Napas panjang ikut dibawa' },
    { icon: 'boss', text: 'Kebun: apel mengisi energi, bintang terbuka untuk menyerang (1 energi/antek, 3/boss). Ambil heal untuk menabung hati. Boss membuka 1/2/3 celah; fase akhir menyerang 2 hati' },
    { icon: 'normal', text: 'Lima apel aktif, dihitung terpisah dari bom. Apel diisi ulang setelah dimakan selama masih ada tempat' },
    { icon: 'roguelite', text: 'Satu run: 5 rute pengumpulan apel dan upgrade, lalu 9 gelombang antek. Boss acak tiga fase muncul pada gelombang kebun ke-10' },
    { icon: 'normal', text: 'Apel normal +4, besar +10, racun −6 dan ekor −2, keberuntungan +4 dan memicu efek sementara' },
    { icon: 'bomb', text: 'Di rute pengumpulan, ranjau dan tembok mematikan. Efek sementara bisa menguntungkan atau merugikan' },
    { icon: 'trophy', text: 'Setelah ronde tuntas, game berhenti dan kamu memilih 1 dari 3 upgrade (manfaat dan harga tertulis)' },
    { icon: 'shield', text: 'Upgrade dan skor dibawa antar ronde; efek sementara dan posisi di-reset tiap ronde' },
    { icon: 'steps', text: 'Tiap rute dan awal kebun menunggu arah pertama. Di kebun, tabrakan mengurangi hati; hati habis mengakhiri run' },
  ],
};

export function colorForKind(k) {
  return k === 'poison' ? '#7b3fa0'
    : k === 'big' ? '#f5b942'
    : k === 'lucky' ? '#9aa0a6'
    : k === 'teleport' ? '#3fa0d8'
    : k === 'bomb' ? '#3a3a3a'
    : k === 'dark' ? '#161018'
    : k === 'time' ? '#2ec4b6'
    : '#e64b3d';
}
