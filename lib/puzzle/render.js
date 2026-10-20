// Render Canvas 2D untuk Puzzle. Hanya menggambar dari (level, state); tidak mengubah apa pun.
// Status objek terbaca TANPA warna: bentuk, pola garis, huruf plate (A/B/C), angka + jumlah cincin portal, gembok vs panah di pintu.
import { exitStatus, activePlates, visionCells, gateOpen } from './sim';
import { animatedPoints, easeOutCubic } from '../sim/anim';

const C = {
  bg: '#eee7d5', floorA: '#dad5bf', floorB: '#e3dec9', wall: '#67716a', wallHatch: '#90978a',
  food: '#e0453a', leaf: '#6fbf3a', key: '#9d6a13', plateLine: '#3f5961', plateOn: '#6ed3ff', portal: '#c58bff',
  doorLocked: '#6b3f2a', doorOpen: '#e7d38a', ink: '#0e1316', snakeOut: '#304831', snakeIn: '#7cc22d', eye: '#ffffff',
  spike: '#d9dfe3', crack: '#8a7f73', gate: '#b07a3a', bush: '#2f8f4a', bushDark: '#1d6b35', hammer: '#c9a36a', shield: '#6ed3ff', guard: '#e0873a', guardAlert: '#ff5a4a',
};

export function layout(W, H, level) {
  const cell = Math.floor(Math.min((W - 24) / level.w, (H - 24) / level.h));
  return { cell, ox: Math.floor((W - cell * level.w) / 2), oy: Math.floor((H - cell * level.h) / 2) };
}

