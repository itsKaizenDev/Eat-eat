// Render Canvas 2D Delivery. Warna paket SELALU didampingi huruf (A/B/C) dan bentuk (apel = bulat, surat = amplop, kotak = persegi bertali).
import { TYPES, pickups, lifeLeft } from './sim';
import { animatedPoints } from '../sim/anim';
import { traceSmooth } from '../render/snakePath';
import { barrierState, trafficState } from './city';
import { PACKAGE_KINDS } from './missions';
import { drawFace } from '../render/face';
import { drawFarmBackground, addressBadge, farmParcel } from './farmRender';
import { drawFarmSprite, FARM_SITES } from './farmAssets';
export { releaseFarmRenderer as disposeDeliveryRenderer } from './farmRender';

const COL = { A: '#e0453a', B: '#4aa3ff', C: '#f2b84b' };
const C = { tileA: '#d8d8b9', tileB: '#e2dfc4', build: '#8a5a48', buildTop: '#5d3b30', win: '#ffd98a', snakeOut: '#304831', snakeIn: '#7fcf34', ink: '#0e1316', white: '#ffffff' };

export function drawParcel(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.lineWidth = Math.max(2, s * 0.08); ctx.strokeStyle = C.ink; ctx.fillStyle = COL[type];
  if (type === 'A') { // apel: bulat + daun
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.04, s * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6fbf3a'; ctx.beginPath(); ctx.ellipse(cx + s * 0.12, cy - s * 0.38, s * 0.14, s * 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'B') { // surat: amplop dengan lipatan V
    ctx.fillRect(cx - s * 0.46, cy - s * 0.32, s * 0.92, s * 0.64); ctx.strokeRect(cx - s * 0.46, cy - s * 0.32, s * 0.92, s * 0.64);
    ctx.beginPath(); ctx.moveTo(cx - s * 0.46, cy - s * 0.32); ctx.lineTo(cx, cy + s * 0.08); ctx.lineTo(cx + s * 0.46, cy - s * 0.32); ctx.stroke();
  } else { // kotak: persegi dengan tali silang
    ctx.fillRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84); ctx.strokeRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84);
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.42); ctx.lineTo(cx, cy + s * 0.42); ctx.moveTo(cx - s * 0.42, cy); ctx.lineTo(cx + s * 0.42, cy); ctx.stroke();
  }
  ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.font = `bold ${Math.round(s * 0.42)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(type, cx, cy + s * 0.04); ctx.fillText(type, cx, cy + s * 0.04);
  ctx.restore();
}

// view: { prog (0..1), from (snake sebelum langkah), t (ms, hanya untuk denyut visual) }
export function drawDelivery(ctx, W, H, s, view) {
  view = view || {};
  if (s.cfg.mayhem) return drawFarm(ctx,W,H,s,view);
  const { arena } = s;
  const cell = Math.floor(Math.min(W / arena.w, H / arena.h));
  const ox = Math.floor((W - cell * arena.w) / 2), oy = Math.floor((H - cell * arena.h) / 2);
  const cx = x => ox + x * cell + cell / 2, cy = y => oy + y * cell + cell / 2;
  const tv = view.t || 0;

  ctx.fillStyle = '#242d34'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) { ctx.fillStyle = (x + y) % 2 ? C.tileA : C.tileB; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }

  // rintangan = gedung
  for (let y = 0; y < arena.h; y++) for (let x = 0; x < arena.w; x++) {
    if (!arena.obstacle[y * arena.w + x]) continue;
    const px = ox + x * cell, py = oy + y * cell;
    ctx.fillStyle = C.build; ctx.fillRect(px, py, cell, cell);
    ctx.fillStyle = C.buildTop; ctx.fillRect(px, py, cell, cell * 0.22);
    ctx.fillStyle = C.win; ctx.fillRect(px + cell * 0.22, py + cell * 0.45, cell * 0.2, cell * 0.2); ctx.fillRect(px + cell * 0.58, py + cell * 0.45, cell * 0.2, cell * 0.2);
  }

  // tujuan (rumah) per tipe: bingkai warna + ikon paket + pita label "ANTAR" di bawah (tidak menimpa ikon)
  Object.keys(arena.sites).forEach(k => {
    const p = arena.sites[k], px = ox + p.x * cell, py = oy + p.y * cell;
    ctx.fillStyle = '#1b2329'; ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
    drawParcel(ctx, k, cx(p.x), py + cell * 0.4, cell * 0.56);
    ctx.fillStyle = COL[k]; ctx.fillRect(px + 3, py + cell * 0.72, cell - 6, cell * 0.25);
    ctx.fillStyle = C.ink; ctx.font = `bold ${Math.round(cell * 0.19)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ANTAR', cx(p.x), py + cell * 0.845);
    ctx.lineWidth = 3; ctx.strokeStyle = COL[k]; ctx.strokeRect(px + 3, py + 3, cell - 6, cell - 6);
  });

  // titik pickup: paket bergoyang + cincin denyut
  pickups(s).forEach(o => {
    const bob = Math.sin(tv / 280 + o.id) * cell * 0.05;
    ctx.strokeStyle = COL[o.type]; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx(o.pickup.x), cy(o.pickup.y), cell * (0.44 + 0.04 * Math.sin(tv / 220 + o.id)), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    drawParcel(ctx, o.type, cx(o.pickup.x), cy(o.pickup.y) + bob, cell * 0.66);
  });

  // ular: tubuh dasar hijau + segmen kargo di ekor (huruf + bentuk + warna), meluncur halus antar langkah
  const cells = view.from ? animatedPoints(s.snake, view.from, (view.prog == null ? 1 : view.prog)) : s.snake;
  const pts = cells.map(p => ({ x: cx(p.x), y: cy(p.y) }));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.snakeOut; ctx.lineWidth = cell * 0.74; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  ctx.strokeStyle = C.snakeIn; ctx.lineWidth = cell * 0.5; traceSmooth(ctx, pts, cell * 1.5); ctx.stroke();
  s.cargo.forEach((c, j) => {
    const p = pts[s.baseLen + j]; if (!p) return;
    const left = lifeLeft(c, s.t);
    if (left < 3000 && Math.floor(tv / 160) % 2 === 0) { ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, cell * 0.46, 0, Math.PI * 2); ctx.stroke(); }
    drawParcel(ctx, c.type, p.x, p.y, cell * 0.6);
  });
  const hd = pts[0], d = s.dir, off = cell * 0.15, r = cell * 0.09;
  drawFace(ctx, hd, d, cell);
}

