# Diff per file — Dungeon, Movement & Aset

Diff dibandingkan basis ZIP terakhir (revive dan Jejak Kunci). File dokumentasi baru dibaca langsung dari ZIP; aset biner diganti sebagai WebP, bukan patch teks.

## CHANGELOG.md

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 5a3a8c9..2a82fa4 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,6 +3,16 @@
 Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Rilis dinamai menurut **tahap kerja**, bukan nomor versi.
 Catatan tahap 0–9 di bawah adalah arsip dengan cakupan verifikasi masing-masing. Revisi terkini telah diuji di Chromium, melalui build produksi, dan dengan 285 tes otomatis; detail ada di [REVIVE_JEJAK_KUNCI.md](REVIVE_JEJAK_KUNCI.md).
 
+## Revisi — Dungeon, Movement & Aset Menu (19 Oktober 2026)
+
+- Jejak Kunci menjadi Dungeon; id mode, key progres, unlock dan saldo koin tetap kompatibel.
+- Hold keyboard/DPad memakai repeat aplikasi; arah terbaru menggantikan input lama. Keyup, jeda, blur dan perpindahan mode membersihkan hold. Repeat Esc di dialog jeda diabaikan.
+- Gerbang kampanye memakai tuas permanen. Slime 1 HP, penjaga batu 2 HP; tiga hati pemain, sasaran serangan satu giliran, heal dan combat opsional.
+- LOS mengikuti tembok/sudut, penjaga tidak menumpuk. Ruang 35–42 tepat satu musuh; 43–50 tepat dua. Semua 50 ruang punya solusi optimum yang diuji ulang.
+- Save tertunda digabungkan dengan hasil ruang berikutnya; UI memberi tombol coba simpan lagi.
+- 15 pasang scene WebP desktop/HP: Day dan cutout lama didesain ulang; Mayhem/variasi serta 2P Lokal dibersihkan area teksnya. Judul outlined tanpa bidang warna.
+- Detail aturan, batasan, diff per file dan verifikasi: [DUNGEON_REVISION.md](DUNGEON_REVISION.md).
+
 ## Revisi — Revive Ekspedisi & Jejak Kunci
 
 - Revive Ekspedisi 3 kali, kuota bersama lintas run/kecepatan; kembali penuh 72 jam setelah pemakaian pertama. Lanjut rute/fase yang sama; kebun kembali dengan 3 hati. Kuota dan hitung mundur muncul di menu/hasil.
```

## README.md

```diff
diff --git a/README.md b/README.md
index f9be1ae..257090c 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # Snake (Next.js)
 
-Revisi terbaru: [Revive & Jejak Kunci](REVIVE_JEJAK_KUNCI.md) — revive Ekspedisi 3 kali per 72 jam, maskot satu petak, koin apel, penjaga patroli, dan objek puzzle yang lebih jelas.
+Revisi terbaru: [Dungeon, Movement & Aset Menu](DUNGEON_REVISION.md) — kontrol tahan/belok yang konsisten, tuas permanen, combat tiga hati, kampanye tervalidasi, serta latar teks transparan. Diff tersedia di [DUNGEON_DIFF_PER_FILE.md](DUNGEON_DIFF_PER_FILE.md).
 
 Revisi sebelumnya: [Petualangan & Boss](ADVENTURE_REVISION.md) — UI dua kolom, aset transparan, Ekspedisi gabungan, dan boss HP 3/5/10 dengan shield/orb.