// view (opsional): { anim: { from, p }, fx: [{ kind, x, y, p }] } — hanya untuk gambar, tidak memengaruhi simulasi.
export function drawPuzzle(ctx, W, H, session, view) {
  view = view || {};
  const { level, state } = session;
  const { cell, ox, oy } = layout(W, H, level);
  const px = x => ox + x * cell, py = y => oy + y * cell;
  const cxm = x => px(x) + cell / 2, cym = y => py(y) + cell / 2;

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) { ctx.fillStyle = (x + y) % 2 ? C.floorA : C.floorB; ctx.fillRect(px(x), py(y), cell, cell); }
  level.walls.forEach(w => {
    ctx.fillStyle = C.wall; ctx.strokeStyle = '#46534b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px(w.x) + 1, py(w.y) + 1, cell - 2, cell - 2, cell * 0.16); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.wallHatch; ctx.beginPath(); ctx.moveTo(px(w.x) + cell * 0.2, py(w.y) + cell * 0.23); ctx.lineTo(px(w.x) + cell * 0.75, py(w.y) + cell * 0.23); ctx.stroke();
  });

  // plate: kosong = garis putus-putus, digambar DI BAWAH ular. Plate yang tertahan digambar DI ATAS ular
  // (lihat drawActivePlates di bawah) supaya status aktif tetap terbaca saat tertutup tubuh.
  const act = new Set(activePlates(level, state));
  const plateBox = (p) => { const m = cell * 0.14; return [px(p.x) + m, py(p.y) + m, cell - 2 * m, cell - 2 * m]; };
  level.plates.filter(p => !act.has(p.id)).forEach(p => {
    ctx.lineWidth = 3; ctx.strokeStyle = C.plateLine; ctx.setLineDash([5, 4]);
    ctx.strokeRect(...plateBox(p));
    ctx.setLineDash([]);
    ctx.fillStyle = C.plateLine; ctx.font = `bold ${Math.round(cell * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.id.toUpperCase(), cxm(p.x), cym(p.y));
  });

  // Rute yang direncanakan terbaca sebagai jejak kecil; area pandang tetap lebih dominan.
  level.guards.forEach((g, i) => {
    if (state.guards[i]?.hp === 0) return;
    ctx.fillStyle = 'rgba(105,74,39,.45)';
    (g.patrol || []).forEach(p => { ctx.beginPath(); ctx.arc(cxm(p.x), cym(p.y), Math.max(1.6, cell * 0.045), 0, Math.PI * 2); ctx.fill(); });
  });

  // area pandang penjaga (di bawah semua objek): garis miring + bingkai; putus-putus = waspada diam, solid = mengejar
  const stepNext = state.steps + 1;
  (state.guards || []).forEach(g => {
    if (g.cd > 0 || g.hp === 0) return;
    const chasing = g.mode === 'chase' || g.mode === 'alert';
    visionCells(level, state, g, stepNext).forEach(c => {
      ctx.fillStyle = chasing ? 'rgba(255,90,74,.22)' : 'rgba(224,135,58,.18)'; ctx.fillRect(px(c.x), py(c.y), cell, cell);
      ctx.strokeStyle = chasing ? C.guardAlert : C.guard; ctx.lineWidth = 1.5; ctx.setLineDash(chasing ? [] : [4, 4]);
      ctx.strokeRect(px(c.x) + 1.5, py(c.y) + 1.5, cell - 3, cell - 3); ctx.setLineDash([]);
    });
  });

  // rintangan: duri (segitiga), tembok retak (blok retak), jeruji dan tuas bernomor sama. Bentuk + label, bukan hanya warna.
  const gone = new Set(state.cleared || []);
  level.spikes.filter(p => !gone.has(p.x + ',' + p.y)).forEach(p => {
    ctx.fillStyle = C.spike; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const bx = px(p.x) + cell * (0.08 + i * 0.3); ctx.beginPath(); ctx.moveTo(bx, py(p.y) + cell * 0.86); ctx.lineTo(bx + cell * 0.15, py(p.y) + cell * 0.2); ctx.lineTo(bx + cell * 0.3, py(p.y) + cell * 0.86); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  });
  level.cracks.filter(p => !gone.has(p.x + ',' + p.y)).forEach(p => {
    // Batu krem, siluet terpisah dari tembok hijau, retak gelap yang tebal.
    ctx.fillStyle = '#dfc49a'; ctx.strokeStyle = '#654e35'; ctx.lineWidth = Math.max(2, cell * 0.065);
    ctx.beginPath(); ctx.roundRect(px(p.x) + cell * 0.08, py(p.y) + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.19); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff0cc'; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.24); ctx.lineTo(px(p.x) + cell * 0.7, py(p.y) + cell * 0.2); ctx.stroke();
    ctx.strokeStyle = '#654e35'; ctx.lineWidth = Math.max(2.5, cell * 0.08); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.52, py(p.y) + cell * 0.12); ctx.lineTo(px(p.x) + cell * 0.36, py(p.y) + cell * 0.43); ctx.lineTo(px(p.x) + cell * 0.6, py(p.y) + cell * 0.57); ctx.lineTo(px(p.x) + cell * 0.42, py(p.y) + cell * 0.87); ctx.stroke();
    // Pecahan kecil di kaki batu membedakan dari blok yang tidak bisa dihancurkan.
    ctx.fillStyle = '#fff0cc'; ctx.fillRect(px(p.x) + cell * 0.72, py(p.y) + cell * 0.7, cell * 0.13, cell * 0.13);
  });
  level.gates.forEach((p, i) => {
    const open = gateOpen(p, stepNext, state), x = px(p.x), y = py(p.y);
    ctx.fillStyle = open ? '#e7dfbf' : '#a7a89a';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.strokeStyle = '#49564f'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineCap = 'round';
    // Jeruji terangkat ke ambang atas saat terbuka, tanpa panah arah palsu.
    for (const xx of [0.23, 0.41, 0.59, 0.77]) {
      ctx.beginPath(); ctx.moveTo(x + cell * xx, y + cell * 0.12); ctx.lineTo(x + cell * xx, y + cell * (open ? 0.3 : 0.88)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x + cell * 0.12, y + cell * 0.2); ctx.lineTo(x + cell * 0.88, y + cell * 0.2); ctx.stroke();
    ctx.fillStyle = '#fff9e6'; ctx.font = `bold ${Math.round(cell * 0.26)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(i + 1), cxm(p.x), y + cell * 0.22); ctx.fillText(String(i + 1), cxm(p.x), y + cell * 0.22);
    if (open) { ctx.strokeStyle = '#537247'; ctx.beginPath(); ctx.moveTo(x + cell * 0.34, y + cell * 0.68); ctx.lineTo(x + cell * 0.46, y + cell * 0.79); ctx.lineTo(x + cell * 0.7, y + cell * 0.49); ctx.stroke(); }
  });
  (level.levers || []).forEach(p => {
    const link = (level.links || []).find(l => l.lever[0] === p.x && l.lever[1] === p.y);
    const i = link ? level.gates.findIndex(g => g.x === link.gate[0] && g.y === link.gate[1]) : -1;
    const active = i >= 0 && gateOpen(level.gates[i], stepNext, state);
    ctx.fillStyle = '#839077'; ctx.strokeStyle = '#435244'; ctx.lineWidth = Math.max(2, cell * 0.055);
    ctx.beginPath(); ctx.ellipse(cxm(p.x), py(p.y) + cell * 0.75, cell * 0.31, cell * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const hx = px(p.x) + cell * (active ? 0.72 : 0.3), hy = py(p.y) + cell * 0.32;
    ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.7); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = active ? '#75ad58' : '#d8914a'; ctx.beginPath(); ctx.arc(hx, hy, cell * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbed'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), hx, hy);
  });
  // semak (tempat bersembunyi) dan pickup Palu (P) / Perisai (S)
  const bushAt = (p) => {
    ctx.fillStyle = C.bush; ctx.strokeStyle = C.bushDark; ctx.lineWidth = 2;
    [[0.3, 0.55], [0.7, 0.55], [0.5, 0.32], [0.5, 0.68]].forEach(([ax, ay]) => { ctx.beginPath(); ctx.arc(px(p.x) + cell * ax, py(p.y) + cell * ay, cell * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  };
  level.bushes.forEach(bushAt);
  state.pickups.forEach(p => {
    ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
    if (p.kind === 'hammer') { ctx.fillStyle = C.hammer; ctx.fillRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.strokeRect(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2, cell * 0.6, cell * 0.24); ctx.fillStyle = '#e9e1d2'; ctx.fillRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); ctx.strokeRect(px(p.x) + cell * 0.44, py(p.y) + cell * 0.44, cell * 0.12, cell * 0.38); }
    else if (p.kind === 'heal') {
      ctx.fillStyle = '#d96666'; ctx.beginPath(); ctx.moveTo(cxm(p.x), py(p.y) + cell * 0.82); ctx.bezierCurveTo(px(p.x) - cell * 0.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) - cell * 0.05, cxm(p.x), py(p.y) + cell * 0.35); ctx.bezierCurveTo(cxm(p.x), py(p.y) - cell * 0.05, px(p.x) + cell * 1.1, py(p.y) + cell * 0.4, cxm(p.x), py(p.y) + cell * 0.82); ctx.fill(); ctx.stroke();
    }
    else { ctx.fillStyle = C.shield; ctx.beginPath(); ctx.moveTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.2); ctx.lineTo(px(p.x) + cell * 0.8, py(p.y) + cell * 0.55); ctx.lineTo(cxm(p.x), py(p.y) + cell * 0.86); ctx.lineTo(px(p.x) + cell * 0.2, py(p.y) + cell * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.3)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'hammer' ? 'P' : p.kind === 'heal' ? '+' : 'S', cxm(p.x), cym(p.y) + (p.kind === 'hammer' ? -cell * 0.02 : -cell * 0.04));
  });

  // portal: angka + jumlah cincin = nomor pasangan
  level.portals.forEach(p => {
    [p.a, p.b].forEach(e => {
      const n = Number(p.id);
      ctx.strokeStyle = C.portal; ctx.lineWidth = 2.5;
      for (let r = 1; r <= n; r++) { ctx.beginPath(); ctx.arc(cxm(e.x), cym(e.y), cell * (0.16 + 0.1 * r), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(cell * 0.34)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.id, cxm(e.x), cym(e.y));
    });
  });

  // pintu keluar: gembok = syarat belum terpenuhi, panah = terpenuhi (saat ini)
  const ex = level.exit, st = exitStatus(level, state);
  const open = st.keysHave >= st.keysNeed && st.platesActive === st.platesNeed;
  ctx.fillStyle = open ? C.doorOpen : C.doorLocked; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  const dx = px(ex.x) + cell * 0.14, dy = py(ex.y) + cell * 0.08, dw = cell * 0.72, dh = cell * 0.84;
  ctx.fillRect(dx, dy, dw, dh); ctx.strokeRect(dx, dy, dw, dh);
  ctx.strokeStyle = open ? C.ink : '#fff'; ctx.lineWidth = 3; ctx.fillStyle = open ? C.ink : '#fff';
  if (open) { ctx.beginPath(); ctx.moveTo(cxm(ex.x) - cell * 0.12, cym(ex.y) - cell * 0.2); ctx.lineTo(cxm(ex.x) + cell * 0.14, cym(ex.y)); ctx.lineTo(cxm(ex.x) - cell * 0.12, cym(ex.y) + cell * 0.2); ctx.stroke(); }
  else { ctx.fillRect(cxm(ex.x) - cell * 0.15, cym(ex.y) - cell * 0.02, cell * 0.3, cell * 0.22); ctx.beginPath(); ctx.arc(cxm(ex.x), cym(ex.y) - cell * 0.02, cell * 0.1, Math.PI, 0); ctx.stroke(); }

  state.keys.forEach(k => {
    ctx.strokeStyle = C.key; ctx.fillStyle = C.key; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cxm(k.x) - cell * 0.14, cym(k.y), cell * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cxm(k.x) - cell * 0.02, cym(k.y)); ctx.lineTo(cxm(k.x) + cell * 0.26, cym(k.y)); ctx.moveTo(cxm(k.x) + cell * 0.18, cym(k.y)); ctx.lineTo(cxm(k.x) + cell * 0.18, cym(k.y) + cell * 0.12); ctx.moveTo(cxm(k.x) + cell * 0.26, cym(k.y)); ctx.lineTo(cxm(k.x) + cell * 0.26, cym(k.y) + cell * 0.1); ctx.stroke();
  });

  state.foods.forEach(f => {
    ctx.fillStyle = '#f5ce63'; ctx.strokeStyle = '#96712f'; ctx.lineWidth = Math.max(1.5, cell * 0.045);
    ctx.beginPath(); ctx.arc(cxm(f.x), cym(f.y), cell * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(cxm(f.x), cym(f.y)); ctx.scale(0.67, 0.67); ctx.translate(-cxm(f.x), -cym(f.y));
    ctx.fillStyle = C.food; ctx.beginPath(); ctx.arc(cxm(f.x), cym(f.y) + cell * 0.03, cell * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.ellipse(cxm(f.x) + cell * 0.1, cym(f.y) - cell * 0.27, cell * 0.12, cell * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(cxm(f.x) - cell * 0.1, cym(f.y) - cell * 0.06, cell * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // Musuh dungeon: slime lunak (1 HP) dan penjaga batu berhelm (2 HP).
  // Siluet dan titik HP membedakan jenis, tidak hanya warnanya.
  (state.guards || []).forEach((g, i) => {
    if (g.hp === 0) return;
    const old = view.anim && view.anim.guards && view.anim.guards[i];
    const p = view.anim ? easeOutCubic(view.anim.p) : 1;
    const walk = old && Math.abs(old.x - g.x) + Math.abs(old.y - g.y) === 1;
    const gx = walk ? old.x + (g.x - old.x) * p : g.x, gy = walk ? old.y + (g.y - old.y) * p : g.y;
    const stun = g.cd > 0, danger = g.mode === 'windup', slime = g.kind === 'slime';
    if (danger && g.aim && !stun) {
      ctx.fillStyle = 'rgba(196,61,48,.3)'; ctx.fillRect(px(g.aim.x) + 2, py(g.aim.y) + 2, cell - 4, cell - 4);
      ctx.strokeStyle = '#b74737'; ctx.lineWidth = 2.5; ctx.strokeRect(px(g.aim.x) + 3, py(g.aim.y) + 3, cell - 6, cell - 6);
      ctx.fillStyle = '#9b3028'; ctx.font = `bold ${Math.round(cell * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', cxm(g.aim.x), cym(g.aim.y));
    }
    ctx.save(); ctx.translate(cxm(gx), cym(gy));
    const squash = walk ? Math.sin(p * Math.PI) * 0.08 : 0;
    ctx.fillStyle = 'rgba(50,62,49,.2)'; ctx.beginPath(); ctx.ellipse(0, cell * 0.33, cell * 0.35, cell * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(1 + squash, 1 - squash);
    ctx.strokeStyle = '#3b4943'; ctx.lineWidth = Math.max(2, cell * 0.055); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (slime) {
      ctx.fillStyle = stun ? '#a4afa6' : '#82b5b1';
      ctx.beginPath(); ctx.moveTo(-cell * 0.36, cell * 0.27); ctx.bezierCurveTo(-cell * 0.4, -cell * 0.3, -cell * 0.14, -cell * 0.47, cell * 0.08, -cell * 0.32); ctx.bezierCurveTo(cell * 0.31, -cell * 0.23, cell * 0.38, cell * 0.04, cell * 0.36, cell * 0.27); ctx.quadraticCurveTo(cell * 0.22, cell * 0.38, cell * 0.05, cell * 0.29); ctx.quadraticCurveTo(-cell * 0.17, cell * 0.42, -cell * 0.36, cell * 0.27); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#606e6b';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * cell * 0.21 - cell * 0.11, cell * 0.13, cell * 0.22, cell * 0.2, cell * 0.06); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = stun ? '#a3a79a' : '#87968b'; ctx.beginPath(); ctx.roundRect(-cell * 0.34, -cell * 0.3, cell * 0.68, cell * 0.57, cell * 0.13); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bec4ab'; ctx.beginPath(); ctx.moveTo(-cell * 0.37, -cell * 0.1); ctx.lineTo(-cell * 0.28, -cell * 0.36); ctx.lineTo(cell * 0.22, -cell * 0.36); ctx.lineTo(cell * 0.37, -cell * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fff8df'; ctx.beginPath(); ctx.ellipse(side * cell * 0.13, -cell * 0.025, cell * 0.09, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#34463f'; ctx.beginPath(); ctx.arc(side * cell * 0.13 + g.dir.x * cell * 0.025, -cell * 0.025 + g.dir.y * cell * 0.025, cell * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(side * cell * 0.06, -cell * 0.14); ctx.lineTo(side * cell * 0.23, -cell * (danger ? 0.24 : 0.18)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-cell * 0.06, cell * 0.14); ctx.lineTo(cell * 0.06, cell * 0.14); ctx.stroke();
    const maxHp = slime ? 1 : 2;
    for (let h = 0; h < maxHp; h++) { ctx.fillStyle = h < g.hp ? '#b94d43' : '#e3d8c4'; ctx.beginPath(); ctx.arc((h - (maxHp - 1) / 2) * cell * 0.15, cell * 0.43, cell * 0.05, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const tag = stun ? 'zZ' : danger ? '!' : g.mode === 'alert' ? '?' : g.mode === 'recover' ? '···' : '';
    if (tag) { ctx.fillStyle = '#fffdf1'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.font = `bold ${Math.round(cell * 0.36)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(tag, cxm(gx), py(gy) - cell * 0.01); ctx.fillText(tag, cxm(gx), py(gy) - cell * 0.01); }
  });

  // Maskot satu petak: tubuh melingkar, kepala besar; hitbox sama dengan gambar.
  const progress = view.anim ? view.anim.p : 1;
  const cells = view.anim ? animatedPoints(state.snake, view.anim.from, progress * progress * (3 - 2 * progress)) : state.snake;
  const hd = { x: cxm(cells[0].x), y: cym(cells[0].y) };
  const hop = view.anim ? Math.sin(Math.PI * progress) : 0;
  ctx.fillStyle = 'rgba(48,72,49,.18)'; ctx.beginPath(); ctx.ellipse(hd.x, hd.y + cell * 0.3, cell * 0.35, cell * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(hd.x, hd.y); ctx.scale(1 - hop * 0.04, 1 + hop * 0.05);
  ctx.strokeStyle = C.snakeOut; ctx.fillStyle = C.snakeIn; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, cell * 0.16, cell * 0.34, cell * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#50852a'; ctx.lineWidth = Math.max(1.5, cell * 0.04); ctx.beginPath(); ctx.ellipse(-cell * 0.05, cell * 0.17, cell * 0.18, cell * 0.07, 0, 0, Math.PI * 1.7); ctx.stroke();
  ctx.fillStyle = (view.fx || []).some(f => f.kind === 'hurt' && f.p < 0.6) ? '#e7a66b' : '#8dc83c'; ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(2, cell * 0.06);
  ctx.beginPath(); ctx.ellipse(cell * 0.04, -cell * 0.11, cell * 0.31, cell * 0.28, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Wajah menghadap pemain; mata melirik mengikuti arah gerak.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff9df'; ctx.beginPath(); ctx.ellipse(cell * (0.04 + side * 0.13), -cell * 0.16, cell * 0.105, cell * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.snakeOut; ctx.beginPath(); ctx.arc(cell * (0.04 + side * 0.13 + state.dir.x * 0.025), cell * (-0.15 + state.dir.y * 0.025), cell * 0.046, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = C.snakeOut; ctx.lineWidth = Math.max(1, cell * 0.035); ctx.beginPath(); ctx.arc(cell * 0.04, -cell * 0.07, cell * 0.09, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();

  // Tanda serangan tetap di atas maskot, sehingga tidak tertutup kepalanya.
  (state.guards || []).filter(g => g.hp !== 0 && g.cd === 0 && g.mode === 'windup' && g.aim).forEach(g => {
    const x = px(g.aim.x) + cell * 0.83, y = py(g.aim.y) + cell * 0.17;
    ctx.fillStyle = '#b74737'; ctx.strokeStyle = '#fff7dc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, cell * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff7dc'; ctx.font = `bold ${Math.round(cell * 0.25)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y);
  });

  // kepala di semak = tersembunyi: semak digambar lagi di atas kepala (setengah transparan) + label
  const hb = level.bushes.find(b => b.x === state.snake[0].x && b.y === state.snake[0].y);
  if (hb) {
    ctx.globalAlpha = 0.78; bushAt(hb); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.font = `bold ${Math.round(cell * 0.26)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('SEMBUNYI', cxm(hb.x), py(hb.y) - cell * 0.08); ctx.fillText('SEMBUNYI', cxm(hb.x), py(hb.y) - cell * 0.08);
  }

  // efek singkat: pop saat makan/kunci, riak saat lewat portal
  (view.fx || []).forEach(f => {
    const a = 1 - f.p, r = cell * (0.25 + 0.55 * f.p);
    ctx.lineWidth = 3; ctx.strokeStyle = f.kind === 'warp' ? `rgba(197,139,255,${a})` : f.kind === 'key' ? `rgba(245,197,66,${a})` : `rgba(224,69,58,${a})`;
    ctx.beginPath(); ctx.arc(cxm(f.x), cym(f.y), r, 0, Math.PI * 2); ctx.stroke();
    if (f.kind === 'hit') { ctx.globalAlpha = a; ctx.strokeStyle = '#fff8cf'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cxm(f.x) - r * 0.5, cym(f.y) + r * 0.5); ctx.lineTo(cxm(f.x) + r * 0.5, cym(f.y) - r * 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
    if (f.kind === 'pop') { ctx.globalAlpha = a; ctx.font = `bold ${Math.round(cell * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#6b4c13'; ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 3; ctx.strokeText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.fillText('+1', cxm(f.x), cym(f.y) - cell * (0.5 + f.p * 0.6)); ctx.globalAlpha = 1; }
  });

  // plate aktif: bingkai solid + lencana gelap berisi huruf dan centang, di atas tubuh ular
  level.plates.filter(p => act.has(p.id)).forEach(p => {
    const [bx, by, bw, bh] = plateBox(p);
    ctx.lineWidth = 3.5; ctx.strokeStyle = C.plateOn; ctx.strokeRect(bx, by, bw, bh);
    const chip = cell * 0.5, cx0 = cxm(p.x) - chip / 2, cy0 = cym(p.y) - chip / 2;
    ctx.fillStyle = 'rgba(8,16,22,.88)'; ctx.fillRect(cx0, cy0, chip, chip);
    ctx.strokeStyle = C.plateOn; ctx.lineWidth = 2; ctx.strokeRect(cx0, cy0, chip, chip);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(cell * 0.28)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.id.toUpperCase(), cxm(p.x) - chip * 0.2, cym(p.y));
    // centang digambar sebagai path (bukan glyph font, yang tidak terjamin ada di semua perangkat)
    ctx.strokeStyle = C.plateOn; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cxm(p.x) + chip * 0.02, cym(p.y) + chip * 0.02); ctx.lineTo(cxm(p.x) + chip * 0.1, cym(p.y) + chip * 0.12); ctx.lineTo(cxm(p.x) + chip * 0.25, cym(p.y) - chip * 0.12); ctx.stroke();
  });
}