// Presentation only: camera transforms never alter collision coordinates.
function drawFarm(ctx,W,H,s,view) {
 const {arena}=s,cw=view.cssWidth||W,ch=view.cssHeight||H,ratio=W/cw,land=cw>ch&&ch<550;
 const top=(land?16:200)*ratio,bottom=(land?88:148)*ratio,left=(land?208:8)*ratio,right=8*ratio;
 const aw=Math.max(1,W-left-right),ah=Math.max(1,H-top-bottom),overview=view.overview;
 const cell=overview?Math.min(aw/arena.w,ah/arena.h):Math.min(48,Math.max(36,cw/25))*ratio;
 const cells=view.from?animatedPoints(s.snake,view.from,view.prog??1):s.snake,head=cells[0];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const offset=(size,available,start,at)=>size<=available?start+(available-size)/2:clamp(start+available/2-at,start+available-size,start);
 const ox=offset(cell*arena.w,aw,left,(head.x+.5)*cell),oy=offset(cell*arena.h,ah,top,(head.y+.5)*cell);
 const cx=x=>ox+(x+.5)*cell,cy=y=>oy+(y+.5)*cell;
 const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,tv=reduce?0:view.t||0;
 const bank=drawFarmBackground(ctx,W,H,arena,ox,oy,cell);
 const text=(label,x,y,size,color='#fff9d9')=>{ctx.font=`800 ${Math.max(6*ratio,size)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(label,x,y);};
 const f=arena.features;
 for(const b of f.bumps){ctx.fillStyle='#98714d';ctx.fillRect(cx(b.x)-cell*.43,cy(b.y)-cell*.3,cell*.86,cell*.6);text('≈',cx(b.x),cy(b.y),cell*.5,'#ffe2ad');}
 for(const lane of f.lanes)text(lane.dx>0?'→':'←',cx(lane.x),cy(lane.y),cell*.65,'#846139');
 for(const b of [...f.gates,...f.blocks]){
  const held=s.snake.some(p=>p.x===b.x&&p.y===b.y),state=held?'open':barrierState(b,s.t);
  ctx.fillStyle=state==='closed'?'#db715440':state==='warning'?'#edc85890':'#4b9a7a20';ctx.fillRect(cx(b.x)-cell*.45,cy(b.y)-cell*.4,cell*.9,cell*.8);const drawn=drawFarmSprite(ctx,bank,state==='closed'?'gateClosed':'gateOpen',cx(b.x)-cell*.46,cy(b.y)-cell*.43,cell*.92,cell*.86);if(!drawn)text(state==='closed'?'STOP':'↔',cx(b.x),cy(b.y),cell*.28,'#523a24');if(state==='warning')text('!',cx(b.x),cy(b.y)-cell*.2,cell*.5,'#522d14');
 }
 for(const car of f.traffic){const phase=trafficState(car,s.t);if(phase.warning){ctx.fillStyle='#f1ba4766';for(const q of car.route)ctx.fillRect(cx(q.x)-cell/2,cy(q.y)-cell/2,cell,cell);text('! GEROBAK',cx(car.route[1].x),cy(car.route[1].y),cell*.27);}
  if(phase.active){const q=phase.cell;if(!drawFarmSprite(ctx,bank,'cart',cx(q.x)-cell*.48,cy(q.y)-cell*.4,cell*.96,cell*.8,car.route.at(-1).x<car.route[0].x)){ctx.fillStyle='#956638';ctx.fillRect(cx(q.x)-cell*.43,cy(q.y)-cell*.3,cell*.86,cell*.6);}}}
 for(const [type,q] of Object.entries(arena.sites)){
  const x=cx(q.x),y=cy(q.y);ctx.fillStyle='#fff4d9';ctx.beginPath();ctx.arc(x,y,cell*.46,0,Math.PI*2);ctx.fill();addressBadge(ctx,type,x,y-cell*.06,cell*.58);if(!overview)text(FARM_SITES[type].toUpperCase(),x,y+cell*.34,cell*.18,'#493924');
 }
 for(const o of pickups(s)){
  const x=cx(o.pickup.x),y=cy(o.pickup.y),bob=reduce?0:Math.sin(tv/280+o.id)*cell*.035;
  ctx.fillStyle='#f4efce';ctx.beginPath();ctx.arc(x,y,cell*.46,0,Math.PI*2);ctx.fill();
  farmParcel(ctx,bank,o.kind,o.type,x,y+bob-cell*.05,cell*.73);text(PACKAGE_KINDS[o.kind]?.short||'REG',x,y+cell*.33,cell*.19,'#233e30');
 }
 const points=cells.map(p=>({x:cx(p.x),y:cy(p.y)}));ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#152d22';ctx.lineWidth=cell*.77;traceSmooth(ctx,points,cell*1.5);ctx.stroke();ctx.strokeStyle='#9ad54d';ctx.lineWidth=cell*.54;traceSmooth(ctx,points,cell*1.5);ctx.stroke();
 s.cargo.forEach((c,i)=>{const q=points[s.baseLen+i];if(q){farmParcel(ctx,bank,c.kind,c.type,q.x,q.y,cell*.7);if(c.kind==='fragile'&&c.integrity<100){ctx.strokeStyle='#ef8265';ctx.lineWidth=3*ratio;ctx.strokeRect(q.x-cell*.35,q.y-cell*.35,cell*.7,cell*.7);}}});
 drawFace(ctx,points[0],s.dir,cell);
 // Direction badges point to the most urgent objective outside the camera.
 const priority=[...s.orders].sort((a,b)=>a.deadline-b.deadline)[0];
 if(priority&&!overview){const c=s.cargo.find(c=>c.id===priority.id),kind=c?'ANTAR':'AMBIL',targets=c?(c.remaining||[c.type]).map(type=>({...arena.sites[type],type})):[{...priority.pickup,type:priority.type}];
  for(const q of targets){const x=cx(q.x),y=cy(q.y),minX=left+28*ratio,maxX=W-right-28*ratio,minY=top+20*ratio,maxY=H-bottom-20*ratio;
   if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)continue;const bx=clamp(x,minX,maxX),by=clamp(y,minY,maxY),angle=Math.atan2(y-by,x-bx);
   ctx.save();ctx.translate(bx,by);ctx.rotate(angle);ctx.fillStyle=COL[q.type];ctx.beginPath();ctx.moveTo(18*ratio,0);ctx.lineTo(4*ratio,-8*ratio);ctx.lineTo(4*ratio,8*ratio);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#17362df2';ctx.fillRect(bx-23*ratio,by-12*ratio,46*ratio,24*ratio);text(kind+' '+q.type,bx,by,9*ratio);
  }
 }
}