```

## app/globals.css

```diff
diff --git a/app/globals.css b/app/globals.css
index db7ef00..fd9edc6 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -288,3 +288,26 @@ button:active:not(:disabled) { transform:translateY(1px); }
 @media (max-width:639px) { .focus-stage .adv-modes[data-n="4"] { grid-template-columns:repeat(2,minmax(0,1fr)); } }
 .stage-side.focus-stage .adv-modes[data-n="4"] { grid-template-columns:repeat(2,minmax(0,1fr)); }
 .boss-power { padding:7px 9px; border:1px solid #a8c5c3; border-radius:9px; background:#e7efe2; }
+
+/* Status dungeon dan kegagalan simpan tetap terbaca pada layar kecil. */
+.dungeon-hearts { color:#a04444; font-weight:750; }
+.puzzle-stats [data-guard="windup"] { color:#a03c31; font-weight:750; }
+.puzzle-stats [data-guard="recover"] { color:#487043; }
+.save-notice { margin:10px 0; padding:12px; border:1px solid #c69a53; border-radius:12px; background:#fff1d6; color:#765221; font-size:12px; line-height:1.5; }
+.save-notice p { margin:0 0 8px; color:inherit; }
+.save-notice button { min-height:44px; padding:8px 12px; border:1px solid #a78240; border-radius:9px; font-weight:700; background:#fffaf0; }
+@media (min-width:640px) and (max-height:850px) {
+ .focus-header { padding-bottom:18px; }
+ .menu-hero { height:240px; }
+ .focus-stage .start-menu { padding-top:20px; }
+ .menu-footer { margin-top:16px; }
+}
+
+/* HUD dungeon lebih tinggi; papan menyesuaikan tinggi laptop dan panel HP. */
+@media (hover:hover) and (pointer:fine) {
+ .playing-stage[data-mode="puzzle"] { --gw:min(calc(100vw - 32px),640px,max(260px,calc((100dvh - 320px) * 1.13))); }
+}
+.stage-side[data-mode="puzzle"] .puzzle-legend { display:none; }
+.stage-side[data-mode="puzzle"] .puzzle-stats { font-size:11px; gap:3px 8px; }
+.stage-side[data-mode="puzzle"] { --dpad:clamp(100px,30vh,138px); }
+.stage-side[data-mode="puzzle"] .puzzle-actions button { min-height:40px; padding:5px 8px; }
```

## app/page.js

```diff
diff --git a/app/page.js b/app/page.js
index d0c0556..c4f64b1 100644
--- a/app/page.js
+++ b/app/page.js
@@ -93,7 +93,7 @@ export default function Page() {
   function handleDpad(x, y) {
     const g = gameRef.current; if (!g) return;
     if (isTwoPlayer(mode)) g.setDirMP(0, x, y);
-    else g.setDir(x, y);
+    else g.setHeldDir(x, y);
   }
 
   return (
@@ -102,7 +102,7 @@ export default function Page() {
       {askRotate && <RotatePrompt onMenu={returnToMenu} />}
       <UpgradeDialog data={hud.roguelite} onChoose={(id) => gameRef.current && gameRef.current.chooseUpgrade(id)} />
       <HelpModal open={helpOpen} mode={mode} onClose={closeHelp} />
-      <main inert={helpOpen || askRotate || hud.roguelite?.offer?.length ? '' : undefined} aria-hidden={helpOpen || askRotate || !!hud.roguelite?.offer?.length || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${side ? 'stage-side' : ''} ${side && lefty ? 'stage-lefty' : ''} ${side && overlay.visible ? 'menu-open' : ''}`}>
+      <main data-mode={mode} inert={helpOpen || askRotate || hud.roguelite?.offer?.length ? '' : undefined} aria-hidden={helpOpen || askRotate || !!hud.roguelite?.offer?.length || undefined} className={`stage ${menuOpen ? 'focus-stage' : 'playing-stage'} ${side ? 'stage-side' : ''} ${side && lefty ? 'stage-lefty' : ''} ${side && overlay.visible ? 'menu-open' : ''}`}>
       {!menuOpen && <Hud
         side={side}
         lefty={lefty}
@@ -148,6 +148,7 @@ export default function Page() {
           onTaChange={changeDuration}
           onPlay={handlePlay}
           onRevive={() => gameRef.current && gameRef.current.reviveRun()}
+          onRetrySave={() => gameRef.current?.retrySave()}
           onMenu={returnToMenu}
           puzzleMenu={hud.puzzleMenu}
           deliveryMenu={hud.deliveryMenu}
@@ -159,7 +160,7 @@ export default function Page() {
       </div>
 
       {side && <div ref={setSideEl} className="side-menu" />}
-      {!overlay.visible && <DPad onMove={handleDpad} />}
+      {!overlay.visible && <DPad onMove={handleDpad} onRelease={() => gameRef.current?.releaseHeldDir()} />}
       {!menuOpen && !side && (mode === 'puzzle'
         ? <div className="text-[11px] sm:text-xs text-[#8a988a] mt-2.5 text-center">Panah / WASD melangkah • Spasi tunggu • Z undo • R ulang • Esc jeda</div>
         : mode === 'boss'
```

## components/BackgroundLayer.jsx

```diff
diff --git a/components/BackgroundLayer.jsx b/components/BackgroundLayer.jsx
index f2c9f58..c5645d5 100644
--- a/components/BackgroundLayer.jsx
+++ b/components/BackgroundLayer.jsx
@@ -16,7 +16,7 @@ export default function BackgroundLayer({ mode }) {
     return () => { window.removeEventListener('snake:play-punch', punch); gsap.killTweensOf(el); };
   }, []);
   const src = BG[mode] || BG.classic;
-  return <div ref={ref} className={`focus-scene ${['classicnight', 'portal', 'timeattack', 'puzzle', 'delivery', 'roguelite', 'boss', 'territory'].includes(mode) ? 'scene-cutout' : ''}`} aria-hidden="true"><picture key={mode}>
+  return <div ref={ref} className="focus-scene scene-cutout" aria-hidden="true"><picture key={mode}>
     <source media="(max-width: 768px), (pointer: coarse)" srcSet={src.replace('.webp', '-m.webp')} />
     <img src={src} alt="" width="1672" height="941" draggable={false} />
   </picture></div>;
```

## components/DPad.jsx

```diff
diff --git a/components/DPad.jsx b/components/DPad.jsx
index 4b61c41..87f7100 100644
--- a/components/DPad.jsx
+++ b/components/DPad.jsx
@@ -7,7 +7,7 @@ import { ICONS } from '@/lib/icons';
 // ikut jempol kayak analog, balik ke tengah pas dilepas.
 const DEAD = 0.32; // proporsi radius yang jadi zona mati
 
-export default function DPad({ onMove }) {
+export default function DPad({ onMove, onRelease }) {
   const padRef = useRef(null);
   const knobRef = useRef(null);
   const st = useRef({ pid: null, dir: null });
@@ -28,7 +28,7 @@ export default function DPad({ onMove }) {
     const ang = Math.atan2(dy, dx);
     placeKnob(Math.cos(ang) * clamped, Math.sin(ang) * clamped);
 
-    if (dist < max * DEAD) { st.current.dir = null; return; }
+    if (dist < max * DEAD) { if (st.current.dir) onRelease?.(); st.current.dir = null; return; }
 
     let dir;
     if (ang > -Math.PI / 4 && ang <= Math.PI / 4) dir = 'r';
@@ -36,6 +36,12 @@ export default function DPad({ onMove }) {
     else if (ang > (3 * Math.PI) / 4 || ang <= -(3 * Math.PI) / 4) dir = 'l';
     else dir = 'u';
 
+    const axes = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 };
+    if (st.current.dir) {
+      const delta = Math.atan2(Math.sin(ang - axes[st.current.dir]), Math.cos(ang - axes[st.current.dir]));
+      if (Math.abs(delta) < Math.PI * .3) dir = st.current.dir;
+    }
+
     if (dir !== st.current.dir) {
       st.current.dir = dir;
       if (dir === 'u') onMove(0, -1);
@@ -43,9 +49,10 @@ export default function DPad({ onMove }) {
       else if (dir === 'l') onMove(-1, 0);
       else onMove(1, 0);
     }
-  }, [onMove]);
+  }, [onMove, onRelease]);
 
   const onDown = (e) => {
+    if (st.current.pid !== null || !e.isPrimary) return;
     e.preventDefault();
     st.current.pid = e.pointerId;
     padRef.current && padRef.current.setPointerCapture(e.pointerId);
@@ -61,6 +68,7 @@ export default function DPad({ onMove }) {
     if (e.pointerId !== st.current.pid) return;
     st.current.pid = null;
     st.current.dir = null;
+    onRelease?.();
     if (knobRef.current) {
       knobRef.current.style.transition = 'transform 150ms ease';
       placeKnob(0, 0);
@@ -78,6 +86,7 @@ export default function DPad({ onMove }) {
       onPointerMove={onMovePtr}
       onPointerUp={onUp}
       onPointerCancel={onUp}
+      onLostPointerCapture={onUp}
     >
       <ICONS.up className={arrow} style={{ top: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
       <ICONS.down className={arrow} style={{ bottom: '9%', left: '50%', transform: 'translateX(-50%)' }} size={24} strokeWidth={2.6} />
```

## components/GameCanvas.jsx

```diff
diff --git a/components/GameCanvas.jsx b/components/GameCanvas.jsx
index b819287..79b5ff6 100644
--- a/components/GameCanvas.jsx
+++ b/components/GameCanvas.jsx
@@ -8,6 +8,7 @@ import { createTerritoryGame } from '@/lib/territory/controller';
 import { createBossGame } from '@/lib/boss/controller';
 import { kindOf, isTwoPlayer } from '@/lib/modes/registry';
 import { useSounds } from '@/hooks/useSounds';
+import { createDirectionInput } from '@/lib/input';
 
 const isMPMode = (m) => isTwoPlayer(m);
 const typingTarget = (t) => !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable));
@@ -20,12 +21,13 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
   const modeRef = useRef(mode);
   const prefsRef = useRef({ speedPref, taDuration });
   const kindRef = useRef('arcade');
+  const inputRef = useRef(null);
   const sounds = useSounds();
 
   const kind = kindOf(mode); // 'arcade' (engine lama), 'puzzle' (berbasis langkah), atau 'delivery' (kurir)
   prefsRef.current = { speedPref, taDuration };
   kindRef.current = kind;
-  useEffect(() => { modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);
+  useEffect(() => { inputRef.current?.clear(); modeRef.current = mode; if (engineRef.current) engineRef.current.setMode(mode); }, [mode]);
 
   // Satu controller aktif per jenis mode. Berpindah jenis (arkade <-> puzzle) menghancurkan yang lama
   // (timer/RAF/tween ikut dibersihkan) dan membuat yang baru; berpindah antar mode arkade memakai engine yang sama.
@@ -37,25 +39,28 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
     if (prefsRef.current.speedPref) engine.setSpeedPref(prefsRef.current.speedPref);
     if (prefsRef.current.taDuration) engine.setTaDuration(prefsRef.current.taDuration);
     engineRef.current = engine;
-    return () => { engine.destroy(); if (engineRef.current === engine) engineRef.current = null; };
+    return () => { inputRef.current?.clear(); engine.destroy(); if (engineRef.current === engine) engineRef.current = null; };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [kind]);
 
   useImperativeHandle(ref, () => ({
     startRun: () => !!(engineRef.current && engineRef.current.startRun()),
-    pauseRun: (r) => !!(engineRef.current && engineRef.current.pauseRun(r)),
+    pauseRun: (r) => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.pauseRun(r)); },
     resumeRun: () => !!(engineRef.current && engineRef.current.resumeRun()),
     releasePause: (r) => engineRef.current && engineRef.current.releasePause(r),
-    togglePause: () => engineRef.current && engineRef.current.togglePause(),
-    returnToMenu: () => engineRef.current && engineRef.current.returnToMenu(),
+    togglePause: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.togglePause(); },
+    returnToMenu: () => { inputRef.current?.clear(); return engineRef.current && engineRef.current.returnToMenu(); },
     setDir: (x, y) => engineRef.current && engineRef.current.setDir(x, y),
     setDirMP: (which, x, y) => engineRef.current && engineRef.current.setDirMP(which, x, y),
+    setHeldDir: (x, y) => inputRef.current?.press('pad', 0, x, y),
+    releaseHeldDir: () => inputRef.current?.release('pad'),
     setSpeedPref: (v) => engineRef.current && engineRef.current.setSpeedPref(v),
     setTaDuration: (s) => engineRef.current && engineRef.current.setTaDuration(s),
     chooseUpgrade: (id) => !!(engineRef.current && engineRef.current.chooseUpgrade && engineRef.current.chooseUpgrade(id)),
     reviveRun: () => engineRef.current && engineRef.current.reviveRun ? engineRef.current.reviveRun() : false,
-    undo: () => !!(engineRef.current && engineRef.current.undo && engineRef.current.undo()),
-    restartLevel: () => !!(engineRef.current && engineRef.current.restartLevel && engineRef.current.restartLevel()),
+    undo: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.undo && engineRef.current.undo()); },
+    restartLevel: () => { inputRef.current?.clear(); return !!(engineRef.current && engineRef.current.restartLevel && engineRef.current.restartLevel()); },
+    retrySave: () => engineRef.current?.retrySave?.(),
     setLevel: (i) => !!(engineRef.current && engineRef.current.setLevel && engineRef.current.setLevel(i)),
     isRunning: () => !!(engineRef.current && engineRef.current.isRunning()),
     getState: () => (engineRef.current ? engineRef.current.getState() : 'menu'),
@@ -64,6 +69,13 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
   useEffect(() => {
     const DIRS = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
     const WASD = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
+    const input = createDirectionInput({
+      enabled: () => !!engineRef.current && engineRef.current.getState() === 'playing' && !dialogOpen(),
+      stepMode: () => kindRef.current === 'puzzle',
+      send: (player, x, y, meta) => { const e = engineRef.current; if (!e) return; if (isMPMode(modeRef.current)) e.setDirMP(player, x, y); else e.setDir(x, y, meta); },
+      cancel: (_, source) => engineRef.current?.cancelHeldInput?.(source),
+    });
+    inputRef.current = input;
     function onKeyDown(e) {
       if (e.ctrlKey || e.metaKey || e.altKey) return;
       if (dialogOpen() || typingTarget(e.target)) return; // dialog / input memegang keyboard
@@ -72,30 +84,32 @@ const GameCanvas = forwardRef(function GameCanvas({ mode, onUpdate, speedPref, t
       if (!engine) return;
       // Spasi/Enter milik kontrol UI yang sedang fokus; jangan dicuri. Spasi di luar kontrol hanya dicegah agar halaman tidak scroll.
       if (k === ' ' || k === 'enter') {
-        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); if (modeRef.current === 'puzzle') engine.setDir(0, 0); }
+        if (k === ' ' && !onControl(e.target)) { e.preventDefault(); if (!e.repeat && modeRef.current === 'puzzle') engine.setDir(0, 0); }
         return;
       }
-      if (k === 'escape') { e.preventDefault(); engine.togglePause(); return; }
-      if (k === 'z' || k === 'u') { if (engine.undo) { e.preventDefault(); engine.undo(); } return; } // khusus puzzle
-      if (k === 'r') { if (engine.restartLevel) { e.preventDefault(); engine.restartLevel(); } return; }
+      if (k === 'escape') { e.preventDefault(); if (!e.repeat) { input.clear(); engine.togglePause(); } return; }
+      if (k === 'z' || k === 'u') { if (engine.undo) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.undo(); } } return; }
+      if (k === 'r') { if (engine.restartLevel) { e.preventDefault(); if (!e.repeat) { input.clear(); engine.restartLevel(); } } return; }
       const arrow = DIRS[k];
       if (arrow) e.preventDefault();
       if (isMPMode(modeRef.current)) {
-        if (arrow) engine.setDirMP(0, arrow[0], arrow[1]);
-        else if (WASD[k]) engine.setDirMP(1, WASD[k][0], WASD[k][1]);
+        if (arrow) input.press('key:' + k, 0, arrow[0], arrow[1]);
+        else if (WASD[k]) { e.preventDefault(); input.press('key:' + k, 1, WASD[k][0], WASD[k][1]); }
         return;
       }
       const d = arrow || WASD[k];
-      if (d) engine.setDir(d[0], d[1]);
+      if (d) { e.preventDefault(); input.press('key:' + k, 0, d[0], d[1]); }
     }
+    const onKeyUp = e => input.release('key:' + e.key.toLowerCase());
     window.addEventListener('keydown', onKeyDown);
-    return () => window.removeEventListener('keydown', onKeyDown);
+    window.addEventListener('keyup', onKeyUp);
+    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); input.clear(); inputRef.current = null; };
   }, []);
 
   // Tab disembunyikan / jendela kehilangan fokus = jeda. Kembali ke tab TIDAK melanjutkan:
   // pemain harus menekan Lanjut (atau arah) secara eksplisit.
   useEffect(() => {
-    const hide = () => { const e = engineRef.current; if (e) e.pauseRun('hidden'); };
+    const hide = () => { inputRef.current?.clear(); const e = engineRef.current; if (e) e.pauseRun('hidden'); };
     const show = () => { const e = engineRef.current; if (e) e.releasePause('hidden'); };
     const onVis = () => (document.hidden ? hide() : show());
     document.addEventListener('visibilitychange', onVis);
```

## components/Hud.jsx

```diff
diff --git a/components/Hud.jsx b/components/Hud.jsx
index 5342f3d..2171875 100644
--- a/components/Hud.jsx
+++ b/components/Hud.jsx
@@ -29,7 +29,7 @@ function Hearts({ count }) {
   );
 }
 
-const GUARD_TEXT = { idle: 'patroli', alert: 'terlihat! Kabur sekarang', chase: 'MENGEJAR!', return: 'mencari jalan pulang', stunned: 'pingsan' };
+const GUARD_TEXT = { idle: 'patroli', alert: 'terlihat! Kabur sekarang', chase: 'MENGEJAR!', return: 'mencari jalan pulang', stunned: 'pingsan', windup: 'serangan siap! Hindari petak !', recover: 'celah menyerang' };
 
 // Statistik Puzzle: ikon + teks (status tidak bergantung warna) dan pesan langsung (live region).
 function PuzzleStats({ p }) {
@@ -37,12 +37,14 @@ function PuzzleStats({ p }) {
   return (
     <div className="puzzle-hud">
       <div className="puzzle-stats">
-        <span><StepsI size={14} />Langkah {p.steps} / par {p.par}</span>
+        <span><StepsI size={14} />Langkah {p.steps} · acuan {p.par}</span>
         {p.keys.need > 0 && <span><KeyI size={14} />Kunci {p.keys.have}/{p.keys.need}</span>}
         {p.plates.need > 0 && <span><PlateI size={14} />Sakelar {p.plates.active}/{p.plates.need}</span>}
         <span className="apple-counter"><ICONS.normal size={14} />Apel {p.apples}/{p.applesTotal} <small>bonus</small></span>
         {p.hammer > 0 && <span><ICONS.hammer size={14} />Palu {p.hammer}</span>}
         {p.shield > 0 && <span><ICONS.shield size={14} />Perisai {p.shield}</span>}
+        {p.enemies?.total > 0 && <><span className="dungeon-hearts"><ICONS.heart size={14} fill="currentColor" />{p.hearts}/3 hati</span><span><ICONS.eye size={14} />Musuh {p.enemies.left}/{p.enemies.total}</span></>}
+        {p.levers?.total > 0 && <span><ICONS.lock size={14} />Jeruji {p.levers.active}/{p.levers.total} terbuka</span>}
         {p.guard && <span data-guard={p.guard}><ICONS.eye size={14} />Penjaga: {GUARD_TEXT[p.guard]}</span>}
       </div>
       {!!p.legend?.length && <div className="puzzle-legend">{p.legend.map(l => { const I = ICONS[l.icon]; return <span key={l.icon}><I size={13} />{l.text}</span>; })}</div>}
@@ -196,7 +198,7 @@ export default function Hud({ mode, modeLabel, timerText, effects, score, best,
           {isPuzzle ? (
             <div className="flex items-center gap-1.5 min-w-0">
               <ICONS.puzzle size={20} className="text-[#3b8fb5] shrink-0" />
-              <span className="text-2xl font-bold leading-none tabular-nums">Level {puzzle.levelNo}/{puzzle.levelCount}</span>
+              <span className="text-2xl font-bold leading-none tabular-nums">Ruang {puzzle.levelNo}/{puzzle.levelCount}</span>
             </div>
           ) : (
           <div className="flex items-center gap-1.5 min-w-0">
@@ -262,7 +264,7 @@ export default function Hud({ mode, modeLabel, timerText, effects, score, best,
         <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
           <ICONS.gamepad size={18} className="text-[#5f6368]" />
           <b className="text-[15px] sm:text-[17px] tracking-wide">{String(modeLabel || '').replace(/^Snake/, 'Eat-eat')}</b>
-          {isPuzzle && <span className="text-[13px] font-semibold text-[#3c4043]">Level {puzzle.levelNo}/{puzzle.levelCount} · {puzzle.name}</span>}
+          {isPuzzle && <span className="text-[13px] font-semibold text-[#3c4043]">Ruang {puzzle.levelNo}/{puzzle.levelCount} · {puzzle.name}</span>}
           {mode === 'timeattack' && timerText && (
             <span className="flex items-center gap-1 text-[13px] font-bold text-[#c9432f]">
               <TimerIcon size={14} />{timerText}
```

## components/Overlay.jsx

```diff
diff --git a/components/Overlay.jsx b/components/Overlay.jsx
index bf721b6..f27eb5e 100644
--- a/components/Overlay.jsx
+++ b/components/Overlay.jsx
@@ -44,7 +44,7 @@ const CONFETTI_SIZE = '64px 84px, 78px 96px, 90px 70px, 70px 110px';
 const CONFETTI_POS = '6px 10px, 34px 46px, 54px 8px, 20px 70px';
 
 const DESCRIPTION = {
-  puzzle: 'Cari kunci, pecahkan teka-teki, temukan jalan keluar.',
+  puzzle: 'Cari kunci, buka tuas, pilih bertarung atau menyelinap.',
   delivery: 'Antar paket apel sebelum waktunya habis.',
   roguelite: 'Kumpulkan bekal. Tembus antek. Taklukkan boss.',
   boss: 'Tembus 9 ronde antek, lalu taklukkan boss tiga fase.',
@@ -67,7 +67,7 @@ function ReviveInfo({ data }) {
   return <div className="revive-info"><span><ICONS.heart size={15} />Revive <b>{data.left}/3</b></span><small>{data.resetAt ? `Pulih penuh dalam ${days ? days + ' hari ' : ''}${hours ? hours + ' jam ' : ''}${mins} menit` : 'Pulih penuh 72 jam setelah revive pertama'}</small></div>;
 }
 
-export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, onRevive, onMenu, speed, onSpeedChange, taSecs, onTaChange, puzzleMenu, onSelectLevel, deliveryMenu, rogueMenu, territoryMenu, bossMenu, onHelp }) {
+export default function Overlay({ side, host, visible, phase, mood, title, sub, btnText, mode, onModeChange, onPlay, onRevive, onRetrySave, onMenu, speed, onSpeedChange, taSecs, onTaChange, puzzleMenu, onSelectLevel, deliveryMenu, rogueMenu, territoryMenu, bossMenu, onHelp }) {
   const [busy, setBusy] = useState(false);
   const isTouch = useIsTouch();
   const groups = isTouch ? GROUPS.filter(g => g.key !== 'mp') : GROUPS; // 2P Lokal disembunyikan di HP
@@ -178,7 +178,8 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
       {isPuzzleMode && lv && selLevel && (
         <div className="level-info" role="status" aria-live="polite" aria-atomic="true">
           <div className="coin-wallet"><ICONS.normal size={18} /><b>{lv.coins || 0} koin apel</b><span>Skin ular · rencana mendatang</span></div>
-          <p className="start-description"><span><b>Level {lv.selected + 1}{selLevel.tutorial ? ' (tutorial)' : ''} · {selLevel.tier || selLevel.name}:</b> {selLevel.goal} Par {selLevel.par} langkah.</span></p>
+          {lv.savePending && <div className="save-notice" role="status"><p>Progres masih di sesi ini. Simpan sebelum menutup game.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
+          <p className="start-description"><span><b>Ruang {lv.selected + 1}{selLevel.tutorial ? ' (tutorial)' : ''} · {selLevel.tier || selLevel.name}:</b> {selLevel.goal} Acuan {selLevel.par} langkah.</span></p>
           {selLevel.intro && <p className="level-intro">{selLevel.intro}</p>}
         </div>
       )}
@@ -186,21 +187,21 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
       <div className="adv-controls">
       {isPuzzleMode && lv && (
         <div className="start-settings">
-          <div className="start-menu-heading"><span>Level</span><span>{lv.levels.filter(l => l.cleared).length}/{lv.levels.length} selesai</span></div>
+          <div className="start-menu-heading"><span>Ruang</span><span>{lv.levels.filter(l => l.cleared).length}/{lv.levels.length} selesai</span></div>
           {lv.levels.length > LEVEL_PAGE && (
             <div className="level-pager">
-              <button onClick={() => setLvPage(p => Math.max(0, p - 1))} disabled={lvPage === 0} aria-label="Halaman level sebelumnya"><ICONS.left size={14} /></button>
-              <span aria-live="polite">Level {lvPage * LEVEL_PAGE + 1}–{Math.min(lv.levels.length, (lvPage + 1) * LEVEL_PAGE)}</span>
-              <button onClick={() => setLvPage(p => Math.min(Math.ceil(lv.levels.length / LEVEL_PAGE) - 1, p + 1))} disabled={(lvPage + 1) * LEVEL_PAGE >= lv.levels.length} aria-label="Halaman level berikutnya"><ICONS.right size={14} /></button>
+              <button onClick={() => setLvPage(p => Math.max(0, p - 1))} disabled={lvPage === 0} aria-label="Halaman ruang sebelumnya"><ICONS.left size={14} /></button>
+              <span aria-live="polite">Ruang {lvPage * LEVEL_PAGE + 1}–{Math.min(lv.levels.length, (lvPage + 1) * LEVEL_PAGE)}</span>
+              <button onClick={() => setLvPage(p => Math.min(Math.ceil(lv.levels.length / LEVEL_PAGE) - 1, p + 1))} disabled={(lvPage + 1) * LEVEL_PAGE >= lv.levels.length} aria-label="Halaman ruang berikutnya"><ICONS.right size={14} /></button>
             </div>
           )}
-          <div className="level-list" role="group" aria-label="Pilih level">
+          <div className="level-list" role="group" aria-label="Pilih ruang">
             {lv.levels.map((l, i) => ({ l, i })).slice(lvPage * LEVEL_PAGE, (lvPage + 1) * LEVEL_PAGE).map(({ l, i }) => (
               <button
                 key={l.id}
                 disabled={!l.unlocked}
                 aria-pressed={lv.selected === i}
-                aria-label={`Level ${i + 1}: ${l.name}${l.unlocked ? '' : ', terkunci'}${l.cleared ? (l.legacyBest ? ', selesai di versi lama' : `, rekor ${l.best} langkah`) : ''}`}
+                aria-label={`Ruang ${i + 1}: ${l.name}${l.unlocked ? '' : ', terkunci'}${l.cleared ? (l.legacyBest ? ', selesai di versi lama' : `, rekor ${l.best} langkah`) : ''}`}
                 onClick={() => onSelectLevel && onSelectLevel(i)}
                 className="level-btn"
               >
@@ -311,6 +312,7 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
     </div>
   ) : (
     <div className="result-actions">
+      {isPuzzleMode && lv?.savePending && <div className="save-notice" role="status"><p>Progres belum tersimpan.</p><button onClick={onRetrySave}>Coba simpan lagi</button></div>}
       {phase === 'gameover' && rm && rm.revive.eligible && <>
         <button ref={rm.revive.left ? primaryRef : null} onClick={onRevive} disabled={!rm.revive.left || rm.revive.busy} className="revive-button"><ICONS.heart size={18} />{rm.revive.busy ? 'Menyiapkan…' : `Hidup lagi · ${rm.revive.left}/3`}</button>
         <p className="revive-detail">Lanjut dari rute atau fase ini. Upgrade tetap dibawa.</p>
@@ -343,7 +345,7 @@ export default function Overlay({ side, host, visible, phase, mood, title, sub,
 
   return (
     <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={e => {
-        if (e.key === 'Escape' && phase === 'pause') { e.preventDefault(); onPlay(); }
+        if (e.key === 'Escape' && !e.repeat && phase === 'pause') { e.preventDefault(); onPlay(); }
         if (e.key !== 'Tab') return;
         const buttons = [...e.currentTarget.querySelectorAll('button:not(:disabled)')];
         const index = buttons.indexOf(document.activeElement);
```

## lib/constants.js

```diff
diff --git a/lib/constants.js b/lib/constants.js
index baf03c5..fa70b4f 100644
--- a/lib/constants.js
+++ b/lib/constants.js
@@ -31,7 +31,7 @@ export const MODE_NAMES = {
   mayhemplus: 'Mayhem+',
   timeattack: 'Time Attack',
   multiplayer: '2P Lokal',
-  puzzle: 'Jejak Kunci',
+  puzzle: 'Dungeon',
   delivery: 'Kurir Apel',
   roguelite: 'Ekspedisi Mayhem',
   territory: 'Rebut Arena',
@@ -103,15 +103,16 @@ export const MODE_RULES = {
     { icon: 'wall', text: 'Tabrak tepi arena = game over untuk pemain itu' },
   ],
   puzzle: [
-    { icon: 'steps', text: 'Satu tekan arah = satu langkah. Tidak ada gerak otomatis dan tidak ada waktu.' },
+    { icon: 'steps', text: 'Ketuk arah untuk satu langkah, tahan untuk berjalan berulang. Belok langsung mengikuti arah terbaru. Tanpa batas waktu.' },
     { icon: 'key', text: 'Ambil kunci yang dibutuhkan pintu keluar' },
     { icon: 'plate', text: 'Injak sakelar A/B/C sekali. Semua sakelar syarat tetap aktif sampai level selesai.' },
     { icon: 'normal', text: 'Maskot ular satu petak. Apel emas = koin bonus opsional, tidak menambah panjang. Koin disimpan saat level selesai; replay hanya memberi selisih koleksi terbaik.' },
     { icon: 'portal', text: 'Portal berangka sama saling berpasangan: masuk satu ujung, muncul di ujung lainnya' },
     { icon: 'exit', text: 'Gembok = pintu belum terbuka; panah = syarat terpenuhi' },
     { icon: 'shield', text: 'Duri (segitiga) hanya bisa dilewati dengan Perisai (S), batu krem retak dengan Palu (P). Keduanya sekali pakai.' },
-    { icon: 'lock', text: 'Pagar kayu bergantian buka/tutup tiap giliran. Panah = bisa lewat di giliran berikut, palang = tertutup. Spasi / Tunggu memajukan satu giliran.' },
-    { icon: 'eye', text: 'Penjaga mengikuti jejak patroli. Masuk area pandangnya memicu ! selama satu giliran sebelum mengejar. Kabur ke semak atau hilang dari pandangan; Perisai menahan satu sengatan.' },
+    { icon: 'lock', text: 'Injak tuas untuk membuka jeruji yang terhubung secara permanen. Spasi / Tunggu melewatkan satu giliran.' },
+    { icon: 'eye', text: 'Slime punya 1 HP dan bergerak tiap dua giliran; penjaga batu punya 2 HP. Arah ke musuh = pukul, tanpa maju. Petak ! adalah sasaran serangan giliran berikutnya. Hindari atau serang dulu; Perisai menahan satu pukulan.' },
+    { icon: 'heart', text: 'Mulai dengan 3 hati. Maksimal satu hati hilang per giliran, lalu kebal satu giliran. Ramuan hati memulihkan 1, maksimal 3. Keluar cukup dengan kunci dan sakelar; mengalahkan musuh opsional.' },
     { icon: 'undo', text: 'Z = undo langkah (bisa berulang), R = ulang level. Gerakan yang tertahan tidak memakai langkah.' },
   ],
   delivery: [
```

## lib/modes/registry.js

```diff
diff --git a/lib/modes/registry.js b/lib/modes/registry.js
index c6a8674..901efa9 100644
--- a/lib/modes/registry.js
+++ b/lib/modes/registry.js
@@ -26,9 +26,9 @@ export const MODES = [
   { id: 'impossible', label: 'Impossible', short: 'Impossible', group: 'mayhem', kind: 'arcade', players: 1, touch: true, speedMode: 'locked', controls: ARCADE_CTRL, finish: 'Berakhir saat menabrak, terkena ranjau, atau terlalu pendek.', description: 'Tantangan ekstrem dengan kecepatan Ngebut.' },
   { id: 'multiplayer', label: '2P Lokal', short: '2P Lokal', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Berebut apel berdua dengan satu keyboard.' },
   { id: 'mayhemduo', label: 'Mayhem Duo', short: 'Mayhem Duo', group: 'mp', kind: 'arcade', players: 2, touch: false, speedMode: 'pref', controls: 'P1 panah, P2 WASD (satu keyboard)', finish: 'Skor 50 menang, atau lawan kehabisan nyawa.', description: 'Duel berdua dengan efek acak dan ranjau.' },
-  { id: 'puzzle', label: 'Jejak Kunci', short: 'Jejak Kunci', group: 'adventure', kind: 'puzzle', players: 1, touch: true, speedMode: 'none', controls: 'Panah / WASD / geser = satu langkah. Z undo, R ulang level.', finish: 'Selesai saat kepala masuk pintu keluar yang syaratnya terpenuhi. Tersengat penjaga = game over.', description: 'Puzzle berbasis langkah, 50 level makin sulit: kunci, sakelar, portal, duri, gerbang, dan patroli penjaga.',
+  { id: 'puzzle', label: 'Dungeon', short: 'Dungeon', group: 'adventure', kind: 'puzzle', players: 1, touch: true, speedMode: 'none', controls: 'Panah / WASD / geser = satu langkah. Z undo, R ulang level.', finish: 'Selesai saat kepala masuk pintu keluar yang syaratnya terpenuhi. Tiga hati habis = game over.', description: 'Jelajahi 50 ruang: cari kunci, buka tuas, hindari jebakan, dan hadapi dua jenis musuh.',
     goal: 'Selesaikan 50 level (5 tutorial, lalu 45 buatan sistem) dengan langkah sesedikit mungkin.',
-    preview: ['Satu tekan arah = satu langkah, tanpa waktu. Gerakan yang tertahan tidak memakai langkah.', 'Ambil kunci dan injak sakelar sekali. Maskot satu petak; apel emas adalah koin bonus untuk rencana skin.', 'Penjaga berpatroli. Tanda ! memberi satu giliran untuk kabur. Sembunyi di semak; Spasi / Tunggu melewatkan giliran.', 'Undo (Z) bisa berulang; R mengulang level.'] },
+    preview: ['Ketuk untuk satu langkah, tahan untuk berjalan; tanpa batas waktu. Gerakan yang tertahan tidak memakai langkah.', 'Ambil kunci dan injak sakelar sekali. Maskot satu petak; apel emas adalah koin bonus untuk rencana skin.', 'Tiga hati. Slime 1 HP, penjaga batu 2 HP. Arah ke musuh = serang. Hindari petak ! sebelum giliran berikutnya; tuas membuka jeruji permanen.', 'Undo (Z) bisa berulang; R mengulang level.'] },
   { id: 'delivery', label: 'Kurir Apel', short: 'Kurir Apel', group: 'adventure', kind: 'delivery', players: 1, touch: true, speedMode: 'pref', controls: 'Panah / WASD, atau geser layar. Esc jeda.', finish: 'Shift berakhir saat waktu habis: menang bila terkirim >= 5, kalah bila kurang atau menabrak.', description: 'Ambil paket, antar ke rumah yang tepat sebelum paket basi. Satu shift penuh.',
     goal: 'Antar minimal 5 paket dalam satu shift tanpa menabrak.',
     duration: { fixedSec: 120, label: '120 detik (tetap)' },
```

## lib/progress.js

```diff
diff --git a/lib/progress.js b/lib/progress.js
index d72cf53..e66c938 100644
--- a/lib/progress.js
+++ b/lib/progress.js
@@ -30,6 +30,21 @@ export function parseProgress(raw) {
 export const loadProgress = () => parseProgress(read(PROGRESS_KEY));
 export const saveProgress = (p) => write(PROGRESS_KEY, JSON.stringify(p));
 
+// Gabungkan hasil lokal yang belum tersimpan dengan hasil terbaru dari tab lain.
+export function mergeProgress(local, disk) {
+  const a = parseProgress(JSON.stringify(local)), b = parseProgress(JSON.stringify(disk));
+  const levels = { ...a.puzzle.levels };
+  Object.entries(b.puzzle.levels).forEach(([id, record]) => {
+    const old = levels[id];
+    if (!old) { levels[id] = { ...record }; return; }
+    const ar = old.revision || 1, br = record.revision || 1;
+    const best = ar === br ? Math.min(old.best, record.best) : ar > br ? old.best : record.best;
+    const revision = Math.max(ar, br), coins = Math.max(old.coins || 0, record.coins || 0);
+    levels[id] = { best, ...(revision > 1 ? { revision } : {}), ...(coins ? { coins } : {}) };
+  });
+  return { v: 1, puzzle: { levels } };
+}
+
 // Murni: catat hasil level. Replay tidak merusak rekor (best = minimum). `firstClear` hanya benar sekali per level.
 export function recordPuzzleResult(progress, levelId, steps, revision = 1, apples = 0) {
   const prev = progress.puzzle.levels[levelId];
```

## lib/puzzle/campaign.js

```diff
diff --git a/lib/puzzle/campaign.js b/lib/puzzle/campaign.js
index 717c340..a50a388 100644
--- a/lib/puzzle/campaign.js
+++ b/lib/puzzle/campaign.js
@@ -1,4 +1,4 @@
-// Kampanye "Jejak Kunci": level 1..5 = tutorial buatan tangan (levels.js), level 6..50 = buatan sistem (campaignData.js).
+// Kampanye "Dungeon": level 1..5 = tutorial buatan tangan (levels.js), level 6..50 = buatan sistem (campaignData.js).
 // Seed kampanye TETAP supaya id level (dan progres tersimpan) stabil antar sesi dan antar pemain.
 import { RAW_LEVELS, loadLevels } from './levels';
 import { CAMPAIGN_SPECS } from './campaignData';
@@ -9,6 +9,6 @@ export const CAMPAIGN_SEED = 0;
 const tutorialSpecs = RAW_LEVELS.map(s => ({ ...s, tier: 'Tutorial', intro: null }));
 const loaded = loadLevels([...tutorialSpecs, ...CAMPAIGN_SPECS]);
 // Metadata tampilan (tier, kartu pengantar, tutorial?) ditempel ke objek level hasil build.
-const metaById = Object.fromEntries([...tutorialSpecs, ...CAMPAIGN_SPECS].map((s, i) => [s.id, { tier: s.tier, intro: s.intro || null, tutorial: i < tutorialSpecs.length, revision: 3 }]));
+const metaById = Object.fromEntries([...tutorialSpecs, ...CAMPAIGN_SPECS].map((s, i) => [s.id, { tier: s.tier, intro: s.intro || null, tutorial: i < tutorialSpecs.length, revision: 4 }]));
 export const CAMPAIGN_LEVELS = loaded.levels.map(l => ({ ...l, ...metaById[l.id] }));
 export const CAMPAIGN_REJECTED = loaded.rejected;
```

## lib/puzzle/campaignData.js

```diff
diff --git a/lib/puzzle/campaignData.js b/lib/puzzle/campaignData.js
index a0f3824..d66fe02 100644
--- a/lib/puzzle/campaignData.js
+++ b/lib/puzzle/campaignData.js
@@ -1,4 +1,4 @@
 // DIBUAT OTOMATIS oleh scripts/build-campaign.mjs dari generator (seed kampanye tetap). Jangan diedit tangan.
 // Level 6..50 "Jejak Kunci". Generator dijalankan di luar runtime karena butuh sampai ~1,5 dtk per level.
-export const CAMPAIGN_SPECS = [{ "id": "gen-6", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 14, "map": ["#############", "#...#...#...#", "##..#...#...#", "#...........#", "#...#.F.#...#", "#...#...#.E.#", "#.K.#.#.#...#", "#############"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-7", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#.....##...#", "#....##.K..#", "#.....#...F#", "#.....#E..##", "#..........#", "#.....#....#", "############"], "snake": [[5, 1]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-8", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#....#.....#", "#..F##.....#", "#........E.#", "#.#..#.....#", "#....#.....#", "#K...#.....#", "#....#.....#", "############"], "snake": [[4, 7]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-9", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["###########", "#.........#", "#.....#...#", "##....#...#", "#.....#...#", "#.....#...#", "#F..K.#.E.#", "###########"], "snake": [[5, 3]], "dir": "U", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-10", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["#############", "#...#.......#", "#...#...E...#", "#FK.#.....#.#", "#.#.#.......#", "#...........#", "#...#.......#", "#...#.......#", "#############"], "snake": [[2, 7]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-11", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 16, "map": ["############", "#.....#....#", "#K.#..#....#", "#..........#", "#....##....#", "#..F..#....#", "#.....#E...#", "############"], "snake": [[5, 2]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-12", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["#############", "#......##...#", "#......#.F.##", "#......#....#", "#........#..#", "#......#....#", "#......#E..K#", "#############"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-13", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": "Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.......#..E#", "#.#.#...#K.##", "#...#.1.#.#.#", "#...#...#...#", "#...#...#...#", "#K..#.F.#.F.#", "#...#...#1..#", "#############"], "snake": [[2, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-14", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["##############", "#...#....#.1.#", "##..#.1..#...#", "#...#....#...#", "#..##....#...#", "#...#....#.K.#", "#...#.#.F#.#.#", "#........#E..#", "##############"], "snake": [[1, 7]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-15", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["############", "#...#.#....#", "##F...#...K#", "#.F...#..K.#", "#.......####", "#.....#.a.E#", "#..#..#.####", "#.....#....#", "############"], "snake": [[1, 6]], "dir": "U", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-16", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["##############", "#...#....#...#", "#...#......#.#", "#K..#....#..##", "#...##...#..E#", "#...#....#...#", "#...#.F.K#...#", "#.F......#...#", "##############"], "snake": [[1, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-17", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#...##..#..E#", "#.......#..K#", "#.F##...#.FK#", "#...#...#...#", "#...#...#...#", "#...#.......#", "#############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-18", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#############", "#...#...#.E.#", "#...#...#...#", "#.....F.#...#", "##..#...#...#", "#...#.......#", "#..##...#...#", "#K..#F#.#K..#", "#############"], "snake": [[1, 3]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-19", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["############", "#..........#", "#.#F#......#", "#...#...####", "#.F.##..a.E#", "#...#K..####", "#...#.....##", "############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-20", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": "Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#...#...#...#", "#K..#.#.#...#", "#.F.#...#..F#", "#.#.^...##.1#", "#...#.#.#..E#", "#...#...#...#", "#.S.#..1#K..#", "#############"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-21", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#.F.#...#.....#", "#...#...#..####", "#...#...#..a.E#", "#..##...#..####", "#K..x...#.....#", "#P..#.#.#.....#", "#...#.......#.#", "###############"], "snake": [[2, 3]], "dir": "U", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-22", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#P......#E..#", "##..#...#...#", "#..K#...##..#", "#...#...x...#", "#K..#...#...#", "#.#F#...#...#", "#############"], "snake": [[2, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-23", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["###############", "#....#..F#..F##", "#....#...#.####", "#....#..##.a.E#", "##..K#...#.####", "#.......1#....#", "#K...#..##..1.#", "###############"], "snake": [[4, 6]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-24", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["#############", "#...#..K#...#", "#...#...#...#", "#..........##", "#...#...#E..#", "#..F#...#...#", "#...#...#..##", "#.#.#...#K..#", "#############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-25", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "##..#....#.F..#", "#...#....#.####", "#...#....#.a.E#", "#K.......#.####", "#...#....#....#", "#.FS#....^..#.#", "###############"], "snake": [[2, 3]], "dir": "D", "exit": { "keys": 1, "plates": ["a"] }, "guards": [] }, { "id": "gen-26", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#############", "#...^.K.x...#", "#...#...#...#", "#...#..F#...#", "##S.#...#F..#", "#...###.#...#", "#...##..#...#", "#..P#...#.E.#", "#############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [] }, { "id": "gen-27", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#...K#...##.#.#", "#....#...K#1..#", "#....#.F..#..##", "#....#1#..#...#", "#.........#E.F#", "###############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-28", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": "Baru: Gerbang bergantian. Pagar terbuka bergantian tiap langkah. Panah = bisa lewat pada giliran berikut; palang = tertutup. Tekan Spasi atau Tunggu untuk menunggu.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["##############", "#...##P..#...#", "#...#....#...#", "##.K##...#...#", "#.F.#....#...#", "#...#....#...#", "###.h....#E..#", "#..K#....x...#", "##############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-29", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["###############", "#....#....#..K#", "#....#....#.K.#", "#....##...#.#.#", "#.S..g....#...#", "#....#....#.F.#", "#....#....#...#", "#....#..#.^.E.#", "#....#.##.#...#", "###############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-30", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#....#...x...F.#", "#....#...#.....#", "#....#.KP#..#..#", "#....#...#.#..##", "#....#...#.....#", "#....#K..#.....#", "#.P..#...#..E..#", "#....#...##....#", "#....x...#.....#", "################"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-31", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 25, "map": ["##############", "##..x.K##.#..#", "#...#..##.K..#", "#.P.#...#.####", "#F..#.#P#.a.E#", "#...#...x.####", "##############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-32", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["################", "#.#..#K........#", "#...##.#...#...#", "#...K#.....#...#", "#....#F....#...#", "#..F.#.....#...#", "#P...x..#..#...#", "#....#.....#..##", "#....#.....#E..#", "################"], "snake": [[1, 7]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-33", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["###############", "#S..#..##...F.#", "#K..#...#.#####", "#...##..#.a..E#", "#...#...#.#####", "#.#.#...^.K...#", "#.......#.....#", "#...#...#F....#", "###############"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-34", "name": "Gerbang Bergantian", "tier": "Gerbang Bergantian", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#...#....#.....#", "#...#....#..E..#", "#...#....#...F.#", "#.#S#...K#.....#", "#K..##...#..#..#", "#...#....#.....#", "#...^....#.....#", "#...#..1.#.....#", "#..F#....#....1#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [] }, { "id": "gen-35", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": "Baru: Penjaga. Ia berpatroli. Tanda ! memberi satu giliran sebelum mengejar posisi terakhirmu. Sembunyi di semak agar ia pulang. Tersengat = game over.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 19, "map": ["################", "#....##.F.F#...#", "#..###.....#...#", "#..F.#v....#...#", "#....#.K.#.#..E#", "#K...^.v.......#", "#....#.....#...#", "#S...#.....#...#", "#....#.v...#...#", "################"], "snake": [[2, 7]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 1, "dir": "D", "range": 3, "patrol": [[13, 1], [13, 2], [14, 2], [14, 1]] }] }, { "id": "gen-36", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["###############", "#.#.#F.......F#", "#...#..F.##...#", "#...#.v..#..#.#", "#........#K...#", "#...#....#...E#", "#..##....#....#", "#...#....#..K.#", "#...#....#...v#", "#...#...v#....#", "###############"], "snake": [[1, 9]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 10, "y": 8, "dir": "U", "range": 3, "patrol": [[10, 8], [10, 7], [11, 7], [11, 6], [11, 5]] }] }, { "id": "gen-37", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#################", "#....#.F..x.....#", "#....#.P#.#..####", "#....#....#..a.E#", "#....#v...#.F####", "#....#....#..#.##", "#....#.K..#.....#", "#....#.K..#v....#", "#.#..#....#.....#", "#....h....#.....#", "#################"], "snake": [[3, 3]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 15, "y": 9, "dir": "L", "range": 3, "patrol": [[15, 9], [14, 9], [13, 9], [12, 9], [11, 9]] }] }, { "id": "gen-38", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#....#F.###.#vE#", "#....^....#....#", "#....#....#....#", "#.F..#....#.v.1#", "#....#....#....#", "#....#K...#.K..#", "#.#..#...1#....#", "#.SF.#....#v...#", "#....#....#...##", "################"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 12, "y": 8, "dir": "R", "range": 3, "patrol": [[12, 8], [13, 8], [14, 8], [14, 7], [14, 6]] }] }, { "id": "gen-39", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["###############", "#...#K...#.a.E#", "#...#...K#.####", "#.F.#....x....#", "#...#....#...##", "#.......F#..#.#", "#...#..#v#.#..#", "#...#v.P.#.v..#", "###############"], "snake": [[2, 4]], "dir": "L", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 10, "y": 7, "dir": "U", "range": 3, "patrol": [[10, 7], [10, 6], [10, 5], [11, 5], [11, 4]] }] }, { "id": "gen-40", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 34, "map": ["###############", "#...#S....#..E#", "#..K#.....^..##", "#...#vv...#...#", "#...#v....##.F#", "#...h.....#...#", "##.##.....#K..#", "#...#F....#...#", "###############"], "snake": [[1, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 12, "y": 6, "dir": "R", "range": 3, "patrol": [[12, 6], [13, 6], [13, 7], [12, 7], [11, 7]] }] }, { "id": "gen-41", "name": "Gerbang Bergantian", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Gerbang hanya terbuka pada langkah genap/ganjil. Koin apel opsional, disimpan setelah keluar.", "par": 36, "map": ["################", "#...#...#.#....#", "#...#.....g....#", "#..1#.....#...K#", "#...##....#....#", "#...#.....#.####", "#...#.....#.a.E#", "#.KF#.....#.####", "#..##.....#....#", "#.#.#.#1.F#....#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": ["a"] }, "guards": [] }, { "id": "gen-42", "name": "Penjaga Kebun", "tier": "Penjaga Kebun", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["#################", "#F..##...S#.....#", "#....#....#.....#", "#....^....#.....#", "#..#S#....^.....#", "#..#.#v.#.#.F.E.#", "#..K.#.#..#..K..#", "#....#....#.vF..#", "#################"], "snake": [[1, 3]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 15, "y": 7, "dir": "U", "range": 3, "patrol": [[15, 7], [15, 6], [15, 5], [15, 4], [14, 4]] }] }, { "id": "gen-43", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 26, "map": ["################", "#...#....g.#####", "#...#.v..#..a.E#", "#F..#....#######", "#...#....#.....#", "#...#....#.....#", "#...#.F..#.....#", "#.KK#v.v.#.....#", "#1..#.1..#.....#", "################"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [{ "x": 10, "y": 8, "dir": "U", "range": 3, "patrol": [[10, 8], [10, 7], [11, 7], [11, 8], [12, 8]] }] }, { "id": "gen-44", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["#################", "#...#..v#...#...#", "#...#Fv.....##..#", "#...#...#...#.K.#", "#F.F#...#...#v..#", "#..##...#.#.....#", "#...#1#.#...#..E#", "#...#...#...#...#", "#.#.#...#...#...#", "#.1K#...#...#...#", "#################"], "snake": [[2, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 9, "y": 6, "dir": "D", "range": 3, "patrol": [[9, 6], [9, 7], [10, 7], [10, 6], [11, 6]] }] }, { "id": "gen-45", "name": "Penjaga Kebun", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["################", "#....#.#...#...#", "#....#.........#", "#...K#...F.##..#", "#..K.#.v...#...#", "#....#.....#..v#", "#..........#...#", "#....##....#E..#", "#....#.....#...#", "#....#....F#v..#", "################"], "snake": [[2, 8]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 4, "dir": "U", "range": 3, "patrol": [[13, 4], [13, 3], [13, 2], [13, 1], [12, 1]] }] }, { "id": "gen-46", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 31, "map": ["###############", "#....##..v#...#", "#....^....^...#", "#....#...v#..K#", "#....#F.KK#.E.#", "#....#F#..#...#", "##.SF#.S..#.v.#", "#...###...#...#", "###############"], "snake": [[4, 1]], "dir": "R", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 13, "y": 1, "dir": "D", "range": 3, "patrol": [[13, 1], [13, 2], [12, 2], [12, 1], [11, 1]] }] }, { "id": "gen-47", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 40, "map": ["#################", "#...#.#.#...#..v#", "#F.P#...#...#.v.#", "#...#...#.......#", "#...#...x...#...#", "#...#.FK#...#..E#", "#...#...#...#..v#", "#..S#...#..v#..K#", "#F..#...#...#..##", "#...#K..#...#.#.#", "##..#...#...##..#", "#...^...#...#.#.#", "#################"], "snake": [[2, 6]], "dir": "D", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 10, "y": 11, "dir": "L", "range": 3, "patrol": [[10, 11], [9, 11], [9, 10], [9, 9], [10, 9]] }] }, { "id": "gen-48", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#SF.#....F##vKv#", "#...^......#...#", "#.#.#...1..#.vE#", "#...#......#1#.#", "#...#......#...#", "#...#......#.K.#", "#...#..v...#...#", "################"], "snake": [[2, 4]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 13, "y": 5, "dir": "L", "range": 3, "patrol": [[13, 5], [12, 5], [12, 6], [12, 7], [13, 7]] }] }, { "id": "gen-49", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 3 kunci dulu. Pakai portal untuk pindah ruang. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#################", "#...##..#.v.#E..#", "#...#..1#.......#", "#..##.F.#..v#...#", "#...#...#...#...#", "#K......#1..#...#", "#...#..K##F.#...#", "#..K#...#...#.v.#", "#...#...#...#...#", "#...#v..#.#.#.F.#", "#################"], "snake": [[2, 7]], "dir": "U", "exit": { "keys": 3, "plates": [] }, "guards": [{ "x": 13, "y": 8, "dir": "R", "range": 3, "patrol": [[13, 8], [14, 8], [15, 8], [15, 9]] }] }, { "id": "gen-50", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Gerbang hanya terbuka pada langkah genap/ganjil. Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran. Koin apel opsional, disimpan setelah keluar.", "par": 44, "map": ["#################", "#...#...#...#...#", "#...#...h.#.#...#", "#...##.##...#...#", "#...x...#...#v..#", "#...#v..#...#...#", "#.P.#...#...##..#", "#...#...#...#...#", "#...#...#...#...#", "#...#.F.#...x...#", "#F..#Pv.#.K.#..E#", "#...#...#..K#..v#", "#################"], "snake": [[3, 5]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 14, "y": 4, "dir": "D", "range": 3, "patrol": [[14, 4], [14, 5], [14, 6], [15, 6], [15, 5]] }] }
+export const CAMPAIGN_SPECS = [{ "id": "gen-6", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 14, "map": ["#############", "#...#...#...#", "##..#...#...#", "#...........#", "#...#.F.#...#", "#...#...#.E.#", "#.K.#.#.#...#", "#############"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-7", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#.....##...#", "#....##.K..#", "#.....#...F#", "#.....#E..##", "#..........#", "#.....#....#", "############"], "snake": [[5, 1]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-8", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 15, "map": ["############", "#....#.....#", "#..F##.....#", "#........E.#", "#.#..#.....#", "#....#.....#", "#K...#.....#", "#....#.....#", "############"], "snake": [[4, 7]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-9", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["###########", "#.........#", "#.....#...#", "##....#...#", "#.....#...#", "#.....#...#", "#F..K.#.E.#", "###########"], "snake": [[5, 3]], "dir": "U", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-10", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["#############", "#...#.......#", "#...#...E...#", "#FK.#.....#.#", "#.#.#.......#", "#...........#", "#...#.......#", "#...#.......#", "#############"], "snake": [[2, 7]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-11", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 16, "map": ["############", "#.....#....#", "#K.#..#....#", "#..........#", "#....##....#", "#..F..#....#", "#.....#E...#", "############"], "snake": [[5, 2]], "dir": "R", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-12", "name": "Lorong Kunci", "tier": "Lorong Kunci", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 18, "map": ["#############", "#......##...#", "#......#.F.##", "#......#....#", "#........#..#", "#......#....#", "#......#E..K#", "#############"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-13", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": "Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.......#..E#", "#.#.#...#K.##", "#...#.1.#.#.#", "#...#...#...#", "#...#...#...#", "#K..#.F.#.F.#", "#...#...#1..#", "#############"], "snake": [[2, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-14", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 17, "map": ["##############", "#...#....#.1.#", "##..#.1..#...#", "#...#....#...#", "#..##....#...#", "#...#....#.K.#", "#...#.#.F#.#.#", "#........#E..#", "##############"], "snake": [[1, 7]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-15", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["############", "#...#.#....#", "##F...#...K#", "#.F...#..K.#", "#.......####", "#.....#.a.E#", "#..#..#.####", "#.....#....#", "############"], "snake": [[1, 6]], "dir": "U", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-16", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["##############", "#...#....#...#", "#...#......#.#", "#K..#....#..##", "#...##...#..E#", "#...#....#...#", "#...#.F.K#...#", "#.F......#...#", "##############"], "snake": [[1, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-17", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#...##..#..E#", "#.......#..K#", "#.F##...#.FK#", "#...#...#...#", "#...#...#...#", "#...#.......#", "#############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-18", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["#############", "#...#...#.E.#", "#...#...#...#", "#.....F.#...#", "##..#...#...#", "#...#.......#", "#..##...#...#", "#K..#F#.#K..#", "#############"], "snake": [[1, 3]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-19", "name": "Lompatan Portal", "tier": "Lompatan Portal", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["############", "#..........#", "#.#F#......#", "#...#...####", "#.F.##..a.E#", "#...#K..####", "#...#.....##", "############"], "snake": [[1, 6]], "dir": "L", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-20", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": "Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#...#...#...#", "#K..#.#.#...#", "#.F.#...#..F#", "#.#.^...##.1#", "#...#.#.#..E#", "#...#...#...#", "#.S.#..1#K..#", "#############"], "snake": [[1, 6]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-21", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#.F.#...#.....#", "#...#...#..####", "#...#...#..a.E#", "#..##...#..####", "#K..x...#.....#", "#P..#.#.#.....#", "#...#.......#.#", "###############"], "snake": [[2, 3]], "dir": "U", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-22", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["#############", "#P......#E..#", "##..#...#...#", "#..K#...##..#", "#...#...x...#", "#K..#...#...#", "#.#F#...#...#", "#############"], "snake": [[2, 2]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-23", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 21, "map": ["###############", "#....#..F#..F##", "#....#...#.####", "#....#..##.a.E#", "##..K#...#.####", "#.......1#....#", "#K...#..##..1.#", "###############"], "snake": [[4, 6]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-24", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["#############", "#...#..K#...#", "#...#...#...#", "#..........##", "#...#...#E..#", "#..F#...#...#", "#...#...#..##", "#.#.#...#K..#", "#############"], "snake": [[3, 2]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-25", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "##..#....#.F..#", "#...#....#.####", "#...#....#.a.E#", "#K.......#.####", "#...#....#....#", "#.FS#....^..#.#", "###############"], "snake": [[2, 3]], "dir": "D", "exit": { "keys": 1, "plates": ["a"] }, "guards": [], "links": [] }, { "id": "gen-26", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil kunci dulu. Duri butuh Perisai. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 24, "map": ["#############", "#...^.K.x...#", "#...#...#...#", "#...#..F#...#", "##S.#...#F..#", "#...###.#...#", "#...##..#...#", "#..P#...#.E.#", "#############"], "snake": [[3, 4]], "dir": "D", "exit": { "keys": 1, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-27", "name": "Duri dan Retak", "tier": "Duri dan Retak", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["###############", "#...K#...##.#.#", "#....#...K#1..#", "#....#.F..#..##", "#....#1#..#...#", "#.........#E.F#", "###############"], "snake": [[2, 2]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-28", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": "Baru: Tuas. Injak tuas kuningan untuk membuka gerbang permanen. Tidak ada hitungan genap/ganjil.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["##############", "##!.#..K.#..##", "#.#.#..K.#...#", "#...#....#...#", "##.F#....#...#", "#...#P...#.#.#", "#...G....x..E#", "#...#....#...#", "##############"], "snake": [[2, 6]], "dir": "U", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [4, 6], "lever": [2, 1] }] }, { "id": "gen-29", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Duri butuh Perisai. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["###############", "#S...#....#...#", "#....#....#...#", "#....#....^.E.#", "##!..G....#.#.#", "#....#....##F##", "#....#....#...#", "#...K#...K#.#.#", "#....#....#...#", "###############"], "snake": [[2, 7]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [5, 4], "lever": [2, 4] }] }, { "id": "gen-30", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Koin apel opsional, disimpan setelah keluar.", "par": 28, "map": ["################", "#....#...x...F.#", "#....#...#.....#", "#....#.KP#..#..#", "#....#...#.#..##", "#....#...#.....#", "#....#K..#.....#", "#.P..#...#..E..#", "#....#...##....#", "#....x...#.....#", "################"], "snake": [[2, 5]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-31", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 27, "map": ["##############", "#...#...##..E#", "#...#....#...#", "#...#.#.F#.#.#", "#!..#..1##...#", "#...#....#.1.#", "#...#....#...#", "#...G.K..##..#", "#...#....#...#", "#...#.K..#...#", "##############"], "snake": [[3, 8]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [4, 7], "lever": [1, 4] }] }, { "id": "gen-32", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Tembok retak butuh Palu. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 29, "map": ["###############", "#...#.#...#.E.#", "#.F...#...#..##", "#P....#...#...#", "#.....#...#K..#", "#.....x...#...#", "#....##...#...#", "#.....#...#..K#", "#.....#!..G...#", "###############"], "snake": [[1, 5]], "dir": "D", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [{ "gate": [10, 8], "lever": [7, 8] }] }, { "id": "gen-33", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak sakelar; tetap aktif sampai level selesai. Injak tuas untuk membuka gerbang permanen. Koin apel opsional, disimpan setelah keluar.", "par": 30, "map": ["###############", "#...#...G.....#", "#......##..####", "###.#!.##..a.E#", "#...#...#..####", "#K..#K..#...F.#", "###############"], "snake": [[3, 1]], "dir": "R", "exit": { "keys": 2, "plates": ["a"] }, "guards": [], "links": [{ "gate": [8, 1], "lever": [5, 3] }] }, { "id": "gen-34", "name": "Ruang Tuas", "tier": "Ruang Tuas", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Pakai portal untuk pindah ruang. Duri butuh Perisai. Koin apel opsional, disimpan setelah keluar.", "par": 32, "map": ["################", "#...#....#.....#", "#...#....#..E..#", "#...#....#...F.#", "#.#S#...K#.....#", "#K..##...#..#..#", "#...#....#.....#", "#...^....#.....#", "#...#..1.#.....#", "#..F#....#....1#", "################"], "snake": [[1, 1]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [], "links": [] }, { "id": "gen-35", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": "Baru: Dungeon dijaga musuh. Tiga hati; tekan arah ke musuh untuk menyerang. Hindari petak serangan yang ditandai. Slime 1 HP, penjaga 2 HP.", "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.!Fv#..K.#", "#....#....#", "#....G...E#", "#....#..F.#", "#.HK.#.#..#", "#....#....#", "###########"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 7, "y": 3, "kind": "slime", "dir": "D", "patrol": [[7, 3], [7, 4], [7, 5]] }], "links": [{ "gate": [5, 4], "lever": [2, 2] }] }, { "id": "gen-36", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#..#.#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K..#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-37", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#....#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K#.#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-38", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.HK.#..K.#", "#....#....#", "#....G...E#", "#....#....#", "#.!Fv#.#..#", "#....#..F.#", "###########"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 7, "y": 5, "kind": "slime", "dir": "U", "patrol": [[7, 5], [7, 4], [7, 3]] }], "links": [{ "gate": [5, 4], "lever": [2, 6] }] }, { "id": "gen-39", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.K#.#.KH.#", "#....#....#", "#E...G....#", "#....#....#", "#....#vF!.#", "#.F..#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 5, "kind": "warden", "dir": "U", "patrol": [[3, 5], [3, 4], [3, 3]] }], "links": [{ "gate": [5, 4], "lever": [8, 6] }] }, { "id": "gen-40", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#....#.KH.#", "#.F..#....#", "#E...G....#", "#....#....#", "#.K#.#vF!.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 5, "kind": "warden", "dir": "U", "patrol": [[3, 5], [3, 4], [3, 3]] }], "links": [{ "gate": [5, 4], "lever": [8, 6] }] }, { "id": "gen-41", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#....#....#", "#.K..#vF!.#", "#....#....#", "#E...G....#", "#.F..#....#", "#..#.#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "warden", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-42", "name": "Penjaga Dungeon", "tier": "Penjaga Dungeon", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 20, "map": ["###########", "#.F..#....#", "#..#.#vF!.#", "#....#....#", "#E...G....#", "#....#....#", "#.K..#.KH.#", "#....#....#", "###########"], "snake": [[9, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 3, "y": 3, "kind": "warden", "dir": "D", "patrol": [[3, 3], [3, 4], [3, 5]] }], "links": [{ "gate": [5, 4], "lever": [8, 2] }] }, { "id": "gen-43", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.K...#v.F!.#", "#.....#.....#", "#E....G.....#", "#.F...#.....#", "#..#..#..KH.#", "#.....#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 3, "kind": "warden", "dir": "D", "patrol": [[4, 3], [4, 4], [4, 5]] }, { "x": 9, "y": 5, "kind": "slime", "dir": "U", "patrol": [[9, 5], [9, 4], [10, 4], [10, 5]] }], "links": [{ "gate": [6, 4], "lever": [10, 2] }] }, { "id": "gen-44", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#...F.#", "#.!F.v#..#..#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.HK..#...K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 3, "kind": "warden", "dir": "D", "patrol": [[8, 3], [8, 4], [8, 5]] }, { "x": 3, "y": 5, "kind": "slime", "dir": "U", "patrol": [[3, 5], [3, 4], [2, 4], [2, 5]] }], "links": [{ "gate": [6, 4], "lever": [2, 2] }] }, { "id": "gen-45", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#.....#.....#", "#..#..#..KH.#", "#.F...#.....#", "#E....G.....#", "#.....#.....#", "#.K...#v.F!.#", "#.F...#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-46", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.K...#..KH.#", "#.....#.....#", "#E....G.....#", "#.....#.....#", "#..#..#v.F!.#", "#.F...#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-47", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.HK..#..#K.#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.!F.v#.....#", "#.....#...F.#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 5, "kind": "warden", "dir": "U", "patrol": [[8, 5], [8, 4], [8, 3]] }, { "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [2, 4], [2, 3]] }], "links": [{ "gate": [6, 4], "lever": [2, 6] }] }, { "id": "gen-48", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#...F.#", "#.!F.v#..#..#", "#.....#.....#", "#.....G....E#", "#.....#.....#", "#.HK..#...K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 3, "kind": "warden", "dir": "D", "patrol": [[8, 3], [8, 4], [8, 5]] }, { "x": 3, "y": 5, "kind": "slime", "dir": "U", "patrol": [[3, 5], [3, 4], [2, 4], [2, 5]] }], "links": [{ "gate": [6, 4], "lever": [2, 2] }] }, { "id": "gen-49", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 23, "map": ["#############", "#.....#.....#", "#..#..#..KH.#", "#.F...#.....#", "#E....G.....#", "#.....#.....#", "#.K...#v.F!.#", "#.....#.....#", "#############"], "snake": [[11, 4]], "dir": "L", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 4, "y": 5, "kind": "warden", "dir": "U", "patrol": [[4, 5], [4, 4], [4, 3]] }, { "x": 9, "y": 3, "kind": "slime", "dir": "D", "patrol": [[9, 3], [9, 4], [10, 4], [10, 3]] }], "links": [{ "gate": [6, 4], "lever": [10, 6] }] }, { "id": "gen-50", "name": "Penjaga Ganda", "tier": "Penjaga Ganda", "intro": null, "goal": "Capai pintu keluar. Ambil 2 kunci dulu. Injak tuas untuk membuka gerbang permanen. Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan. Koin apel opsional, disimpan setelah keluar.", "par": 22, "map": ["#############", "#.....#.....#", "#.HK..#.....#", "#.....#...F.#", "#.....G....E#", "#.....#.....#", "#.!F.v#..#K.#", "#.....#.....#", "#############"], "snake": [[1, 4]], "dir": "R", "exit": { "keys": 2, "plates": [] }, "guards": [{ "x": 8, "y": 5, "kind": "warden", "dir": "U", "patrol": [[8, 5], [8, 4], [8, 3]] }, { "x": 3, "y": 3, "kind": "slime", "dir": "D", "patrol": [[3, 3], [3, 4], [2, 4], [2, 3]] }], "links": [{ "gate": [6, 4], "lever": [2, 6] }] }
 ];
```

## lib/puzzle/controller.js

```diff
diff --git a/lib/puzzle/controller.js b/lib/puzzle/controller.js
index 36d58a2..f4d6c7a 100644
--- a/lib/puzzle/controller.js
+++ b/lib/puzzle/controller.js
@@ -5,7 +5,7 @@
 import { CAMPAIGN_LEVELS } from './campaign';
 import { newSession, move, undo as undoSim, restart as restartSim, exitStatus } from './sim';
 import { drawPuzzle } from './render';
-import { loadProgress, saveProgress, recordPuzzleResult, isUnlocked, appleCoins } from '../progress';
+import { loadProgress, saveProgress, recordPuzzleResult, isUnlocked, appleCoins, mergeProgress } from '../progress';
 
 const BLOCKERS = ['help', 'orientation', 'hidden'];
 const KEY_OF = { '0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R', '0,0': 'W' };
@@ -21,7 +21,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   let progress = store.load();
   let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'won' | 'lost'
   const pauseReasons = new Set();
-  let destroyed = false, completed = false, message = '';
+  let destroyed = false, completed = false, message = '', savePending = false, lastResult = null;
   const firstOpen = () => { const i = L.findIndex((l, k) => isUnlocked(progress, L, k) && !progress.puzzle.levels[l.id]); return i === -1 ? 0 : i; };
   let selected = firstOpen();
   let session = L.length ? newSession(L[selected]) : null;
@@ -34,7 +34,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   const caf = cafOpt || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : () => {});
   const clockNow = nowOpt || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
   const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
-  let anim = null, fx = [], rafId = 0, inputQueue = [], pauseAt = null;
+  let anim = null, fx = [], rafId = 0, pendingInput = null, pauseAt = null;
   const currentView = () => {
     const t = pauseAt === null ? clockNow() : pauseAt, v = {};
     if (anim) { const p = (t - anim.t0) / anim.dur; if (p < 1) v.anim = { from: anim.from, guards: anim.guards, p: Math.max(0, p) }; }
@@ -48,7 +48,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     if (anim && t - anim.t0 >= anim.dur) anim = null;
     fx = fx.filter(f => t - f.t0 < f.dur);
     drawNow();
-    if (!anim && inputQueue.length && state === 'playing') { const d = inputQueue.shift(); setDir(d.x, d.y); }
+    if (!anim && pendingInput && state === 'playing') { const d = pendingInput; pendingInput = null; setDir(d.x, d.y, d); }
     if ((anim || fx.length) && raf && !rafId) rafId = raf(pump);
   }
   function drawNow() { if (session && !destroyed) drawPuzzle(ctx, canvas.width, canvas.height, session, currentView()); }
@@ -68,8 +68,10 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
   // Ringkasan penjaga untuk HUD: null bila level tanpa penjaga; 'chase' > 'return' > 'stunned' > 'idle'.
   function guardStatus() {
-    const gs = session.state.guards || [];
+    const gs = (session.state.guards || []).filter(g => g.hp !== 0);
     if (!gs.length) return null;
+    if (gs.some(g => g.cd === 0 && g.mode === 'windup')) return 'windup';
+    if (gs.some(g => g.cd === 0 && g.mode === 'recover')) return 'recover';
     if (gs.some(g => g.cd === 0 && g.mode === 'alert')) return 'alert';
     if (gs.some(g => g.cd === 0 && g.mode === 'chase')) return 'chase';
     if (gs.some(g => g.cd === 0 && g.mode === 'return')) return 'return';
@@ -83,18 +85,20 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
       steps: session.state.steps, par: lv.par, best: currentBest(lv, rec),
       keys: { have: st.keysHave, need: st.keysNeed }, plates: { active: st.platesActive, need: st.platesNeed },
       hammer: session.state.hammer || 0, shield: session.state.shield || 0, guard: guardStatus(), tier: lv.tier || '',
+      hearts: session.state.hearts, enemies: { left: session.state.guards.filter(g => g.hp !== 0).length, total: lv.guards.length },
+      levers: { active: lv.gates.filter(g => g.open === 'lever' && session.state.cleared.includes(g.x + ',' + g.y)).length, total: lv.gates.filter(g => g.open === 'lever').length },
       apples: session.state.apples || 0, applesTotal: lv.foods.length, coins: appleCoins(progress),
-      legend: [lv.cracks.length && { icon: 'hammer', text: 'Batu krem retak → pakai palu' }, lv.gates.length && { icon: 'lock', text: 'Pagar: panah bisa lewat, palang tunggu' }, lv.guards.length && { icon: 'eye', text: 'Jejak titik = patroli · ! = siap mengejar' }].filter(Boolean),
+      legend: [lv.cracks.length && { icon: 'hammer', text: 'Batu krem retak → pakai palu' }, lv.gates.length && { icon: 'lock', text: 'Injak tuas untuk membuka jeruji' }, lv.guards.length && { icon: 'eye', text: 'Arah ke musuh = serang · petak ! = hindari' }].filter(Boolean),
       message, canUndo: state === 'playing' && session.history.length > 0, status: session.state.status,
     };
   }
   function emitFullState() {
-    if (!session) { emit({ running: false, paused: false, puzzle: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null, puzzleMenu: { levels: [], selected: 0 }, mode: 'puzzle', modeLabel: 'Snake · Jejak Kunci', effects: [], mpHud: null, timerText: null, score: 0, best: 0 }); return; }
+    if (!session) { emit({ running: false, paused: false, puzzle: null, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null, puzzleMenu: { levels: [], selected: 0 }, mode: 'puzzle', modeLabel: 'Snake · Dungeon', effects: [], mpHud: null, timerText: null, score: 0, best: 0 }); return; }
     const rec = progress.puzzle.levels[session.level.id];
     emit({
-      score: session.state.steps, best: currentBest(session.level, rec), modeLabel: 'Snake · Jejak Kunci', mode: 'puzzle',
+      score: session.state.steps, best: currentBest(session.level, rec), modeLabel: 'Snake · Dungeon', mode: 'puzzle',
       effects: [], mpHud: null, timerText: null, running: isActive(), paused: state === 'paused',
-      puzzle: puzzleHud(), puzzleMenu: { levels: L.map((_, i) => levelInfo(i)), selected, coins: appleCoins(progress) }, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
+      puzzle: puzzleHud(), puzzleMenu: { levels: L.map((_, i) => levelInfo(i)), selected, coins: appleCoins(progress), savePending }, delivery: null, deliveryMenu: null, roguelite: null, rogueMenu: null, territory: null, territoryMenu: null, boss: null, bossMenu: null,
     });
   }
   function refresh() { emitFullState(); draw(); }
@@ -103,7 +107,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   function startRun() {
     if (!L.length || (state !== 'menu' && state !== 'won' && state !== 'lost')) return false; // hanya berhasil sekali
     session = newSession(L[selected]); completed = false; message = ''; pauseReasons.clear();
-    inputQueue = []; anim = null; fx = []; pauseAt = null;
+    pendingInput = null; anim = null; fx = []; pauseAt = null; lastResult = null;
     state = 'playing';
     emit({ overlay: { phase: 'none' } });
     refresh();
@@ -115,7 +119,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     pauseReasons.add('user');
     if (reason !== 'user') pauseReasons.add(reason);
     if (state === 'playing') {
-      state = 'paused'; pauseAt = clockNow(); inputQueue = [];
+      state = 'paused'; pauseAt = clockNow(); pendingInput = null;
       if (rafId) caf(rafId); rafId = 0;
       refresh();
       emit({ overlay: { phase: 'pause', mood: 'idle', title: 'Jeda', sub: 'Tekan Main untuk lanjut', btnText: 'Lanjut' } });
@@ -137,7 +141,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   const togglePause = () => (state === 'playing' ? pauseRun('user') : state === 'paused' ? resumeRun() : false);
   function returnToMenu() {
     if (state === 'menu') return;
-    state = 'menu'; pauseReasons.clear(); message = ''; inputQueue = []; anim = null; fx = []; pauseAt = null;
+    state = 'menu'; pauseReasons.clear(); message = ''; pendingInput = null; anim = null; fx = []; pauseAt = null;
     if (L.length) session = newSession(L[selected]);
     refresh();
     emit({ overlay: MENU_OVERLAY });
@@ -150,22 +154,23 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
 
   // ----- input: satu input valid = satu langkah. Hanya saat `playing`; tidak memulai/melanjutkan dari arah. -----
-  function setDir(x, y) {
+  function setDir(x, y, meta) {
     if (state !== 'playing') return;
     const k = KEY_OF[x + ',' + y];
     if (!k) return;
     if (anim && clockNow() - anim.t0 < anim.dur && raf && !reducedMotion()) {
-      if (inputQueue.length < 2) inputQueue.push({ x, y });
+      pendingInput = { x, y, ...(meta || {}) };
       return;
     }
+    pendingInput = null;
     const r = move(session, k);
     if (!r.moved) {
       if (r.reason === 'selesai') return;
       message = r.reason === 'tembok' ? 'Terhalang tembok.' : r.reason === 'tubuh' ? 'Terhalang tubuhmu sendiri.' : r.reason === 'berbalik' ? 'Tidak bisa berbalik arah.'
-        : r.reason === 'duri' ? 'Duri! Butuh Perisai (S).' : r.reason === 'retak' ? 'Tembok retak! Butuh Palu (P).' : r.reason === 'gerbang' ? 'Gerbang tertutup di langkah ini.'
+        : r.reason === 'duri' ? 'Duri! Butuh Perisai (S).' : r.reason === 'retak' ? 'Tembok retak! Butuh Palu (P).' : r.reason === 'gerbang' ? 'Gerbang tertutup. Cari tuas yang terhubung.'
         : r.detail && r.detail.keysMissing ? `Pintu terkunci: butuh ${r.detail.keysMissing} kunci lagi.`
         : `Pintu terkunci: sakelar ${(r.detail ? r.detail.missingPlates : []).map(s => s.toUpperCase()).join(', ')} belum diaktifkan.`;
-      // Puzzle tidak bisa 'mati': gerakan tertahan memakai bunyi tumbukan lembut, bukan peringatan bahaya (eits).
+      // Gerakan tertahan tidak memakai giliran; bunyi tumbukan dibedakan dari peringatan musuh.
       if (r.reason === 'pintu') { if (sounds.playLocked) sounds.playLocked(); } else if (r.reason !== 'berbalik') { if (sounds.playBump) sounds.playBump(); }
       refresh();
       return;
@@ -173,10 +178,11 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
     const prevSnake = session.state.snake, prevGuards = session.state.guards;
     session = r.session;
     const head = session.state.snake[0];
-    beginAnim(prevSnake, [r.events.ate && { kind: 'pop', x: head.x, y: head.y }, r.events.key && { kind: 'key', x: head.x, y: head.y }, r.events.warped && { kind: 'warp', x: head.x, y: head.y }].filter(Boolean), prevGuards);
+    beginAnim(prevSnake, [r.events.ate && { kind: 'pop', x: head.x, y: head.y }, r.events.key && { kind: 'key', x: head.x, y: head.y }, r.events.warped && { kind: 'warp', x: head.x, y: head.y }, r.events.attackAt && { kind: 'hit', ...r.events.attackAt }, r.events.hurt && { kind: 'hurt', x: head.x, y: head.y }].filter(Boolean), prevGuards);
     const ev = r.events;
-    message = ev.won ? '' : ev.stung ? '' : ev.shielded ? 'Perisai menahan sengatan! Penjaga pingsan sebentar.' : ev.alerted ? 'Terlihat! Satu giliran untuk kabur atau sembunyi.'
-      : ev.pickup === 'shield' ? 'Perisai didapat!' : ev.pickup === 'hammer' ? 'Palu didapat! Cari batu krem yang retak.' : ev.key ? 'Kunci didapat!' : ev.ate ? '+1 koin apel. Bawa keluar untuk menyimpannya.' : ev.switchOn ? 'Sakelar aktif, tidak perlu ditahan.' : ev.warped ? 'Lewat portal.' : k === 'W' ? 'Menunggu satu giliran.' : '';
+    message = ev.won ? '' : ev.stung ? '' : ev.hurt ? `Kena serangan! Hati ${session.state.hearts}/3. Hindari petak bertanda !.` : ev.shielded ? 'Perisai menahan serangan! Penjaga pingsan sebentar.' : ev.defeated ? 'Musuh tumbang! Jalannya sekarang bebas.' : ev.hit ? 'Kena! Arahkan lagi ke musuh untuk menyerang.' : ev.alerted ? 'Terlihat! Satu giliran untuk kabur atau sembunyi.'
+      : session.state.guards.some(g => g.hp !== 0 && g.mode === 'windup') ? 'Serangan disiapkan! Keluar dari petak bertanda !.'
+      : ev.leverOn ? 'Tuas aktif. Jeruji terbuka permanen.' : ev.pickup === 'heal' ? `Hati dipulihkan: ${session.state.hearts}/3.` : ev.pickup === 'shield' ? 'Perisai didapat!' : ev.pickup === 'hammer' ? 'Palu didapat! Cari batu krem yang retak.' : ev.key ? 'Kunci didapat!' : ev.ate ? '+1 koin apel. Bawa keluar untuk menyimpannya.' : ev.switchOn ? 'Sakelar aktif, tidak perlu ditahan.' : ev.warped ? 'Lewat portal.' : k === 'W' ? 'Menunggu satu giliran.' : '';
     if (ev.ate || ev.key || ev.pickup) sounds.playChomp(); else sounds.playMove();
     if (ev.alerted && !ev.stung && !ev.won && sounds.playEits) sounds.playEits();
     if (ev.won) win(); else if (ev.stung) lose(); else refresh();
@@ -184,7 +190,7 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
 
   function undo() {
     if (state !== 'playing') return false;
-    inputQueue = [];
+    pendingInput = null;
     const r = undoSim(session);
     if (!r.undone) { message = 'Belum ada langkah untuk dibatalkan.'; refresh(); return false; }
     const before = session.state.snake, beforeGuards = session.state.guards;
@@ -195,8 +201,8 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   }
   function restartLevel() {
     if (state !== 'playing') return false;
-    inputQueue = [];
-    session = restartSim(session); completed = false; message = 'Level diulang.'; anim = null; fx = [];
+    pendingInput = null;
+    session = restartSim(session); completed = false; message = 'Ruang diulang.'; anim = null; fx = [];
     refresh();
     return true;
   }
@@ -204,29 +210,46 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   // Selesai level: dicatat SEKALI per percobaan (`completed`), progres disimpan sekali, level berikutnya terbuka.
   function win() {
     if (completed || state !== 'playing') return;
-    completed = true; state = 'won'; inputQueue = [];
+    completed = true; state = 'won'; pendingInput = null;
     const lv = session.level, steps = session.state.steps;
-    const r = recordPuzzleResult(store.load(), lv.id, steps, lv.revision || 1, session.state.apples);
+    const r = recordPuzzleResult(mergeProgress(progress, store.load()), lv.id, steps, lv.revision || 1, session.state.apples);
     progress = r.progress;
-    const saved = store.save(progress) !== false;
+    persistProgress();
     const hasNext = selected + 1 < L.length;
     const isLast = !hasNext;
     if (hasNext) selected += 1;
     if (sounds.playWin) sounds.playWin();
-    const notes = [r.newBest && !r.firstClear ? 'Rekor baru!' : null, steps <= lv.par ? 'Par tercapai!' : null,
-      saved ? `+${r.earned || 0} koin apel · saldo ${appleCoins(progress)}` : 'Progres belum tersimpan; penyimpanan browser ditolak.'].filter(Boolean);
+    const notes = [r.newBest && !r.firstClear ? 'Rekor baru!' : null, steps <= lv.par ? 'Par tercapai!' : null].filter(Boolean);
+    lastResult = { title: isLast ? 'Semua Ruang Tamat!' : 'Ruang Selesai!', sub: `Langkah: ${steps} • Acuan: ${lv.par}${notes.length ? ' • ' + notes.join(' ') : ''}`, earned: r.earned || 0, btnText: hasNext ? 'Ruang Berikutnya' : 'Main Lagi' };
     refresh();
-    emit({ overlay: { phase: 'gameover', mood: 'win', title: isLast ? 'Semua Level Tamat!' : 'Level Selesai!', sub: `Langkah: ${steps} • Par: ${lv.par}${notes.length ? ' • ' + notes.join(' ') : ''}`, btnText: hasNext ? 'Level Berikutnya' : 'Main Lagi' } });
+    emitWin();
   }
 
-  // Tersengat penjaga = game over: sekali per percobaan, tanpa menyimpan progres. "Coba Lagi" memulai level yang sama.
+  function persistProgress() {
+    try { savePending = store.save(progress) === false; } catch (e) { savePending = true; }
+    return !savePending;
+  }
+  function emitWin() {
+    if (!lastResult) return;
+    emit({ overlay: { phase: 'gameover', mood: 'win', title: lastResult.title, btnText: lastResult.btnText,
+      sub: lastResult.sub + (savePending ? ' • Progres belum tersimpan; coba simpan lagi.' : ` • +${lastResult.earned} koin apel · saldo ${appleCoins(progress)}`) } });
+  }
+  function retrySave() {
+    if (!savePending || isActive()) return false;
+    progress = mergeProgress(progress, store.load());
+    const saved = persistProgress(); refresh();
+    if (state === 'won') emitWin();
+    return saved;
+  }
+
+  // Tiga hati habis = game over: sekali per percobaan, tanpa menyimpan progres. "Coba Lagi" memulai level yang sama.
   function lose() {
     if (completed || state !== 'playing') return;
-    completed = true; state = 'lost'; inputQueue = [];
+    completed = true; state = 'lost'; pendingInput = null;
     const steps = session.state.steps;
     if (sounds.playDeath) sounds.playDeath();
     refresh();
-    emit({ overlay: { phase: 'gameover', mood: 'shock', title: 'Tersengat!', sub: `Penjaga menangkapmu di langkah ${steps}. Level ${L.indexOf(session.level) + 1}`, btnText: 'Coba Lagi' } });
+    emit({ overlay: { phase: 'gameover', mood: 'shock', title: 'Hati Habis!', sub: `Kalah di langkah ${steps}. Ruang ${L.indexOf(session.level) + 1}. Hindari sasaran ! atau serang penjaga lebih dulu.`, btnText: 'Coba Lagi' } });
   }
 
   draw();
@@ -236,7 +259,8 @@ export function createPuzzleGame({ canvas, sounds, onUpdate, levels, io, raf: ra
   return {
     setMode() {}, setSpeedPref() {}, setTaDuration() {}, setDirMP() {},
     setLevel, startRun, pauseRun, resumeRun, releasePause, togglePause, returnToMenu,
-    setDir, undo, restartLevel,
+    setDir, undo, restartLevel, retrySave,
+    cancelHeldInput(source) { if (pendingInput?.repeat && pendingInput.source === source) pendingInput = null; },
     isRunning: isActive, getState: () => state,
     destroy() { destroyed = true; if (rafId) caf(rafId); rafId = 0; },
   };
```

## lib/puzzle/generator.js

```diff
diff --git a/lib/puzzle/generator.js b/lib/puzzle/generator.js
index 4d4f44b..c35c6d0 100644
--- a/lib/puzzle/generator.js
+++ b/lib/puzzle/generator.js
@@ -1,15 +1,15 @@
-// Generator level "Jejak Kunci" — MURNI dan deterministik: (seedRun, nomorLevel) -> level yang sama persis.
-// Tanpa Math.random / jam. Hanya memakai createRng(seed) dan solver BFS dari sim.js.
+// Generator level "Dungeon" — MURNI dan deterministik: (seedRun, nomorLevel) -> level yang sama persis.
+// Tanpa Math.random / jam. Hanya memakai createRng(seed) dan solver BFS/A* dari sim.js.
 //
 // Level 1..5 = tutorial buatan tangan (levels.js). Level 6..50 dibuat sistem:
 //   1. Papan dibagi menjadi 2..4 "ruang" oleh dinding pembatas. Tiap pembatas punya SATU penghalang wajib:
-//      celah terbuka, portal berpasangan (pembatas utuh), duri (butuh Perisai), tembok retak (butuh Palu), atau gerbang genap/ganjil.
+//      celah terbuka, portal berpasangan (pembatas utuh), duri (butuh Perisai), tembok retak (butuh Palu), atau jeruji bertuas.
 //      Jadi tiap penghalang pasti harus dilewati; pickup yang dibutuhkan selalu ditaruh di ruang SEBELUM penghalangnya.
-//   2. Ular mulai di ruang pertama, pintu keluar di ruang terakhir. Kunci, makanan, pilar, semak, dan penjaga disebar dengan RNG.
-//      Tier akhir menambah kantong pintu + sakelar permanen dan penjaga dengan rute patroli.
-//   3. Solver BFS memutuskan: level yang tidak bisa diselesaikan DITOLAK; par = panjang solusi optimum.
-//   4. Dibuat beberapa kandidat; dipilih yang par-nya paling dekat dengan kurva target (makin lama makin susah, monoton pada rata-rata).
-//   5. Bila semua gagal: turunkan ke tier sebelumnya; bila tetap gagal: level cadangan yang tetap valid. Tidak ada loop tanpa batas.
+//   2. Ular mulai di ruang pertama, pintu keluar di ruang terakhir. Kunci, makanan, pilar dan semak disebar dengan RNG; combat memakai template aman yang dicerminkan.
+//      Tier akhir menambah satu penjaga, lalu dua jenis penjaga dengan rute patroli.
+//   3. Solver BFS/A* memutuskan: level yang tidak bisa diselesaikan DITOLAK; par = panjang solusi optimum.
+//   4. Puzzle membandingkan par beberapa kandidat; combat meningkatkan HP/jenis/jumlah musuh, bukan hanya panjang rute.
+//   5. Tidak menurunkan tier diam-diam. Build menolak level cadangan; jumlah musuh sesuai tier wajib terpenuhi.
 import { createRng } from '../sim/rng';
 import { buildLevel, solve, DIRS } from './sim';
 import { LEVELS } from './levels';
@@ -18,18 +18,17 @@ export const MAX_LEVEL = 50;
 export const TUTORIAL_COUNT = 5;
 const SOLVE_BUDGET = 12000;   // batas state solver per kandidat
 const WORK_BUDGET = 80000;   // batas total state solver per level pada tier-nya (setelah itu: ambil kandidat terbaik)
-const LOWER_BUDGET = 50000;  // batas total bila harus turun ke tier lebih rendah
 const CANDIDATES = 3;         // kandidat valid yang dibandingkan per level
-const MAX_ATTEMPTS = 40;      // percobaan pembuatan per tier sebelum turun tier
+const MAX_ATTEMPTS = 40;      // percobaan pembuatan per tier pada tier yang sama
 
 // Tier: elemen baru muncul bertahap. `intro` = elemen yang diperkenalkan pada level pertama tier itu (untuk kartu pengantar UI).
 export const TIERS = [
   { id: 't1', name: 'Lorong Kunci', from: 6, to: 12, W: [11, 13], H: [7, 9], sections: [2, 3], barriers: ['gap'], keys: [1, 1], foods: [1, 1], pillars: [1, 3], plate: false, guards: [0, 0], intro: null },
   { id: 't2', name: 'Lompatan Portal', from: 13, to: 19, W: [12, 14], H: [7, 9], sections: [3, 3], barriers: ['gap', 'portal'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'portal' },
   { id: 't3', name: 'Duri dan Retak', from: 20, to: 27, W: [13, 15], H: [7, 9], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack'], keys: [1, 2], foods: [1, 2], pillars: [2, 4], plate: true, guards: [0, 0], intro: 'duri' },
-  { id: 't4', name: 'Gerbang Bergantian', from: 28, to: 34, W: [14, 16], H: [7, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [1, 2], pillars: [3, 5], plate: true, guards: [0, 0], intro: 'gerbang' },
-  { id: 't5', name: 'Penjaga Kebun', from: 35, to: 42, W: [15, 17], H: [9, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [2, 3], pillars: [3, 5], plate: true, guards: [1, 1], bushes: [2, 3], intro: 'penjaga' },
-  { id: 't6', name: 'Penjaga Ganda', from: 43, to: 50, W: [15, 17], H: [9, 13], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 3], foods: [2, 3], pillars: [3, 6], plate: true, guards: [1, 2], bushes: [3, 4], intro: null },
+  { id: 't4', name: 'Ruang Tuas', from: 28, to: 34, W: [14, 16], H: [7, 11], sections: [3, 4], barriers: ['gap', 'portal', 'spike', 'crack', 'gate'], keys: [2, 2], foods: [1, 2], pillars: [3, 5], plate: true, guards: [0, 0], intro: 'gerbang' },
+  { id: 't5', name: 'Penjaga Dungeon', from: 35, to: 42, guards: [1, 1], intro: 'penjaga' },
+  { id: 't6', name: 'Penjaga Ganda', from: 43, to: 50, guards: [2, 2], intro: null },
 ];
 
 export const tierOf = (n) => TIERS.find(t => n >= t.from && n <= t.to) || null;
@@ -51,6 +50,7 @@ const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
 
 // Satu percobaan membuat spec level (peta + ular + penjaga) untuk tier tertentu. Mengembalikan null bila tata letak gagal.
 function buildSpec(rng, tier, n) {
+  if (n >= 35) return dungeonRoom(rng, n);
   const W = ri(rng, tier.W), H = ri(rng, tier.H);
   const innerW = W - 2;
   const k = Math.min(ri(rng, tier.sections), Math.floor((innerW + 1) / 4)); // tiap ruang >= 3 sel + pembatas
@@ -76,7 +76,7 @@ function buildSpec(rng, tier, n) {
   const gapRows = [];
   const needs = []; // { kind, sec } pickup yang harus ada di ruang <= sec
   const portals = [];
-  let gateKind = 0;
+  const links = [], gateNeeds = [];
   divs.forEach((dx, i) => {
     const gy = 1 + Math.floor(rng() * (H - 2));
     gapRows.push(gy);
@@ -85,7 +85,7 @@ function buildSpec(rng, tier, n) {
     if (b === 'gap') grid[gy][dx] = '.';
     else if (b === 'spike') { grid[gy][dx] = '^'; needs.push({ kind: 'S', sec: i }); }
     else if (b === 'crack') { grid[gy][dx] = 'x'; needs.push({ kind: 'P', sec: i }); }
-    else if (b === 'gate') { grid[gy][dx] = (gateKind++ % 2 === 0) === (rng() < 0.5) ? 'g' : 'h'; }
+    else if (b === 'gate') { grid[gy][dx] = 'G'; gateNeeds.push({ x: dx, y: gy, sec: i }); }
     else if (b === 'portal') portals.push({ i, id: String(portals.length + 1) });
   });
   if (portals.length > 3) return null;
@@ -137,6 +137,11 @@ function buildSpec(rng, tier, n) {
   for (let i = 0; i < keys; i++) if (!take(Math.floor(rng() * k), 'K')) return null;
   // pickup yang dibutuhkan penghalang: di ruang <= pembatasnya
   for (const nd of needs) if (!take(Math.floor(rng() * (nd.sec + 1)), nd.kind)) return null;
+  for (const nd of gateNeeds) {
+    const lever = take(nd.sec, '!');
+    if (!lever) return null;
+    links.push({ gate: [nd.x, nd.y], lever: [lever.x, lever.y] });
+  }
   // portal: ujung A di ruang i, ujung B di ruang i+1
   for (const p of portals) { if (!take(p.i, p.id) || !take(p.i + 1, p.id)) return null; }
   // Koin bonus opsional, terpisah dari syarat pintu keluar.
@@ -172,11 +177,37 @@ function buildSpec(rng, tier, n) {
   return {
     map: grid.map(r => r.join('')),
     snake: [[hp.x, hp.y]], dir: dk, exit: exitSpec,
-    guards: guardSpecs,
+    guards: guardSpecs, links,
     features: { barriers: [...new Set(barriers)], keys, plate: !!plate, guards: guardSpecs.length, patrol: guardSpecs.some(g => g.patrol) },
   };
 }
 
+// Ruangan combat memakai fondasi yang teruji, lalu dicerminkan dan diberi variasi.
+// Kunci, tuas, dan peti dijaga di jalur yang berarti; jumlah musuh tidak diturunkan diam-diam.
+function dungeonRoom(rng, n) {
+  const w = n >= 43 ? 13 : 11, h = 9, divider = Math.floor(w / 2);
+  const map = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.'));
+  for (let y = 1; y < h - 1; y++) map[y][divider] = '#';
+  const flipX = rng() < .5, flipY = rng() < .5;
+  const turn = (x, y) => [flipX ? w - 1 - x : x, flipY ? h - 1 - y : y];
+  const gate = [divider, 4], lever = [2, 2], keyY = rng() < .5 ? 2 : 6;
+  map[gate[1]][gate[0]] = 'G'; map[lever[1]][lever[0]] = '!';
+  map[6][3] = 'K'; map[keyY][w - 3] = 'K'; map[4][w - 2] = 'E';
+  map[2][3] = 'F'; map[7 - keyY][w - 3] = 'F';
+  if (n % 3 === 0) map[1][w - 3] = 'F';
+  map[6][2] = 'H'; map[2][divider - 1] = 'v';
+  if (n % 2) map[6][w - 4] = '#'; else map[2][w - 4] = '#';
+  const right = divider + 2;
+  const guards = [{ x: right, y: 3, kind: n < 39 ? 'slime' : 'warden', dir: 'D', patrol: [[right, 3], [right, 4], [right, 5]] }];
+  if (n >= 43) guards.push({ x: 3, y: 5, kind: 'slime', dir: 'U', patrol: [[3, 5], [3, 4], [2, 4], [2, 5]] });
+  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
+  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [a, b] = turn(x, y); rows[b][a] = map[y][x]; }
+  return { map: rows.map(r => r.join('')), snake: [turn(1, 4)], dir: flipX ? 'L' : 'R', exit: { keys: 2, plates: [] },
+    links: [{ gate: turn(...gate), lever: turn(...lever) }],
+    guards: guards.map(g => { const [x, y] = turn(g.x, g.y); return { ...g, x, y, dir: flipY ? (g.dir === 'U' ? 'D' : 'U') : g.dir, patrol: g.patrol.map(p => turn(...p)) }; }),
+    features: { barriers: ['gate'], keys: 2, plate: false, guards: guards.length, patrol: true } };
+}
+
 function goalText(f) {
   const bits = ['Capai pintu keluar.'];
   if (f.keys) bits.push(f.keys === 1 ? 'Ambil kunci dulu.' : `Ambil ${f.keys} kunci dulu.`);
@@ -184,8 +215,8 @@ function goalText(f) {
   if (f.barriers.includes('portal')) bits.push('Pakai portal untuk pindah ruang.');
   if (f.barriers.includes('spike')) bits.push('Duri butuh Perisai.');
   if (f.barriers.includes('crack')) bits.push('Tembok retak butuh Palu.');
-  if (f.barriers.includes('gate')) bits.push('Gerbang hanya terbuka pada langkah genap/ganjil.');
-  if (f.guards) bits.push('Hindari patroli; tanda ! memberi satu giliran untuk kabur. Semak memutus pengejaran.');
+  if (f.barriers.includes('gate')) bits.push('Injak tuas untuk membuka gerbang permanen.');
+  if (f.guards) bits.push('Tiga hati. Tekan arah ke musuh untuk menyerang. Petak ! ditandai sebelum serangan; kabur atau lawan.');
   bits.push('Koin apel opsional, disimpan setelah keluar.');
   return bits.join(' ');
 }
@@ -197,10 +228,10 @@ function attempt(seed, tier, n, stats) {
   const spec = buildSpec(rng, tier, n);
   if (!spec) { DIAG.nospec++; return null; }
   const features = spec.features;
-  const base = { id: `g${n}-${seed.toString(16)}`, name: tier.name, goal: goalText(features), par: 1, map: spec.map, snake: spec.snake, dir: spec.dir, exit: spec.exit, guards: spec.guards };
+  const base = { id: `g${n}-${seed.toString(16)}`, name: tier.name, goal: goalText(features), par: 1, map: spec.map, snake: spec.snake, dir: spec.dir, exit: spec.exit, guards: spec.guards, links: spec.links || [] };
   const first = buildLevel(base);
   if (!first.level) { DIAG.invalid++; return null; }
-  const path = solve(first.level, SOLVE_BUDGET, stats);
+  const path = solve(first.level, n >= 35 ? 60000 : SOLVE_BUDGET, stats);
   if (!path) { DIAG.unsolved++; return null; }
   DIAG.ok++;
   const built = buildLevel({ ...base, par: path.length });
@@ -234,17 +265,17 @@ export function getLevel(n, runSeed = 0) {
   let tierIdx = TIERS.findIndex(t => n >= t.from && n <= t.to);
   const target = targetPar(n);
   let result = null, attempts = 0;
-  for (let ti = tierIdx; ti >= 0 && !result; ti--) {
+  for (let ti = tierIdx; ti === tierIdx && !result; ti--) {
     const tier = TIERS[ti];
-    const budget = ti === tierIdx ? WORK_BUDGET : LOWER_BUDGET;
+    const budget = WORK_BUDGET;
     const stats = { states: 0 };
     const cands = [], weak = [];
-    for (let a = 0; a < MAX_ATTEMPTS && cands.length < CANDIDATES && stats.states < budget; a++) {
+    for (let a = 0; a < MAX_ATTEMPTS && cands.length < (n >= 35 ? 1 : CANDIDATES) && stats.states < budget; a++) {
       attempts++;
       const sd = mixSeed(seed0, ti * 1000 + a);
       const r = attempt(sd, tier, n, stats);
       if (!r) continue;
-      (r.par >= Math.round(target * 0.6) ? cands : weak).push({ ...r, seed: sd });
+      (n >= 35 || r.par >= Math.round(target * 0.6) ? cands : weak).push({ ...r, seed: sd });
     }
     const pool = cands.length ? cands : weak; // tidak ada yang cukup sulit: ambil yang paling sulit di antara yang valid
     if (pool.length) {
```

## lib/puzzle/render.js

```diff
diff --git a/lib/puzzle/render.js b/lib/puzzle/render.js
index c76565a..aee944b 100644
--- a/lib/puzzle/render.js
+++ b/lib/puzzle/render.js
@@ -4,7 +4,7 @@ import { exitStatus, activePlates, visionCells, gateOpen } from './sim';
 import { animatedPoints, easeOutCubic } from '../sim/anim';
 
 const C = {
-  bg: '#f3ecd8', floorA: '#c7d6ac', floorB: '#d0ddb7', wall: '#687f58', wallHatch: '#81936d',
+  bg: '#eee7d5', floorA: '#dad5bf', floorB: '#e3dec9', wall: '#67716a', wallHatch: '#90978a',
   food: '#e0453a', leaf: '#6fbf3a', key: '#9d6a13', plateLine: '#3f5961', plateOn: '#6ed3ff', portal: '#c58bff',
   doorLocked: '#6b3f2a', doorOpen: '#e7d38a', ink: '#0e1316', snakeOut: '#304831', snakeIn: '#7cc22d', eye: '#ffffff',
   spike: '#d9dfe3', crack: '#8a7f73', gate: '#b07a3a', bush: '#2f8f4a', bushDark: '#1d6b35', hammer: '#c9a36a', shield: '#6ed3ff', guard: '#e0873a', guardAlert: '#ff5a4a',
@@ -26,7 +26,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
   ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
   for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) { ctx.fillStyle = (x + y) % 2 ? C.floorA : C.floorB; ctx.fillRect(px(x), py(y), cell, cell); }
   level.walls.forEach(w => {
-    ctx.fillStyle = C.wall; ctx.strokeStyle = '#425638'; ctx.lineWidth = 2;
+    ctx.fillStyle = C.wall; ctx.strokeStyle = '#46534b'; ctx.lineWidth = 2;
     ctx.beginPath(); ctx.roundRect(px(w.x) + 1, py(w.y) + 1, cell - 2, cell - 2, cell * 0.16); ctx.fill(); ctx.stroke();
     ctx.strokeStyle = C.wallHatch; ctx.beginPath(); ctx.moveTo(px(w.x) + cell * 0.2, py(w.y) + cell * 0.23); ctx.lineTo(px(w.x) + cell * 0.75, py(w.y) + cell * 0.23); ctx.stroke();
   });
@@ -44,7 +44,8 @@ export function drawPuzzle(ctx, W, H, session, view) {
   });
 
   // Rute yang direncanakan terbaca sebagai jejak kecil; area pandang tetap lebih dominan.
-  level.guards.forEach(g => {
+  level.guards.forEach((g, i) => {
+    if (state.guards[i]?.hp === 0) return;
     ctx.fillStyle = 'rgba(105,74,39,.45)';
     (g.patrol || []).forEach(p => { ctx.beginPath(); ctx.arc(cxm(p.x), cym(p.y), Math.max(1.6, cell * 0.045), 0, Math.PI * 2); ctx.fill(); });
   });
@@ -52,7 +53,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
   // area pandang penjaga (di bawah semua objek): garis miring + bingkai; putus-putus = waspada diam, solid = mengejar
   const stepNext = state.steps + 1;
   (state.guards || []).forEach(g => {
-    if (g.cd > 0) return;
+    if (g.cd > 0 || g.hp === 0) return;
     const chasing = g.mode === 'chase' || g.mode === 'alert';
     visionCells(level, state, g, stepNext).forEach(c => {
       ctx.fillStyle = chasing ? 'rgba(255,90,74,.22)' : 'rgba(224,135,58,.18)'; ctx.fillRect(px(c.x), py(c.y), cell, cell);
@@ -61,7 +62,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
     });
   });
 
-  // rintangan: duri (segitiga), tembok retak (blok retak), gerbang (garis + angka 2 = genap / 1 = ganjil). Bentuk + label, bukan hanya warna.
+  // rintangan: duri (segitiga), tembok retak (blok retak), jeruji dan tuas bernomor sama. Bentuk + label, bukan hanya warna.
   const gone = new Set(state.cleared || []);
   level.spikes.filter(p => !gone.has(p.x + ',' + p.y)).forEach(p => {
     ctx.fillStyle = C.spike; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
@@ -77,23 +78,30 @@ export function drawPuzzle(ctx, W, H, session, view) {
     // Pecahan kecil di kaki batu membedakan dari blok yang tidak bisa dihancurkan.
     ctx.fillStyle = '#fff0cc'; ctx.fillRect(px(p.x) + cell * 0.72, py(p.y) + cell * 0.7, cell * 0.13, cell * 0.13);
   });
-  level.gates.forEach(p => {
-    const open = gateOpen(p, stepNext);
-    ctx.fillStyle = open ? 'rgba(245,253,223,.8)' : '#f1d8ad';
-    ctx.fillRect(px(p.x) + 2, py(p.y) + 2, cell - 4, cell - 4);
-    ctx.strokeStyle = '#725333'; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.fillStyle = '#c1965a';
-    for (const side of [0.1, 0.78]) { ctx.beginPath(); ctx.roundRect(px(p.x) + cell * side, py(p.y) + cell * 0.08, cell * 0.12, cell * 0.84, cell * 0.04); ctx.fill(); ctx.stroke(); }
-    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, cell * 0.07);
-    if (open) {
-      ctx.strokeStyle = '#376746';
-      ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.32, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.66, cym(p.y));
-      ctx.moveTo(px(p.x) + cell * 0.52, py(p.y) + cell * 0.34); ctx.lineTo(px(p.x) + cell * 0.68, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.52, py(p.y) + cell * 0.66); ctx.stroke();
-    } else {
-      ctx.strokeStyle = '#925739';
-      for (const yy of [0.32, 0.68]) { ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.15, py(p.y) + cell * yy); ctx.lineTo(px(p.x) + cell * 0.86, py(p.y) + cell * yy); ctx.stroke(); }
-      ctx.fillStyle = '#9c4234'; ctx.beginPath(); ctx.arc(cxm(p.x), cym(p.y), cell * 0.19, 0, Math.PI * 2); ctx.fill();
-      ctx.strokeStyle = '#fff5dc'; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.41, cym(p.y)); ctx.lineTo(px(p.x) + cell * 0.59, cym(p.y)); ctx.stroke();
+  level.gates.forEach((p, i) => {
+    const open = gateOpen(p, stepNext, state), x = px(p.x), y = py(p.y);
+    ctx.fillStyle = open ? '#e7dfbf' : '#a7a89a';
+    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
+    ctx.strokeStyle = '#49564f'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineCap = 'round';
+    // Jeruji terangkat ke ambang atas saat terbuka, tanpa panah arah palsu.
+    for (const xx of [0.23, 0.41, 0.59, 0.77]) {
+      ctx.beginPath(); ctx.moveTo(x + cell * xx, y + cell * 0.12); ctx.lineTo(x + cell * xx, y + cell * (open ? 0.3 : 0.88)); ctx.stroke();
     }
+    ctx.beginPath(); ctx.moveTo(x + cell * 0.12, y + cell * 0.2); ctx.lineTo(x + cell * 0.88, y + cell * 0.2); ctx.stroke();
+    ctx.fillStyle = '#fff9e6'; ctx.font = `bold ${Math.round(cell * 0.26)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
+    ctx.strokeText(String(i + 1), cxm(p.x), y + cell * 0.22); ctx.fillText(String(i + 1), cxm(p.x), y + cell * 0.22);
+    if (open) { ctx.strokeStyle = '#537247'; ctx.beginPath(); ctx.moveTo(x + cell * 0.34, y + cell * 0.68); ctx.lineTo(x + cell * 0.46, y + cell * 0.79); ctx.lineTo(x + cell * 0.7, y + cell * 0.49); ctx.stroke(); }
+  });
+  (level.levers || []).forEach(p => {
+    const link = (level.links || []).find(l => l.lever[0] === p.x && l.lever[1] === p.y);
+    const i = link ? level.gates.findIndex(g => g.x === link.gate[0] && g.y === link.gate[1]) : -1;
+    const active = i >= 0 && gateOpen(level.gates[i], stepNext, state);
+    ctx.fillStyle = '#839077'; ctx.strokeStyle = '#435244'; ctx.lineWidth = Math.max(2, cell * 0.055);
+    ctx.beginPath(); ctx.ellipse(cxm(p.x), py(p.y) + cell * 0.75, cell * 0.31, cell * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    const hx = px(p.x) + cell * (active ? 0.72 : 0.3), hy = py(p.y) + cell * 0.32;
+    ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.7); ctx.lineTo(hx, hy); ctx.stroke();
+    ctx.fillStyle = active ? '#75ad58' : '#d8914a'; ctx.beginPath(); ctx.arc(hx, hy, cell * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    ctx.fillStyle = '#fffbed'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), hx, hy);
   });
   // semak (tempat bersembunyi) dan pickup Palu (P) / Perisai (S)
   const bushAt = (p) => {
@@ -104,9 +112,12 @@ export function drawPuzzle(ctx, W, H, session, view) {
   state.pickups.forEach(p => {
     ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
     if (p.kind === 'hammer') { ctx.fillStyle = C.hammer; ctx.fillRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.strokeRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.fillStyle = '#e9e1d2'; ctx.fillRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); ctx.strokeRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); }
+    else if (p.kind === 'heal') {
+      ctx.fillStyle = '#d96666'; ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.82); ctx.bezierCurveTo(px(p.x) - cell * 0.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) - cell * 0.05, cxm(p.x), py(p.y) + cell * 0.35); ctx.bezierCurveTo(cxm(p.x), py(p.y) - cell * 0.05, px(p.x) + cell * 1.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) + cell * 0.82); ctx.fill(); ctx.stroke();
+    }
     else { ctx.fillStyle = C.shield; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.55); ctx.lineTo(cxm(p.x), py(p.y) + cell * 0.86); ctx.lineTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
     ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.3)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
-    ctx.fillText(p.kind === 'hammer' ? 'P' : 'S', cxm(p.x), cym(p.y) + (p.kind === 'hammer' ? -cell * 0.02 : -cell * 0.04));
+    ctx.fillText(p.kind === 'hammer' ? 'P' : p.kind === 'heal' ? '+' : 'S', cxm(p.x), cym(p.y) + (p.kind === 'hammer' ? -cell * 0.02 : -cell * 0.04));
   });
 
   // portal: angka + jumlah cincin = nomor pasangan
@@ -146,33 +157,45 @@ export function drawPuzzle(ctx, W, H, session, view) {
     ctx.restore();
   });
 
-  // Kumbang penjaga: kepala/mata mengikuti arah asli, kaki bergerak selama satu langkah.
+  // Musuh dungeon: slime lunak (1 HP) dan penjaga batu berhelm (2 HP).
+  // Siluet dan titik HP membedakan jenis, tidak hanya warnanya.
   (state.guards || []).forEach((g, i) => {
+    if (g.hp === 0) return;
     const old = view.anim && view.anim.guards && view.anim.guards[i];
     const p = view.anim ? easeOutCubic(view.anim.p) : 1;
-    const walk = old && Math.abs(old.x - g.x) + Math.abs(old.y - g.y) <= 1;
+    const walk = old && Math.abs(old.x - g.x) + Math.abs(old.y - g.y) === 1;
     const gx = walk ? old.x + (g.x - old.x) * p : g.x, gy = walk ? old.y + (g.y - old.y) * p : g.y;
-    const stun = g.cd > 0, chasing = g.mode === 'chase', alerted = g.mode === 'alert';
-    ctx.save(); ctx.translate(cxm(gx), cym(gy)); ctx.rotate(Math.atan2(g.dir.y, g.dir.x));
-    ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineCap = 'round';
-    for (const side of [-1, 1]) for (const leg of [-1, 0, 1]) {
-      const wiggle = walk ? Math.sin(p * Math.PI * 2 + leg) * cell * 0.06 : 0;
-      ctx.beginPath(); ctx.moveTo(leg * cell * 0.15, side * cell * 0.21); ctx.lineTo(leg * cell * 0.19 + wiggle, side * cell * 0.39); ctx.stroke();
+    const stun = g.cd > 0, danger = g.mode === 'windup', slime = g.kind === 'slime';
+    if (danger && g.aim && !stun) {
+      ctx.fillStyle = 'rgba(196,61,48,.3)'; ctx.fillRect(px(g.aim.x) + 2, py(g.aim.y) + 2, cell - 4, cell - 4);
+      ctx.strokeStyle = '#b74737'; ctx.lineWidth = 2.5; ctx.strokeRect(px(g.aim.x) + 3, py(g.aim.y) + 3, cell - 6, cell - 6);
+      ctx.fillStyle = '#9b3028'; ctx.font = `bold ${Math.round(cell * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cxm(g.aim.x), cym(g.aim.y));
+    }
+    ctx.save(); ctx.translate(cxm(gx), cym(gy));
+    const squash = walk ? Math.sin(p * Math.PI) * 0.08 : 0;
+    ctx.fillStyle = 'rgba(50,62,49,.2)'; ctx.beginPath(); ctx.ellipse(0, cell * 0.33, cell * 0.35, cell * 0.09, 0, 0, Math.PI * 2); ctx.fill();
+    ctx.scale(1 + squash, 1 - squash);
+    ctx.strokeStyle = '#3b4943'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
+    if (slime) {
+      ctx.fillStyle = stun ? '#a4afa6' : '#82b5b1';
+      ctx.beginPath(); ctx.moveTo(-cell * 0.36, cell * 0.27); ctx.bezierCurveTo(-cell * 0.4, -cell * 0.3, -cell * 0.14, -cell * 0.47, cell * 0.08, -cell * 0.32); ctx.bezierCurveTo(cell * 0.31, -cell * 0.23, cell * 0.38, cell * 0.04, cell * 0.36, cell * 0.27); ctx.quadraticCurveTo(cell * 0.22, cell * 0.38, cell * 0.05, cell * 0.29); ctx.quadraticCurveTo(-cell * 0.17, cell * 0.42, -cell * 0.36, cell * 0.27); ctx.closePath(); ctx.fill(); ctx.stroke();
+    } else {
+      ctx.fillStyle = '#606e6b';
+      for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * cell * 0.21 - cell * 0.11, cell * 0.13, cell * 0.22, cell * 0.2, cell * 0.06); ctx.fill(); ctx.stroke(); }
+      ctx.fillStyle = stun ? '#a3a79a' : '#87968b'; ctx.beginPath(); ctx.roundRect(-cell * 0.34, -cell * 0.3, cell * 0.68, cell * 0.57, cell * 0.13); ctx.fill(); ctx.stroke();
+      ctx.fillStyle = '#bec4ab'; ctx.beginPath(); ctx.moveTo(-cell * 0.37, -cell * 0.1); ctx.lineTo(-cell * 0.28, -cell * 0.36); ctx.lineTo(cell * 0.22, -cell * 0.36); ctx.lineTo(cell * 0.37, -cell * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
     }
-    ctx.fillStyle = stun ? '#9a9c87' : chasing ? '#e66f4c' : '#e7a04c';
-    ctx.beginPath(); ctx.ellipse(-cell * 0.07, 0, cell * 0.31, cell * 0.29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
-    ctx.beginPath(); ctx.moveTo(-cell * 0.35, 0); ctx.lineTo(cell * 0.13, 0); ctx.stroke();
-    ctx.fillStyle = '#8c4f28';
-    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-cell * 0.12, side * cell * 0.15, cell * 0.065, 0, Math.PI * 2); ctx.fill(); }
-    ctx.fillStyle = '#f5d99a'; ctx.beginPath(); ctx.ellipse(cell * 0.21, 0, cell * 0.2, cell * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
     for (const side of [-1, 1]) {
-      ctx.beginPath(); ctx.moveTo(cell * 0.26, side * cell * 0.18); ctx.lineTo(cell * 0.4, side * cell * 0.3); ctx.stroke();
-      ctx.fillStyle = '#fffdf1'; ctx.beginPath(); ctx.arc(cell * 0.28, side * cell * 0.105, cell * 0.095, 0, Math.PI * 2); ctx.fill();
-      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cell * 0.32, side * cell * 0.105, cell * 0.047, 0, Math.PI * 2); ctx.fill();
+      ctx.fillStyle = '#fff8df'; ctx.beginPath(); ctx.ellipse(side * cell * 0.13, -cell * 0.025, cell * 0.09, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
+      ctx.fillStyle = '#34463f'; ctx.beginPath(); ctx.arc(side * cell * 0.13 + g.dir.x * cell * 0.025, -cell * 0.025 + g.dir.y * cell * 0.025, cell * 0.045, 0, Math.PI * 2); ctx.fill();
+      ctx.beginPath(); ctx.moveTo(side * cell * 0.06, -cell * 0.14); ctx.lineTo(side * cell * 0.23, -cell * (danger ? 0.24 : 0.18)); ctx.stroke();
     }
+    ctx.beginPath(); ctx.moveTo(-cell * 0.06, cell * 0.14); ctx.lineTo(cell * 0.06, cell * 0.14); ctx.stroke();
+    const maxHp = slime ? 1 : 2;
+    for (let h = 0; h < maxHp; h++) { ctx.fillStyle = h < g.hp ? '#b94d43' : '#e3d8c4'; ctx.beginPath(); ctx.arc((h - (maxHp - 1) / 2) * cell * 0.15, cell * 0.43, cell * 0.05, 0, Math.PI * 2); ctx.fill(); }
     ctx.restore();
-    const tag = stun ? 'zZ' : chasing ? '!!' : alerted ? '!' : g.mode === 'return' ? '?' : '';
-    if (tag) { ctx.fillStyle = '#fffdf1'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.font = `bold ${Math.round(cell * 0.42)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(tag, cxm(gx), py(gy) - cell * 0.04); ctx.fillText(tag, cxm(gx), py(gy) - cell * 0.04); }
+    const tag = stun ? 'zZ' : danger ? '!' : g.mode === 'alert' ? '?' : g.mode === 'recover' ? '···' : '';
+    if (tag) { ctx.fillStyle = '#fffdf1'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.font = `bold ${Math.round(cell * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(tag, cxm(gx), py(gy) - cell * 0.01); ctx.fillText(tag, cxm(gx), py(gy) - cell * 0.01); }
   });
 
   // Maskot satu petak: tubuh melingkar, kepala besar; hitbox sama dengan gambar.
@@ -181,11 +204,11 @@ export function drawPuzzle(ctx, W, H, session, view) {
   const hd = { x: cxm(cells[0].x), y: cym(cells[0].y) };
   const hop = view.anim ? Math.sin(Math.PI * progress) : 0;
   ctx.fillStyle = 'rgba(48,72,49,.18)'; ctx.beginPath(); ctx.ellipse(hd.x, hd.y + cell * 0.3, cell * 0.35, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
-  ctx.save(); ctx.translate(hd.x, hd.y - cell * 0.07 * hop); ctx.scale(1 - hop * 0.04, 1 + hop * 0.05);
+  ctx.save(); ctx.translate(hd.x, hd.y); ctx.scale(1 - hop * 0.04, 1 + hop * 0.05);
   ctx.strokeStyle = C.snakeOut; ctx.fillStyle = C.snakeIn; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.lineCap = 'round';
   ctx.beginPath(); ctx.ellipse(0, cell * 0.16, cell * 0.34, cell * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
   ctx.strokeStyle = '#50852a'; ctx.lineWidth = Math.max(1.5, cell * 0.04); ctx.beginPath(); ctx.ellipse(-cell * 0.05, cell * 0.17, cell * 0.18, cell * 0.07, 0, 0, Math.PI * 1.7); ctx.stroke();
-  ctx.fillStyle = '#8dc83c'; ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(2, cell * 0.06);
+  ctx.fillStyle = (view.fx || []).some(f => f.kind === 'hurt' && f.p < 0.6) ? '#e7a66b' : '#8dc83c'; ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(2, cell * 0.06);
   ctx.beginPath(); ctx.ellipse(cell * 0.04, -cell * 0.11, cell * 0.31, cell * 0.28, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
   // Wajah menghadap pemain; mata melirik mengikuti arah gerak.
   for (const side of [-1, 1]) {
@@ -195,6 +218,14 @@ export function drawPuzzle(ctx, W, H, session, view) {
   ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(1, cell * 0.035); ctx.beginPath(); ctx.arc(cell * 0.04, -cell * 0.07, cell * 0.09, 0.1, Math.PI - 0.1); ctx.stroke();
   ctx.restore();
 
+  // Tanda serangan tetap di atas maskot, sehingga tidak tertutup kepalanya.
+  (state.guards || []).filter(g => g.hp !== 0 && g.cd === 0 && g.mode === 'windup' && g.aim).forEach(g => {
+    const x = px(g.aim.x) + cell * 0.83, y = py(g.aim.y) + cell * 0.17;
+    ctx.fillStyle = '#b74737'; ctx.strokeStyle = '#fff7dc'; ctx.lineWidth = 1.5;
+    ctx.beginPath(); ctx.arc(x, y, cell * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
+    ctx.fillStyle = '#fff7dc'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y);
+  });
+
   // kepala di semak = tersembunyi: semak digambar lagi di atas kepala (setengah transparan) + label
   const hb = level.bushes.find(b => b.x === state.snake[0].x && b.y === state.snake[0].y);
   if (hb) {
@@ -208,6 +239,7 @@ export function drawPuzzle(ctx, W, H, session, view) {
     const a = 1 - f.p, r = cell * (0.25 + 0.55 * f.p);
     ctx.lineWidth = 3; ctx.strokeStyle = f.kind === 'warp' ? `rgba(197,139,255,${a})` : f.kind === 'key' ? `rgba(245,197,66,${a})` : `rgba(224,69,58,${a})`;
     ctx.beginPath(); ctx.arc(cxm(f.x), cym(f.y), r, 0, Math.PI * 2); ctx.stroke();
+    if (f.kind === 'hit') { ctx.globalAlpha = a; ctx.strokeStyle = '#fff8cf'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cxm(f.x) - r * 0.5, cym(f.y) + r * 0.5); ctx.lineTo(cxm(f.x) + r * 0.5, cym(f.y) - r * 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
     if (f.kind === 'pop') { ctx.globalAlpha = a; ctx.font = `bold ${Math.round(cell * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#6b4c13'; ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3; ctx.strokeText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.fillText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.globalAlpha = 1; }
   });
```

## lib/puzzle/sim.js

```diff
diff --git a/lib/puzzle/sim.js b/lib/puzzle/sim.js
index 06c3719..2f41777 100644
--- a/lib/puzzle/sim.js
+++ b/lib/puzzle/sim.js
@@ -1,7 +1,7 @@
-// Jejak Kunci — simulasi murni berbasis giliran. Pemain = maskot satu petak.
+// Dungeon — simulasi murni berbasis giliran. Pemain = maskot satu petak.
 // Apel adalah koin bonus opsional, tidak memanjangkan tubuh. Sakelar tetap aktif
 // setelah diinjak. Semua state termasuk koin, sakelar, dan penjaga dapat di-undo.
-// Penjaga patroli -> tanda seru satu giliran -> kejar posisi terakhir yang terlihat.
+// Penjaga patroli -> waspada -> kejar -> sasaran satu giliran -> serang -> pulih.
 // Sembunyi di semak atau lepas dari pandangan untuk memutus pengejaran.
 
 export const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };
@@ -11,7 +11,8 @@ const same = (a, b) => a.x === b.x && a.y === b.y;
 // ---------- pembuatan & validasi level ----------
 // Legenda `map`: '#' tembok, '.' lantai, 'F' koin apel, 'K' kunci, 'E' pintu keluar,
 // 'a'..'c' sakelar permanen, '1'..'3' pasangan portal (tepat dua kemunculan per angka).
-// Tahap 9a: '^' duri, 'x' tembok retak, 'g'/'h' gerbang genap/ganjil, 'v' semak, 'P' palu, 'S' perisai.
+// '^' duri, 'x' batu retak, 'G' jeruji, '!' tuas, 'v' semak, 'P' palu, 'S' perisai, 'H' heal.
+// g/h tetap dibaca untuk fixture lama; kampanye memakai G + links.
 // Penjaga tidak ada di peta: spec.guards = [{ x, y, dir: 'U|D|L|R', range?: 1..5, patrol?: [[x,y], ...] }].
 export function buildLevel(spec) {
   const errors = [];
@@ -21,7 +22,7 @@ export function buildLevel(spec) {
   const level = {
     id: spec.id, name: spec.name, goal: spec.goal, par: spec.par, w, h,
     walls: [], foods: [], keys: [], plates: [], portals: [], exit: null,
-    spikes: [], cracks: [], gates: [], bushes: [], pickups: [], guards: [],
+    spikes: [], cracks: [], gates: [], levers: [], links: (spec.links || []).map(l => ({ gate: l.gate.slice(), lever: l.lever.slice() })), bushes: [], pickups: [], guards: [],
     snake: (spec.snake || []).map(([x, y]) => ({ x, y })), dir: null,
   };
   const portalMap = {};
@@ -37,9 +38,12 @@ export function buildLevel(spec) {
       else if (c === '^') level.spikes.push({ x, y });
       else if (c === 'x') level.cracks.push({ x, y });
       else if (c === 'g' || c === 'h') level.gates.push({ x, y, open: c === 'g' ? 'even' : 'odd' });
+      else if (c === 'G') level.gates.push({ x, y, open: 'lever' });
+      else if (c === '!') level.levers.push({ x, y, id: key(x, y) });
       else if (c === 'v') level.bushes.push({ x, y });
       else if (c === 'P') level.pickups.push({ x, y, kind: 'hammer' });
       else if (c === 'S') level.pickups.push({ x, y, kind: 'shield' });
+      else if (c === 'H') level.pickups.push({ x, y, kind: 'heal' });
       else if (c >= 'a' && c <= 'c') level.plates.push({ id: c, x, y });
       else if (c >= '1' && c <= '3') (portalMap[c] = portalMap[c] || []).push({ x, y });
       else if (c !== '.') errors.push(`karakter tidak dikenal '${c}' di (${x},${y})`);
@@ -55,7 +59,8 @@ export function buildLevel(spec) {
   (spec.guards || []).forEach((g, i) => {
     const d = DIRS[g.dir];
     if (!d) { errors.push(`penjaga ${i}: arah tidak valid`); return; }
-    level.guards.push({ x: g.x, y: g.y, dir: { ...d }, range: g.range || 3, patrol: (g.patrol || []).map(([px, py]) => ({ x: px, y: py })) });
+    const kind = g.kind === 'slime' ? 'slime' : 'warden';
+    level.guards.push({ x: g.x, y: g.y, kind, hp: kind === 'slime' ? 1 : 2, dir: { ...d }, range: g.range || 3, patrol: (g.patrol || []).map(([px, py]) => ({ x: px, y: py })) });
   });
   level.wallGrid = new Array(w * h).fill(0);
   level.walls.forEach(wl => { level.wallGrid[wl.y * w + wl.x] = 1; });
@@ -91,6 +96,14 @@ export function validateLevel(level) {
   level.spikes.forEach(p => put(p, 'duri'));
   level.cracks.forEach(p => put(p, 'tembok retak'));
   level.gates.forEach(p => put(p, 'gerbang'));
+  (level.levers || []).forEach(p => put(p, 'tuas'));
+  (level.links || []).forEach(l => {
+    if (!level.gates.some(g => g.open === 'lever' && g.x === l.gate[0] && g.y === l.gate[1])) e.push('tautan gerbang tidak valid');
+    if (!(level.levers || []).some(p => p.x === l.lever[0] && p.y === l.lever[1])) e.push('tautan tuas tidak valid');
+  });
+  level.gates.filter(g => g.open === 'lever').forEach(g => {
+    if (!(level.links || []).some(l => l.gate[0] === g.x && l.gate[1] === g.y)) e.push('gerbang belum terhubung ke tuas');
+  });
   level.bushes.forEach(p => put(p, 'semak'));
   level.pickups.forEach(p => put(p, 'pickup ' + p.kind));
   level.guards.forEach((g, i) => {
@@ -118,10 +131,10 @@ export function validateLevel(level) {
 // ---------- state ----------
 export function initialState(level) {
   return {
-    snake: [{ ...level.snake[0] }], apples: 0, activated: [], dir: { ...level.dir }, steps: 0,
+    snake: [{ ...level.snake[0] }], apples: 0, activated: [], dir: { ...level.dir }, steps: 0, hearts: 3, hurtUntil: 0, defeated: 0,
     foods: level.foods.map(p => ({ ...p })), keys: level.keys.map(p => ({ ...p })), keysHeld: 0, status: 'playing',
     hammer: 0, shield: 0, pickups: (level.pickups || []).map(p => ({ ...p })), cleared: [],
-    guards: (level.guards || []).map(g => ({ x: g.x, y: g.y, dir: openFacing(level, g, new Set(), 1), mode: 'idle', pi: 0, pd: 1, cd: 0, target: null, memory: 0 })),
+    guards: (level.guards || []).map(g => ({ x: g.x, y: g.y, hp: g.hp ?? 2, kind: g.kind || 'warden', dir: openFacing(level, g, new Set(), 1), mode: 'idle', pi: 0, pd: 1, cd: 0, target: null, memory: 0, aim: null })),
   };
 }
 
@@ -144,7 +157,7 @@ export function exitStatus(level, state) {
 const at = (list, p) => (list || []).find(o => o.x === p.x && o.y === p.y);
 const inBounds = (level, p) => p.x >= 0 && p.y >= 0 && p.x < level.w && p.y < level.h;
 const isWall = (level, p) => (level.wallGrid ? level.wallGrid[p.y * level.w + p.x] === 1 : level.walls.some(w => same(w, p)));
-export const gateOpen = (gate, stepNo) => (gate.open === 'even') === (stepNo % 2 === 0);
+export const gateOpen = (gate, stepNo, state) => gate.open === 'lever' ? !!state?.cleared?.includes(key(gate.x, gate.y)) : (gate.open === 'even') === (stepNo % 2 === 0);
 const ORDER = [DIRS.U, DIRS.L, DIRS.D, DIRS.R]; // urutan tie-break tetap untuk BFS penjaga
 export const GUARD_STUN = 3;
 
@@ -155,7 +168,7 @@ function blocks(level, cleared, p, stepNo, forVision) {
   const k = key(p.x, p.y);
   if (at(level.cracks, p) && !cleared.has(k)) return true;
   const g = at(level.gates, p);
-  if (g && !gateOpen(g, stepNo)) return true;
+  if (g && !cleared.has(k) && !gateOpen(g, stepNo)) return true;
   if (!forVision && at(level.spikes, p) && !cleared.has(k)) return true;
   return false;
 }
@@ -179,6 +192,7 @@ export function openFacing(level, guard, cleared, stepNo) {
 
 // Sel yang dilihat penjaga: kedalaman 1..range, selebar 3 sel (lateral -1..1), terhalang tembok/retak/gerbang tertutup.
 export function visionCells(level, state, guard, stepNo) {
+  if (guard.hp === 0 || guard.cd > 0) return [];
   const cleared = new Set(state.cleared || []);
   const f = guard.dir, perp = { x: -f.y, y: f.x };
   const out = [];
@@ -186,15 +200,30 @@ export function visionCells(level, state, guard, stepNo) {
   for (let d = 1; d <= range; d++) {
     const c = { x: guard.x + f.x * d, y: guard.y + f.y * d };
     if (blocks(level, cleared, c, stepNo, true)) break;
-    out.push(c);
+    if (lineClear(level, cleared, guard, c, stepNo)) out.push(c);
     for (const l of [-1, 1]) {
       const s = { x: c.x + perp.x * l, y: c.y + perp.y * l };
-      if (!blocks(level, cleared, s, stepNo, true)) out.push(s);
+      if (!blocks(level, cleared, s, stepNo, true) && lineClear(level, cleared, guard, s, stepNo)) out.push(s);
     }
   }
   return out;
 }
 
+// Supercover: petak di sepanjang ray dan kedua sisi sudut harus terbuka.
+function lineClear(level, cleared, from, to, stepNo) {
+  const dx = to.x - from.x, dy = to.y - from.y, nx = Math.abs(dx), ny = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
+  let x = from.x, y = from.y, ix = 0, iy = 0;
+  while (ix < nx || iy < ny) {
+    const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
+    if (decision === 0) {
+      if (blocks(level, cleared, { x: x + sx, y }, stepNo, true) || blocks(level, cleared, { x, y: y + sy }, stepNo, true)) return false;
+      x += sx; y += sy; ix++; iy++;
+    } else if (decision < 0) { x += sx; ix++; } else { y += sy; iy++; }
+    if (blocks(level, cleared, { x, y }, stepNo, true)) return false;
+  }
+  return true;
+}
+
 const inBush = (level, snake) => !!at(level.bushes, snake[0]);
 
 function bfsNext(level, cleared, from, to, stepNo) {
@@ -225,11 +254,17 @@ function bfsNext(level, cleared, from, to, stepNo) {
 function advanceGuards(level, state, snake, stepNo, cleared) {
   const hidden = inBush(level, snake);
   const snakeCells = new Set(snake.map(p => key(p.x, p.y)));
-  const events = { alerted: false, lost: false };
+  const events = { alerted: false, attacks: [] };
   const guards = state.guards.map((g, i) => {
     const spec = level.guards[i];
     const home = { x: spec.x, y: spec.y };
+    if (g.hp === 0) return { ...g };
     if (g.cd > 0) return { ...g, cd: g.cd - 1 };
+    if (g.mode === 'windup') {
+      if (g.aim) events.attacks.push({ ...g.aim, guard: i });
+      return { ...g, mode: 'recover', aim: null };
+    }
+    if (g.mode === 'recover') return { ...g, mode: 'return', aim: null };
     let mode = g.mode;
     const sees = !hidden && visionCells(level, state, g, stepNo).some(c => snakeCells.has(key(c.x, c.y)));
     let target = sees ? { ...snake[0] } : g.target;
@@ -239,14 +274,19 @@ function advanceGuards(level, state, snake, stepNo, cleared) {
     else if (mode !== 'chase' && sees) { mode = 'alert'; events.alerted = true; }
     let n = { ...g, mode, target, memory };
     if (mode === 'chase') {
+      if (sees && Math.abs(g.x - snake[0].x) + Math.abs(g.y - snake[0].y) === 1) return { ...n, mode: 'windup', aim: { ...snake[0] }, dir: { x: snake[0].x - g.x, y: snake[0].y - g.y } };
+      if (g.kind === 'slime' && stepNo % 2) return n;
       const nx = target && bfsNext(level, cleared, g, target, stepNo);
-      if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
+      if (nx && same(nx, snake[0])) n = { ...n, mode: 'windup', aim: { ...nx }, dir: { x: nx.x - g.x, y: nx.y - g.y } };
+      else if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
       else n = { ...n, mode: 'return' };
     } else if (mode === 'return') {
+      if (g.kind === 'slime' && stepNo % 2) return n;
       const nx = bfsNext(level, cleared, g, home, stepNo);
       if (nx) n = { ...n, x: nx.x, y: nx.y, dir: { x: nx.x - g.x, y: nx.y - g.y } };
       if (same(n, home)) n = { ...n, mode: 'idle', dir: { ...(spec.patrol.length > 1 ? { x: spec.patrol[1].x - home.x, y: spec.patrol[1].y - home.y } : spec.dir) }, pi: 0, pd: 1 };
     } else if (mode === 'idle' && spec.patrol.length > 1) {
+      if (g.kind === 'slime' && stepNo % 2) return n;
       let pi = g.pi + g.pd, pd = g.pd;
       if (pi >= spec.patrol.length) { pd = -1; pi = spec.patrol.length - 2; }
       else if (pi < 0) { pd = 1; pi = 1; }
@@ -258,22 +298,22 @@ function advanceGuards(level, state, snake, stepNo, cleared) {
       if (next >= spec.patrol.length) next = spec.patrol.length - 2;
       else if (next < 0) next = 1;
       const look = spec.patrol[next];
-      n.dir = look ? { x: look.x - n.x, y: look.y - n.y } : openFacing(level, n, cleared, stepNo + 1);
+      n.dir = look && !blocks(level, cleared, look, stepNo + 1, true) ? { x: look.x - n.x, y: look.y - n.y } : openFacing(level, n, cleared, stepNo + 1);
     }
     return n;
   });
+  // Reservasi tujuan, tanpa tumpukan atau saling menembus. Prioritas bergilir.
+  const occupied = new Set(state.guards.filter(g => g.hp !== 0).map(g => key(g.x, g.y))), reserved = new Set();
+  for (let n = 0; n < guards.length; n++) {
+    const i = (n + stepNo) % guards.length, g = guards[i], old = state.guards[i];
+    if (g.hp === 0) continue;
+    const dest = key(g.x, g.y);
+    if (!same(g, old) && (occupied.has(dest) || reserved.has(dest) || same(g, snake[0]))) guards[i] = { ...g, x: old.x, y: old.y, pi: old.pi, pd: old.pd };
+    reserved.add(key(guards[i].x, guards[i].y));
+  }
   return { guards, events };
 }
 
-// Penjaga menyentuh ular? (sel akhir penjaga ada di tubuh, atau kepala masuk sel awal penjaga). Penjaga pingsan tidak menyengat.
-function stings(prevGuards, guards, snake) {
-  const cells = new Set(snake.map(p => key(p.x, p.y)));
-  const headK = key(snake[0].x, snake[0].y);
-  const out = [];
-  guards.forEach((g, i) => { if (g.cd > 0) return; if (cells.has(key(g.x, g.y)) || (prevGuards[i].cd === 0 && headK === key(prevGuards[i].x, prevGuards[i].y))) out.push(i); });
-  return out;
-}
-
 export function stepState(level, state, dirKey) {
   const waiting = dirKey === 'W';
   const d = waiting ? { x: 0, y: 0 } : DIRS[dirKey];
@@ -293,13 +333,16 @@ export function stepState(level, state, dirKey) {
     if (same(raw, p.b)) { target = { ...p.a }; warped = true; break; }
   }
   if (warped && isWall(level, target)) return reject('tembok'); // dicegah validator; pengaman saja
+  const enemy = (state.guards || []).findIndex(g => g.hp !== 0 && same(g, target));
+  const attackAt = enemy >= 0 && !waiting ? { ...target } : null;
+  if (attackAt) { target = { ...head }; warped = false; }
   const foodIdx = state.foods.findIndex(f => same(f, target));
   const collected = foodIdx !== -1;
   // rintangan pada sel tujuan (hanya dicek bila tidak lewat portal: validator melarang rintangan di atas portal)
-  let hammer = state.hammer || 0, shield = state.shield || 0, newCleared = clearedArr;
+  let hammer = state.hammer || 0, shield = state.shield || 0, hearts = state.hearts ?? 3, hurtUntil = state.hurtUntil || 0, newCleared = clearedArr;
   const tK = key(target.x, target.y);
   const gate = at(level.gates, target);
-  if (gate && !gateOpen(gate, stepNo)) return reject('gerbang');
+  if (gate && !same(target, head) && !gateOpen(gate, stepNo, state)) return reject('gerbang');
   if (at(level.cracks, target) && !cleared.has(tK)) {
     if (hammer <= 0) return reject('retak');
     hammer -= 1; newCleared = [...newCleared, tK];
@@ -311,30 +354,40 @@ export function stepState(level, state, dirKey) {
   const snake = [target];
   const plate = level.plates.find(p => same(p, target));
   const activated = plate && !(state.activated || []).includes(plate.id) ? [...(state.activated || []), plate.id].sort() : (state.activated || []);
+  const lever = (level.levers || []).find(p => same(p, target));
+  const leverGates = lever ? (level.links || []).filter(l => l.lever[0] === lever.x && l.lever[1] === lever.y).map(l => key(...l.gate)) : [];
+  const leverOn = leverGates.some(k => !newCleared.includes(k));
+  if (leverOn) newCleared = [...new Set([...newCleared, ...leverGates])].sort();
   const keyIdx = state.keys.findIndex(k => same(k, target));
   const keysHeld = state.keysHeld + (keyIdx !== -1 ? 1 : 0);
   const pk = (state.pickups || []).findIndex(p => same(p, target));
-  if (pk !== -1) { if (state.pickups[pk].kind === 'hammer') hammer += 1; else shield += 1; }
+  if (pk !== -1) { if (state.pickups[pk].kind === 'hammer') hammer += 1; else if (state.pickups[pk].kind === 'heal') hearts = Math.min(3, hearts + 1); else shield += 1; }
   const atExit = same(target, level.exit);
   if (atExit) {
     const act = activePlates(level, { activated });
     const missing = level.exit.plates.filter(id => !act.includes(id));
     if (keysHeld < level.exit.keys || missing.length) return reject('pintu', { keysMissing: Math.max(0, level.exit.keys - keysHeld), missingPlates: missing });
   }
-  const events = { ate: collected, switchOn: activated.length > (state.activated || []).length, key: keyIdx !== -1, warped, won: atExit, pickup: pk !== -1 ? state.pickups[pk].kind : null, stung: false, shielded: false, alerted: false };
+  const events = { ate: collected, switchOn: activated.length > (state.activated || []).length, leverOn, attackAt, hit: !!attackAt, defeated: false, hurt: false, key: keyIdx !== -1, warped, won: atExit, pickup: pk !== -1 ? state.pickups[pk].kind : null, stung: false, shielded: false, alerted: false };
   let guards = state.guards || [];
+  if (attackAt) guards = guards.map((g, i) => {
+    if (i !== enemy) return g;
+    const hp = Math.max(0, (g.hp ?? level.guards[i].hp ?? 2) - 1);
+    events.defeated = hp === 0;
+    return { ...g, hp, mode: 'recover', aim: null };
+  });
   let status = atExit ? 'won' : 'playing';
   if (!atExit && guards.length) {
     const clearedNow = new Set(newCleared);
-    const adv = advanceGuards(level, state, snake, stepNo, clearedNow);
+    const adv = advanceGuards(level, { ...state, guards, cleared: newCleared }, snake, stepNo, clearedNow);
     guards = adv.guards;
     events.alerted = adv.events.alerted;
-    const hit = stings(state.guards, guards, snake);
-    if (hit.length) {
+    const hits = adv.events.attacks.filter(a => same(a, target));
+    if (hits.length && stepNo >= hurtUntil) {
       if (shield > 0) {
         shield -= 1; events.shielded = true;
-        guards = guards.map((g, i) => hit.includes(i) ? { x: level.guards[i].x, y: level.guards[i].y, dir: { ...level.guards[i].dir }, mode: 'idle', pi: 0, pd: 1, cd: GUARD_STUN } : g);
-      } else { status = 'lost'; events.stung = true; }
+        guards = guards.map((g, i) => hits.some(a => a.guard === i) ? { ...g, cd: GUARD_STUN, mode: 'idle', aim: null } : g);
+      } else { hearts--; hurtUntil = stepNo + 2; events.hurt = true; if (hearts <= 0) { status = 'lost'; events.stung = true; } }
     }
   }
   return {
@@ -345,7 +398,7 @@ export function stepState(level, state, dirKey) {
       keys: keyIdx !== -1 ? state.keys.filter((_, i) => i !== keyIdx) : state.keys,
       keysHeld, status, hammer, shield,
       pickups: pk !== -1 ? state.pickups.filter((_, i) => i !== pk) : (state.pickups || []),
-      cleared: newCleared, guards,
+      cleared: newCleared, guards, hearts, hurtUntil, defeated: (state.defeated || 0) + (events.defeated ? 1 : 0),
     },
   };
 }
@@ -367,14 +420,16 @@ export function undo(session) {
 
 export const restart = (session) => newSession(session.level);
 
-// Penyelesaian paling singkat (BFS) — dipakai test untuk membuktikan par & solvabilitas, dan oleh generator level.
+// Penyelesaian paling singkat (BFS / A*) — dipakai test untuk membuktikan par & solvabilitas, dan oleh generator level.
 // Encoding mencakup posisi, kunci, sakelar, pickup, item, rintangan terpecah,
 // paritas langkah (bila ada gerbang), serta keadaan penjaga. Koin diabaikan karena tidak memengaruhi solusi.
 export function solve(level, maxStates = 400000, stats) {
-  const hasGates = (level.gates || []).length > 0;
+  const hasGates = (level.gates || []).some(g => g.open !== 'lever');
   const enc = s => s.snake.map(p => p.x + ':' + p.y).join('|') + '/' + s.keysHeld + '/' + (s.activated || []).join(',') + '/' + s.keys.map(f => f.x + ':' + f.y).join('|')
     + '/' + (s.hammer || 0) + (s.shield || 0) + '/' + (s.pickups || []).map(f => f.x + ':' + f.y).join('|') + '/' + (s.cleared || []).join('|')
-    + (hasGates ? '/' + (s.steps % 2) : '') + (s.guards && s.guards.length ? '/' + s.guards.map(g => g.x + ':' + g.y + g.dir.x + g.dir.y + g.mode + g.pi + g.pd + g.cd + ':' + (g.target ? g.target.x + ',' + g.target.y : '-') + ':' + g.memory).join('|') : '');
+    + '/' + s.hearts + ':' + Math.max(0, s.hurtUntil - s.steps)
+    + (hasGates || level.guards.some(g => g.kind === 'slime') ? '/' + (s.steps % 2) : '') + (s.guards && s.guards.length ? '/' + s.guards.map(g => g.hp === 0 ? 'dead' : g.x + ':' + g.y + g.dir.x + g.dir.y + g.mode + g.pi + g.pd + g.cd + ':' + (g.target ? g.target.x + ',' + g.target.y : '-') + ':' + g.memory + ':' + g.hp + ':' + (g.aim ? g.aim.x + ',' + g.aim.y : '-')).join('|') : '');
+  if (level.guards.length && !level.portals.length) return solveCombat(level, maxStates, stats, enc);
   const start = initialState(level);
   const seen = new Set([enc(start)]);
   let frontier = [{ s: start, path: '' }];
@@ -399,3 +454,48 @@ export function solve(level, maxStates = 400000, stats) {
   if (stats) stats.states = (stats.states || 0) + n;
   return null;
 }
+
+// A* untuk combat: lower bound hanya menghitung jarak ke tujuan wajib dan mengabaikan rintangan.
+// Portal tetap memakai BFS, karena jarak Manhattan bukan lower bound untuk teleport.
+function solveCombat(level, maxStates, stats, enc) {
+  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
+  const estimate = s => {
+    const head = s.snake[0], exit = level.exit;
+    let h = dist(head, exit);
+    const required = level.plates.filter(p => exit.plates.includes(p.id) && !s.activated.includes(p.id));
+    if (exit.keys - s.keysHeld >= s.keys.length) required.push(...s.keys);
+    for (const p of required) h = Math.max(h, dist(head, p) + dist(p, exit));
+    return h;
+  };
+  const heap = [], better = (a, b) => a.f < b.f || (a.f === b.f && (a.g > b.g || (a.g === b.g && a.order < b.order)));
+  function push(item) {
+    heap.push(item); let i = heap.length - 1;
+    while (i > 0) { const p = (i - 1) >> 1; if (!better(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
+  }
+  function pop() {
+    const first = heap[0], last = heap.pop();
+    if (heap.length) {
+      heap[0] = last; let i = 0;
+      for (;;) { let next = i; const l = i * 2 + 1, r = l + 1; if (l < heap.length && better(heap[l], heap[next])) next = l; if (r < heap.length && better(heap[r], heap[next])) next = r; if (next === i) break; [heap[i], heap[next]] = [heap[next], heap[i]]; i = next; }
+    }
+    return first;
+  }
+  const start = initialState(level), best = new Map([[enc(start), 0]]);
+  let n = 0, order = 0;
+  push({ s: start, path: '', g: 0, f: estimate(start), order: order++ });
+  while (heap.length) {
+    const current = pop();
+    if (best.get(enc(current.s)) !== current.g) continue;
+    if (current.s.status === 'won') { if (stats) stats.states = (stats.states || 0) + n; return current.path; }
+    if (++n > maxStates) break;
+    for (const k of ['U', 'D', 'L', 'R', 'W']) {
+      const r = stepState(level, current.s, k);
+      if (!r.moved || r.state.status === 'lost') continue;
+      const id = enc(r.state), g = current.g + 1;
+      if (best.has(id) && best.get(id) <= g) continue;
+      best.set(id, g); push({ s: r.state, path: current.path + k, g, f: g + estimate(r.state), order: order++ });
+    }
+  }
+  if (stats) stats.states = (stats.states || 0) + n;
+  return null;
+}
```

## scripts/build-campaign.mjs

```diff
diff --git a/scripts/build-campaign.mjs b/scripts/build-campaign.mjs
index a0388b7..84f5d8a 100644
--- a/scripts/build-campaign.mjs
+++ b/scripts/build-campaign.mjs
@@ -11,8 +11,8 @@ const { getLevel, TIERS, tierOf, MAX_LEVEL, TUTORIAL_COUNT } = generator;
 const INTRO = {
   portal: 'Baru: Portal. Masuk satu ujung, kepalamu muncul di ujung pasangannya (angka dan jumlah cincin sama).',
   duri: 'Baru: Duri dan tembok retak. Duri hanya bisa dilewati dengan Perisai (S), tembok retak dengan Palu (P). Keduanya sekali pakai.',
-  gerbang: 'Baru: Gerbang bergantian. Pagar terbuka bergantian tiap langkah. Panah = bisa lewat pada giliran berikut; palang = tertutup. Tekan Spasi atau Tunggu untuk menunggu.',
-  penjaga: 'Baru: Penjaga. Ia berpatroli. Tanda ! memberi satu giliran sebelum mengejar posisi terakhirmu. Sembunyi di semak agar ia pulang. Tersengat = game over.',
+  gerbang: 'Baru: Tuas. Injak tuas kuningan untuk membuka gerbang permanen. Tidak ada hitungan genap/ganjil.',
+  penjaga: 'Baru: Dungeon dijaga musuh. Tiga hati; tekan arah ke musuh untuk menyerang. Hindari petak serangan yang ditandai. Slime 1 HP, penjaga 2 HP.',
 };
 const specs = [];
 for (let n = TUTORIAL_COUNT + 1; n <= MAX_LEVEL; n++) {
@@ -22,7 +22,7 @@ for (let n = TUTORIAL_COUNT + 1; n <= MAX_LEVEL; n++) {
   const s = g.spec;
   specs.push({
     id: `gen-${n}`, name: s.name, tier: t.name, intro: n === t.from && t.intro ? INTRO[t.intro] : null,
-    goal: s.goal, par: g.par, map: s.map, snake: s.snake, dir: s.dir, exit: s.exit, guards: s.guards || [],
+    goal: s.goal, par: g.par, map: s.map, snake: s.snake, dir: s.dir, exit: s.exit, guards: s.guards || [], links: s.links || [],
   });
 }
 const body = `// DIBUAT OTOMATIS oleh scripts/build-campaign.mjs dari generator (seed kampanye tetap). Jangan diedit tangan.\n// Level 6..50 "Jejak Kunci". Generator dijalankan di luar runtime karena butuh sampai ~1,5 dtk per level.\nexport const CAMPAIGN_SPECS = ${JSON.stringify(specs, null, 1).replace(/\n\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']')};\n`;
```

## tests/puzzle.test.mjs

```diff
diff --git a/tests/puzzle.test.mjs b/tests/puzzle.test.mjs
index 1dfb0ae..94b8934 100644
--- a/tests/puzzle.test.mjs
+++ b/tests/puzzle.test.mjs
@@ -257,7 +257,7 @@ test('controller: level selesai tepat sekali — hasil satu kali, progres tersim
   w.play(SOLUTIONS['jk-1']);
   assert.equal(w.eng.getState(), 'won');
   assert.equal(w.overlays('gameover').length, 1);
-  assert.equal(w.overlays('gameover')[0].overlay.title, 'Level Selesai!');
+  assert.equal(w.overlays('gameover')[0].overlay.title, 'Ruang Selesai!');
   assert.equal(w.saves.length, 1);
   assert.equal(w.progress.puzzle.levels['jk-1'].best, 13);
   assert.equal(w.last('puzzleMenu').selected, 1, 'otomatis menyorot level berikutnya');
```

## tests/puzzle9a.test.mjs

```diff
diff --git a/tests/puzzle9a.test.mjs b/tests/puzzle9a.test.mjs
index 9602d3d..7665b84 100644
--- a/tests/puzzle9a.test.mjs
+++ b/tests/puzzle9a.test.mjs
@@ -92,30 +92,20 @@ test('pandangan terhalang tembok: ular di balik tembok tidak terlihat', () => {
   assert.ok(visionCells(lv, st, st.guards[0], 1).every(c => c.x >= 8), 'tidak melihat tembus tembok');
 });
 
-test('penjaga melihat ular -> kejar; kontak = kalah (status lost, kejadian stung)', () => {
-  const lv = guardLevel();
-  let s = newSession(lv);
-  s = run(s, 'RRR');                                      // kepala (5,1) masuk pandangan
-  assert.equal(s.state.guards[0].mode, 'alert');
-  const before = Math.abs(s.state.guards[0].x - s.state.snake[0].x) + Math.abs(s.state.guards[0].y - s.state.snake[0].y);
-  let r, guard = 0;
-  while (s.state.status === 'playing' && guard++ < 10) { r = move(s, 'R'); if (!r.moved) break; s = r.session; }
-  assert.equal(s.state.status, 'lost'); assert.equal(r.events.stung, true);
-  assert.ok(before >= 2);
-  // setelah kalah, input ditolak
+test('penjaga terlihat, menyiapkan serangan, tiga serangan menghabiskan hati', () => {
+  const lv = guardLevel(); let s = run(newSession(lv), 'RRR');
+  assert.equal(s.state.guards[0].mode, 'alert'); assert.equal(s.state.hearts, 3);
+  let last; for (let i = 0; i < 24 && s.state.status === 'playing'; i++) { last = move(s, 'W'); s = last.session; }
+  assert.equal(s.state.status, 'lost'); assert.equal(s.state.hearts, 0); assert.equal(last.events.stung, true);
   assert.equal(move(s, 'D').reason, 'selesai');
 });
 
-test('Perisai menahan satu sengatan: penjaga pulang ke posisi awal dan pingsan GUARD_STUN langkah', () => {
-  const lv = guardLevel({ '3,1': 'S' });
-  let s = newSession(lv);
-  s = run(s, 'RRR');                                      // ambil perisai di langkah 1, terlihat di langkah 3
-  let stunned = null, guard = 0;
-  while (guard++ < 10) { const r = move(s, 'R'); if (!r.moved) break; s = r.session; if (r.events.shielded) { stunned = s; break; } }
-  assert.ok(stunned, 'sengatan tertahan perisai');
-  const g = stunned.state.guards[0];
-  assert.equal(stunned.state.status, 'playing'); assert.equal(stunned.state.shield, 0);
-  assert.deepEqual([g.x, g.y, g.mode, g.cd], [8, 2, 'idle', GUARD_STUN]);
+test('Perisai menahan satu pukulan: musuh pingsan di tempat selama GUARD_STUN', () => {
+  const lv = guardLevel({ '3,1': 'S' }); let s = run(newSession(lv), 'RRR'), hit = null;
+  for (let i = 0; i < 20; i++) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) { hit = r; break; } }
+  assert.ok(hit); assert.equal(s.state.shield, 0); assert.equal(s.state.hearts, 3);
+  assert.equal(s.state.guards[0].cd, GUARD_STUN);
+  assert.deepEqual([s.state.guards[0].x, s.state.guards[0].y], [6, 1]);
 });
 
 test('bersembunyi di semak: kejaran berhenti (return) lalu penjaga kembali ke posisi awal dan idle', () => {
@@ -157,7 +147,8 @@ test('masuk pintu pada langkah yang sama dengan sengatan = MENANG (kemenangan di
   const r2 = move(newSession(lv2), 'R');
   assert.equal(r2.session.state.status, 'playing');
   const contact = stepState(lv2, { ...r2.state, guards: [{ ...r2.state.guards[0], mode: 'chase', target: r2.state.snake[0], memory: 3 }] }, 'W');
-  assert.equal(contact.state.status, 'lost');
+  assert.equal(contact.state.status, 'playing');
+  assert.equal(contact.state.hearts, 3, 'tidak mati seketika sebelum telegraph');
 });
 
 test('penjaga pingsan tidak menyengat dan tidak melihat', () => {
@@ -165,7 +156,7 @@ test('penjaga pingsan tidak menyengat dan tidak melihat', () => {
   let s = newSession(lv);
   s = run(s, 'RRR');
   let guard = 0;
-  while (guard++ < 10) { const r = move(s, 'R'); if (!r.moved) break; s = r.session; if (r.events.shielded) break; }
+  while (guard++ < 10) { const r = move(s, 'W'); s = r.session; if (r.events.shielded) break; }
   assert.equal(s.state.guards[0].cd, GUARD_STUN);
   const r1 = move(s, 'D'); assert.equal(r1.moved, true);
   assert.equal(r1.session.state.guards[0].cd, GUARD_STUN - 1);
@@ -199,11 +190,11 @@ test('solver memahami penjaga dan semak: solusi terpendek menyusuri semak dan di
   assert.equal(sol.length, 9, 'jalur lurus lewat semak (hidden) = 9 langkah');
 });
 
-test('solver: level yang mustahil (penjaga tak terhindarkan di lorong sempit) mengembalikan null', () => {
+test('solver: lorong sempit dengan penjaga dapat dilalui setelah bertarung', () => {
   const rows = ['#########', '#.......#', '#########'];
   const m = rows.map(r => r.split('')); m[1][7] = 'E';
   const lv = build({ map: m.map(r => r.join('')), snake: [[2, 1], [1, 1]], dir: 'R', exit: { keys: 0, plates: [] }, guards: [{ x: 5, y: 1, dir: 'L', range: 3 }] });
-  assert.equal(solve(lv), null);
+  const solution = solve(lv); assert.ok(solution); assert.equal(run(newSession(lv), solution).state.status, 'won');
 });
 
 // ---------- generator ----------
@@ -244,10 +235,11 @@ test('generator: ke-45 level valid, bukan cadangan, solusi diputar ulang MENANG,
   for (const n of [6, 20, 35, 44]) { const g = ALL[n - 6]; assert.equal(solve(g.level, 200000).length, g.par); }
 });
 
-test('generator: rata-rata par naik per sepertiga (6-20 < 21-35 < 36-50) dan semua >= 8', () => {
+test('generator: puzzle awal bertambah panjang, combat bertambah jenis dan jumlah musuh', () => {
   const avg = (a, b) => { const xs = ALL.filter(g => g.n >= a && g.n <= b).map(g => g.par); return xs.reduce((p, q) => p + q, 0) / xs.length; };
   const a = avg(6, 20), b = avg(21, 35), c = avg(36, 50);
-  assert.ok(a < b && b < c, `rata-rata ${a.toFixed(1)} < ${b.toFixed(1)} < ${c.toFixed(1)}`);
+  assert.ok(a < b, 'puzzle menambah rute');
+  for (const g of ALL.filter(g => g.n >= 35)) assert.equal(g.level.guards.length, g.n < 43 ? 1 : 2);
   ALL.forEach(g => assert.ok(g.par >= 8));
 });
```

## tests/puzzle9b.test.mjs

```diff
diff --git a/tests/puzzle9b.test.mjs b/tests/puzzle9b.test.mjs
index 57987b8..7ea5c38 100644
--- a/tests/puzzle9b.test.mjs
+++ b/tests/puzzle9b.test.mjs
@@ -43,7 +43,8 @@ test('kampanye: data yang dikirim identik dengan keluaran generator (seed kampan
 
 test('kampanye: kurva makin sulit (rata-rata par per sepertiga naik) dan tiap spec membawa tier + kartu pengantar bila tier baru', () => {
   const avg = (a, b) => { const xs = CAMPAIGN_SPECS.filter(s => { const n = Number(s.id.slice(4)); return n >= a && n <= b; }).map(s => s.par); return xs.reduce((x, y) => x + y, 0) / xs.length; };
-  assert.ok(avg(6, 20) < avg(21, 35) && avg(21, 35) < avg(36, 50));
+  assert.ok(avg(6, 20) < avg(21, 34));
+  for (const [i, lv] of CAMPAIGN_LEVELS.entries()) assert.equal(lv.guards.length, i < 34 ? 0 : i < 42 ? 1 : 2);
   for (const s of CAMPAIGN_SPECS) assert.ok(typeof s.tier === 'string' && s.tier);
   for (const n of [13, 20, 28, 35]) { const s = CAMPAIGN_SPECS.find(x => x.id === `gen-${n}`); assert.ok(s.intro && s.intro.length > 10, `level ${n} memperkenalkan elemen baru`); }
 });
@@ -83,7 +84,7 @@ test('controller: menyelesaikan tutorial membuka level 6; menang di level 6 meny
   assert.equal(w.saves.length, 1);
 });
 
-test('controller: level 50 selesai = "Semua Level Tamat!" sekali, tombol Main Lagi', () => {
+test('controller: level 50 selesai = "Semua Ruang Tamat!" sekali, tombol Main Lagi', () => {
   const w = world(clearedUpTo(49));
   assert.equal(w.last('puzzleMenu').selected, 49);
   w.eng.startRun();
@@ -91,7 +92,7 @@ test('controller: level 50 selesai = "Semua Level Tamat!" sekali, tombol Main La
   assert.equal(w.eng.getState(), 'won');
   const o = w.overlays('gameover');
   assert.equal(o.length, 1);
-  assert.equal(o[0].overlay.title, 'Semua Level Tamat!');
+  assert.equal(o[0].overlay.title, 'Semua Ruang Tamat!');
   assert.equal(o[0].overlay.btnText, 'Main Lagi');
   assert.equal(w.saves.length, 1);
 });
@@ -104,11 +105,12 @@ const rejectRoom = (ch) => { const m = ROOM.map(r => r.split('')); m[3][9] = 'E'
 test('sengatan = game over: hasil satu kali, suara mati sekali, tidak menyimpan progres, input berikutnya diabaikan', () => {
   const w = makePuzzleWorld({ levels: [guardRoom()] });
   w.eng.startRun();
-  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 12) w.eng.setDir(...D.R);
+  w.play('RRR');
+  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
   assert.equal(w.eng.getState(), 'lost');
   const o = w.overlays('gameover');
   assert.equal(o.length, 1);
-  assert.equal(o[0].overlay.title, 'Tersengat!');
+  assert.equal(o[0].overlay.title, 'Hati Habis!');
   assert.equal(o[0].overlay.btnText, 'Coba Lagi');
   assert.equal(w.calls.death, 1); assert.equal(w.saves.length, 0);
   const steps = w.last('score');
@@ -121,7 +123,8 @@ test('sengatan = game over: hasil satu kali, suara mati sekali, tidak menyimpan
 test('Coba Lagi memulai level yang SAMA dari awal (langkah 0, penjaga di rumah)', () => {
   const w = makePuzzleWorld({ levels: [guardRoom()] });
   w.eng.startRun();
-  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 12) w.eng.setDir(...D.R);
+  w.play('RRR');
+  let guard = 0; while (w.eng.getState() === 'playing' && guard++ < 24) w.eng.setDir(...D.W);
   assert.equal(w.eng.getState(), 'lost');
   assert.equal(w.eng.startRun(), true);
   assert.equal(w.eng.getState(), 'playing');
```

## tests/revive-quest.test.mjs

```diff
diff --git a/tests/revive-quest.test.mjs b/tests/revive-quest.test.mjs
index e72595c..c4f0c29 100644
--- a/tests/revive-quest.test.mjs
+++ b/tests/revive-quest.test.mjs
@@ -132,7 +132,7 @@ test('animasi puzzle: input beruntun antre, pause membekukan antrean, undo tidak
 test('kampanye baru: semua penjaga punya rute 3+ petak, semua apel opsional, maskot satu petak', () => {
   for (const lv of campaign.CAMPAIGN_LEVELS) {
     assert.equal(P.initialState(lv).snake.length, 1);
-    assert.equal(lv.revision, 3);
+    assert.equal(lv.revision, 4);
     assert.ok(lv.foods.length <= 3);
     for (const g of lv.guards) assert.ok(g.patrol.length >= 3);
     assert.equal(P.solve({ ...lv, foods: [] }, 60000).length, lv.par, lv.id);
```

## lib/input.js

```diff
diff --git a/lib/input.js b/lib/input.js
new file mode 100644
index 0000000..2fbec4d
--- /dev/null
+++ b/lib/input.js
@@ -0,0 +1,49 @@
+// Satu pemilik status hold untuk keyboard dan DPad. Repeat OS tidak menjadi antrean langkah.
+export function createDirectionInput({ send, cancel, enabled, stepMode, later = setTimeout, stop = clearTimeout, delay = 190, interval = 135 }) {
+  const pressed = new Map();
+  let order = 0, timer = null;
+  const active = player => [...pressed.values()].filter(v => v.player === player).sort((a, b) => b.order - a.order)[0];
+  function schedule(ms) {
+    if (timer !== null) stop(timer);
+    timer = null;
+    if (!stepMode() || !pressed.size) return;
+    timer = later(() => {
+      timer = null;
+      if (!enabled()) { clear(); return; }
+      for (const player of new Set([...pressed.values()].map(v => v.player))) {
+        const v = active(player);
+        if (v) send(player, v.x, v.y, { source: v.key, repeat: true });
+      }
+      schedule(interval);
+    }, ms);
+  }
+  function press(key, player, x, y) {
+    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) + Math.abs(y) !== 1) return;
+    if (!enabled()) { clear(); return; }
+    const old = pressed.get(key);
+    if (old && old.x === x && old.y === y) return;
+    const v = { key, player, x, y, order: ++order };
+    pressed.set(key, v);
+    send(player, x, y, { source: key, repeat: false });
+    schedule(delay);
+  }
+  function release(key) {
+    const old = pressed.get(key);
+    if (!old) return;
+    const wasActive = active(old.player)?.key === key;
+    pressed.delete(key);
+    if (cancel) cancel(old.player, key);
+    if (wasActive && enabled()) {
+      const next = active(old.player);
+      if (next && (next.x !== old.x || next.y !== old.y)) send(next.player, next.x, next.y, { source: next.key, repeat: false });
+    }
+    schedule(delay);
+  }
+  function clear() {
+    if (timer !== null) stop(timer);
+    timer = null;
+    if (cancel) pressed.forEach(v => cancel(v.player, v.key));
+    pressed.clear();
+  }
+  return { press, release, clear };
+}
```

## tests/dungeon-input.test.mjs

```diff
diff --git a/tests/dungeon-input.test.mjs b/tests/dungeon-input.test.mjs
new file mode 100644
index 0000000..132437e
--- /dev/null
+++ b/tests/dungeon-input.test.mjs
@@ -0,0 +1,49 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import { pathToFileURL } from 'node:url';
+import { root, puzzle as P, createPuzzleGame, makePuzzleWorld } from './helpers/env.mjs';
+const { createDirectionInput } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/input.mjs'));
+const room = (id = 'input') => P.buildLevel({ id, name: id, par: 10, map: ['########', '#.....E#', '#......#', '#......#', '#......#', '#......#', '########'], snake: [[3, 4]], dir: 'U', exit: { keys: 0, plates: [] } }).level;
+
+test('arah baru mengganti repeat lama, satu tap tidak menjadi tiga langkah', () => {
+  const w = makePuzzleWorld({ levels: [room()], animate: true }); w.eng.startRun();
+  w.eng.setDir(0, -1); w.now += 20; w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
+  w.frame(130); w.frame(130);
+  assert.equal(w.last('score'), 2); assert.equal(w.rafQueue.length, 0); w.eng.destroy();
+});
+
+test('arah tertahan tembok tidak menahan arah baru; repeat yang dilepas dibatalkan', () => {
+  const lv = { ...room(), snake: [{ x: 3, y: 2 }] };
+  const w = makePuzzleWorld({ levels: [lv], animate: true }); w.eng.startRun();
+  w.eng.setDir(0, -1); w.eng.setDir(0, -1, { repeat: true, source: 'up' }); w.eng.setDir(-1, 0);
+  w.frame(130); assert.equal(w.last('score'), 2);
+  w.eng.setDir(-1, 0, { repeat: true, source: 'left' }); w.eng.cancelHeldInput('left'); w.frame(130);
+  assert.equal(w.last('score'), 2); w.eng.destroy();
+});
+
+test('repeat milik aplikasi, arah terakhir menang, keyup/clear berhenti dan pemain terpisah', () => {
+  const calls = [], timers = new Map(); let seq = 0, enabled = true;
+  const input = createDirectionInput({ send: (...v) => calls.push(v), enabled: () => enabled, stepMode: () => true,
+    later: fn => { timers.set(++seq, fn); return seq; }, stop: id => timers.delete(id) });
+  const tick = () => { const q = [...timers.values()]; timers.clear(); q.forEach(fn => fn()); };
+  input.press('up', 0, 0, -1); input.press('up', 0, 0, -1); assert.equal(calls.length, 1);
+  tick(); assert.equal(calls.length, 2); assert.equal(calls[1][3].repeat, true);
+  input.press('left', 0, -1, 0); input.release('up'); tick();
+  assert.deepEqual(calls.at(-1).slice(0, 3), [0, -1, 0]);
+  input.press('p2', 1, 1, 0); tick(); assert.equal(calls.at(-1)[0], 1);
+  input.clear(); const n = calls.length; tick(); assert.equal(calls.length, n);
+  input.press('diagonal', 0, 1, 1); assert.equal(calls.length, n);
+  input.press('left', 0, -1, 0); enabled = false; tick(); assert.equal(timers.size, 0);
+});
+
+test('gagal simpan A lalu berhasil simpan B tetap menyimpan dua ruang dan dua koin', () => {
+  const lv = P.buildLevel({ id: 'save-a', name: 'save', par: 4, map: ['########', '#.FK.E.#', '########'], snake: [[1, 1]], dir: 'R', exit: { keys: 1, plates: [] } }).level;
+  const noop = () => {}, ctx = new Proxy({}, { get: () => noop, set: () => true });
+  let disk = { v: 1, puzzle: { levels: {} } }, saves = 0, last;
+  const e = createPuzzleGame({ canvas: { width: 680, height: 600, getContext: () => ctx }, sounds: { playChomp: noop, playMove: noop },
+    levels: [lv, { ...lv, id: 'save-b' }], io: { load: () => disk, save: p => { if (++saves === 1) return false; disk = p; return true; } }, onUpdate: p => { if (p.puzzleMenu) last = p.puzzleMenu; } });
+  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0); assert.equal(last.savePending, true);
+  e.startRun(); for (let i = 0; i < 4; i++) e.setDir(1, 0);
+  assert.equal(last.savePending, false); assert.equal(last.coins, 2); assert.ok(disk.puzzle.levels['save-a']); assert.ok(disk.puzzle.levels['save-b']);
+  assert.equal(last.levels[1].unlocked, true); e.destroy();
+});
```

## tests/dungeon-combat.test.mjs

```diff
diff --git a/tests/dungeon-combat.test.mjs b/tests/dungeon-combat.test.mjs
new file mode 100644
index 0000000..92cd516
--- /dev/null
+++ b/tests/dungeon-combat.test.mjs
@@ -0,0 +1,126 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import { puzzle as P, campaign } from './helpers/env.mjs';
+
+const build = extra => {
+  const r = P.buildLevel({ id: 'dungeon', name: 'Dungeon', par: 99, map: ['#########', '#.......#', '#.......#', '#......E#', '#########'], snake: [[2, 2]], dir: 'R', exit: { keys: 0, plates: [] }, ...extra });
+  assert.ok(r.level, r.errors.join('; ')); return r.level;
+};
+const withGuard = (kind = 'warden') => build({ guards: [{ x: 3, y: 2, dir: 'L', kind }] });
+const frozen = o => { if (o && typeof o === 'object') { Object.values(o).forEach(frozen); Object.freeze(o); } return o; };
+
+test('tuas membuka jeruji permanen, nomor tautan valid, undo mengembalikan pintu tertutup', () => {
+  const lv = build({ map: ['#########', '#..!G..E#', '#########'], snake: [[2, 1]], links: [{ lever: [3, 1], gate: [4, 1] }] });
+  const start = P.newSession(lv), r = P.move(start, 'R');
+  assert.equal(P.gateOpen(lv.gates[0], 1, start.state), false);
+  assert.equal(r.events.leverOn, true);
+  for (const turn of [2, 3, 4, 20]) assert.equal(P.gateOpen(lv.gates[0], turn, r.state), true);
+  assert.equal(P.move(r.session, 'R').moved, true);
+  assert.deepEqual(P.undo(r.session).session.state, start.state);
+  assert.equal(P.buildLevel({ id: 'bad', par: 1, map: ['#####', '#.GE#', '#####'], snake: [[1, 1]], dir: 'R' }).level, null);
+});
+
+test('gerbang ritme lama: menunggu atau keluar saat jeruji menutup tidak mengunci pemain', () => {
+  const lv = build({ map: ['#########', '#..h...E#', '#########'], snake: [[2, 1]] });
+  let s = P.move(P.newSession(lv), 'R').session;
+  const wait = P.move(s, 'W'); assert.equal(wait.moved, true); s = wait.session;
+  assert.equal(P.move(s, 'R').moved, true);
+});
+
+test('LOS tidak menembus sisi tembok atau sudut diagonal', () => {
+  const lv = build({ map: ['#########', '#..#....#', '#.......#', '#......E#', '#########'], snake: [[1, 3]], guards: [{ x: 2, y: 2, dir: 'R', range: 4 }] });
+  const st = P.initialState(lv), g = { ...st.guards[0], dir: { x: 1, y: 0 } }; st.guards[0] = g;
+  const cells = P.visionCells(lv, st, g, 1);
+  assert.ok(cells.some(c => c.x === 4 && c.y === 2));
+  assert.ok(!cells.some(c => c.x === 4 && c.y === 1), 'ray melewati sudut tembok (3,1)');
+  assert.ok(cells.some(c => c.x === 6 && c.y === 1), 'ray lain yang bebas tetap terlihat');
+});
+
+test('musuh menuju petak yang sama tidak bertumpuk atau masuk ke petak pemain', () => {
+  const lv = build({ snake: [[4, 3]], guards: [{ x: 3, y: 2, dir: 'R' }, { x: 5, y: 2, dir: 'L' }] });
+  let st = P.initialState(lv);
+  st.guards = st.guards.map(g => ({ ...g, mode: 'chase', target: { x: 4, y: 2 }, memory: 3 }));
+  for (let i = 0; i < 8; i++) {
+    st = P.stepState(lv, st, 'W').state;
+    const live = st.guards.filter(g => g.hp > 0);
+    assert.equal(new Set(live.map(g => `${g.x},${g.y}`)).size, live.length);
+    assert.ok(live.every(g => g.x !== st.snake[0].x || g.y !== st.snake[0].y));
+    if (st.status !== 'playing') break;
+  }
+});
+
+test('bump attack: penjaga 2 HP, slime 1 HP, tidak maju atau tumbuh, musuh mati tidak menghalangi', () => {
+  for (const [kind, hp] of [['warden', 2], ['slime', 1]]) {
+    const lv = withGuard(kind); let s = frozen(P.newSession(lv));
+    for (let h = hp; h > 0; h--) {
+      const r = P.move(s, 'R'); assert.equal(r.events.hit, true); s = r.session;
+      assert.equal(s.state.guards[0].hp, h - 1); assert.deepEqual(s.state.snake, [{ x: 2, y: 2 }]);
+    }
+    assert.equal(s.state.defeated, 1); assert.equal(s.state.apples, 0);
+    assert.deepEqual(P.visionCells(lv, s.state, s.state.guards[0], s.state.steps + 1), []);
+    assert.deepEqual(P.move(s, 'R').state.snake, [{ x: 3, y: 2 }]);
+  }
+});
+
+test('alert lalu windup mengunci sasaran: ada satu giliran untuk menghindar, serangan tidak mengikuti pemain', () => {
+  const lv = withGuard(); let st = P.initialState(lv);
+  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'alert');
+  st = P.stepState(lv, st, 'W').state; assert.equal(st.guards[0].mode, 'windup');
+  assert.deepEqual(st.guards[0].aim, { x: 2, y: 2 });
+  const dodge = P.stepState(lv, frozen(st), 'U');
+  assert.equal(dodge.state.hearts, 3); assert.equal(dodge.state.guards[0].mode, 'recover');
+  const hit = P.stepState(lv, st, 'W'); assert.equal(hit.state.hearts, 2); assert.equal(hit.events.hurt, true);
+});
+
+test('dua serangan serentak hanya satu damage; kebal satu giliran, hati ketiga habis = kalah', () => {
+  const lv = build({ guards: [{ x: 3, y: 2, dir: 'L' }, { x: 2, y: 1, dir: 'D' }] });
+  let st = P.initialState(lv);
+  const armed = s => ({ ...s, guards: s.guards.map(g => ({ ...g, mode: 'windup', aim: { ...s.snake[0] } })) });
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 2);
+  st = P.stepState(lv, armed(st), 'W').state; assert.equal(st.hearts, 1);
+  st = P.stepState(lv, armed(st), 'W').state;
+  const death = P.stepState(lv, armed(st), 'W');
+  assert.equal(death.state.status, 'lost'); assert.equal(death.state.hearts, 0); assert.equal(death.events.stung, true);
+  assert.equal(P.stepState(lv, death.state, 'R').reason, 'selesai');
+});
+
+test('heal pulih 1 maksimal 3; perisai stun di tempat dan tidak mereset posisi ke rumah', () => {
+  const lv = build({ map: ['#########', '#.......#', '#..H....#', '#......E#', '#########'], guards: [{ x: 6, y: 2, dir: 'L' }] });
+  const start = P.initialState(lv);
+  for (const [hearts, expected] of [[1, 2], [3, 3]]) {
+    const r = P.stepState(lv, { ...start, hearts }, 'R'); assert.equal(r.state.hearts, expected); assert.equal(r.events.pickup, 'heal');
+  }
+  const armed = { ...start, shield: 1, guards: [{ ...start.guards[0], x: 3, mode: 'windup', aim: { x: 2, y: 2 } }] };
+  const r = P.stepState(lv, armed, 'W'); assert.equal(r.events.shielded, true); assert.equal(r.state.hearts, 3); assert.equal(r.state.shield, 0);
+  assert.deepEqual([r.state.guards[0].x, r.state.guards[0].y, r.state.guards[0].cd], [3, 2, P.GUARD_STUN]);
+});
+
+test('A* combat sama optimum BFS exhaustive pada ruang kecil, solusi dapat diputar ulang', () => {
+  const lv = build({ map: ['#######', '#....E#', '#.....#', '#######'], snake: [[1, 1]], guards: [{ x: 3, y: 1, dir: 'L' }] });
+  const sol = P.solve(lv, 50000); assert.ok(sol);
+  let frontier = [P.initialState(lv)], shortest = null;
+  const seen = new Set();
+  for (let depth = 1; depth <= sol.length; depth++) {
+    const next = [];
+    for (const st of frontier) for (const k of ['U', 'D', 'L', 'R', 'W']) {
+      const r = P.stepState(lv, st, k); if (!r.moved || r.state.status === 'lost') continue;
+      if (r.state.status === 'won') { shortest = depth; break; }
+      const id = JSON.stringify({ ...r.state, steps: r.state.steps % 2, hurtUntil: Math.max(0, r.state.hurtUntil - r.state.steps) });
+      if (!seen.has(id)) { seen.add(id); next.push(r.state); }
+    }
+    if (shortest !== null) break; frontier = next;
+  }
+  assert.equal(sol.length, shortest);
+  let st = P.initialState(lv); for (const k of sol) st = P.stepState(lv, st, k).state;
+  assert.equal(st.status, 'won');
+});
+
+test('kampanye 35–42 tepat satu musuh, 43–50 tepat dua, tuas permanen dan dua jenis musuh terpakai', () => {
+  for (const [i, lv] of campaign.CAMPAIGN_LEVELS.entries()) {
+    const n = i + 1;
+    assert.equal(lv.guards.length, n < 35 ? 0 : n < 43 ? 1 : 2, `ruang ${n}`);
+    assert.ok(lv.gates.every(g => g.open === 'lever'), `ruang ${n}: tidak ada paritas gerbang`);
+    if (n >= 43) assert.deepEqual(new Set(lv.guards.map(g => g.kind)), new Set(['slime', 'warden']));
+  }
+});
```

## Aset biner

Dua ukuran per scene (desktop dan `-m` untuk HP); seluruh berkas ada dalam `public/assets/game/`.

- `public/assets/game/bg-boss-m.webp`
- `public/assets/game/bg-boss.webp`
- `public/assets/game/bg-classic-m.webp`
- `public/assets/game/bg-classic.webp`
- `public/assets/game/bg-classicnight-m.webp`
- `public/assets/game/bg-classicnight.webp`
- `public/assets/game/bg-delivery-m.webp`
- `public/assets/game/bg-delivery.webp`
- `public/assets/game/bg-impossible-m.webp`
- `public/assets/game/bg-impossible.webp`
- `public/assets/game/bg-mayhem-m.webp`
- `public/assets/game/bg-mayhem.webp`
- `public/assets/game/bg-mayhemduo-m.webp`
- `public/assets/game/bg-mayhemduo.webp`
- `public/assets/game/bg-mayhemhard-m.webp`
- `public/assets/game/bg-mayhemhard.webp`
- `public/assets/game/bg-mayhemplus-m.webp`
- `public/assets/game/bg-mayhemplus.webp`
- `public/assets/game/bg-multiplayer-m.webp`
- `public/assets/game/bg-multiplayer.webp`
- `public/assets/game/bg-portal-m.webp`
- `public/assets/game/bg-portal.webp`
- `public/assets/game/bg-puzzle-m.webp`
- `public/assets/game/bg-puzzle.webp`
- `public/assets/game/bg-roguelite-m.webp`
- `public/assets/game/bg-roguelite.webp`
- `public/assets/game/bg-territory-m.webp`
- `public/assets/game/bg-territory.webp`
- `public/assets/game/bg-timeattack-m.webp`
- `public/assets/game/bg-timeattack.webp`
