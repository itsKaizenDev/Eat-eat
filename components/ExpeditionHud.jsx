'use client';
import { ICONS } from '@/lib/icons';
export default function ExpeditionHud({data:r,onInfo,onPause,canPause,onCamera,onRetry}){
 const e=r.encounter,stage=e?({dormant:'Menunggu',windup:'Bersiap menyerang',active:e.airborne?'Melompat · jauhi tanda':'Hindari serangan',recover:e.nodes?'Hancurkan simpul':'Celah terbuka',transition:'Berubah wujud',idle:'Mengintai'})[e.stage]:'';
 return <div className="game-hud expedition-hud">
  <div className="expedition-status">
  <section className="expedition-readout" aria-label="Kondisi perjalanan" data-low-health={r.hp<=r.maxHp*.3}>
   <div className="expedition-region"><span className="expedition-compass" aria-hidden="true"><ICONS.compass size={17}/></span><b>{r.regionName}</b><span>{r.totalBosses}/3 boss</span></div>
   <div className="expedition-vitals"><span aria-label={`HP ${r.hp} dari ${r.maxHp}`}><ICONS.heart size={17}/><b>{r.hp}/{r.maxHp}</b></span><span aria-label={`${r.shield} perlindungan`}><ICONS.shield size={16}/>{r.shield}</span><span><ICONS.normal size={15}/>{r.food}</span>{r.poison&&<span data-danger="true">Racun</span>}</div>
   <div className="expedition-health" role="progressbar" aria-label="HP ular" aria-valuenow={r.hp} aria-valuemin={0} aria-valuemax={r.maxHp}><i style={{width:r.hp/r.maxHp*100+'%'}}/></div>
   <p className="expedition-objective">{r.objective}</p>
   {r.overview&&<small>Map aktif · C checkpoint · 1/2 miniboss · B boss</small>}
   {r.savePending&&<button className="expedition-save" onClick={onRetry}>Simpanan belum tersimpan · Coba lagi</button>}
  </section>
  {e&&<section className="expedition-bossbar" data-stage={e.stage} aria-label={`${e.name}, ${e.kind==='boss'?'fase '+e.phase+' dari 3':'miniboss'}`}>
   <div><b>{e.name}</b><strong>{e.kind==='boss'?'FASE '+e.phase+'/3':'MINIBOSS'}</strong></div>
   {e.kind==='boss'&&<div className="expedition-phases" aria-hidden="true">{[1,2,3].map(n=><i key={n} data-complete={n<e.phase} data-active={n===e.phase}/>)}</div>}
   <div className="expedition-enemy-health" role="progressbar" aria-label="HP fase aktif" aria-valuemin={0} aria-valuemax={e.maxHp} aria-valuenow={e.hp}><i style={{width:e.hp/e.maxHp*100+'%'}}/></div>
   <small>{e.stage==='transition'?'HP fase berikutnya disiapkan':`${e.hp}/${e.maxHp} HP`} · {stage}{e.nodes>0?' · '+e.nodes+' simpul':''}</small>
  </section>}
  </div>
  {r.message&&<p className="expedition-note" role="status" aria-live="polite">{r.message}</p>}
  <nav className="hud-tools" aria-label="Menu Ekspedisi"><button onClick={onInfo} aria-label="Info perjalanan dan pengaturan"><ICONS.info size={20}/></button>{canPause&&<button onClick={onPause} aria-label="Jeda"><ICONS.pause size={20}/></button>}</nav>
  <nav className="camera-tools" aria-label="Kamera Ekspedisi"><button aria-label={r.overview?'Ikuti ular':'Lihat seluruh wilayah'} aria-pressed={!!r.overview} onClick={e=>{onCamera('toggle');if(e.detail>0)e.currentTarget.blur();}}>{r.overview?<ICONS.locate size={19}/>:<ICONS.map size={19}/>}</button><button aria-label="Perbesar tampilan" onClick={()=>onCamera('in')}><ICONS.zoomIn size={19}/></button><button aria-label="Perkecil tampilan" onClick={()=>onCamera('out')}><ICONS.zoomOut size={19}/></button></nav>
 </div>;
}
