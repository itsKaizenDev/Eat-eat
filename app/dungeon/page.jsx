'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronRight, Clock3, DoorOpen, Eye, EyeOff, Flag, Gem, KeyRound, LockKeyhole, Map as MapIcon, Menu, Pause, Play, RotateCcw, ShieldAlert, Sparkles, Star, Undo2, Volume2, X, Zap } from 'lucide-react';
import { MISSIONS } from '@/lib/heist/missions.mjs';
import { grade, initialState, sees, step, tileAt, visibleCells } from '@/lib/heist/engine.mjs';
import { createDirectionInput } from '@/lib/input.js';
import './style.css';

const STORAGE='ksnake-heist-v2';
const EMPTY={unlocked:1, records:{}};
const DIR_BY_VECTOR={'0,-1':'U','0,1':'D','-1,0':'L','1,0':'R'};
const VECTOR_BY_DIR={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
const KEY_DIR={ArrowUp:'U',ArrowDown:'D',ArrowLeft:'L',ArrowRight:'R',w:'U',a:'L',s:'D',d:'R'};
function loadProgress() {try {const data=JSON.parse(localStorage.getItem(STORAGE));if(data&&typeof data==='object')return {unlocked:Math.max(1,Math.min(MISSIONS.length,Number(data.unlocked)||1)),records:data.records||{}};}catch{}return EMPTY;}
function Dpad({onPress,onRelease,onAction,disabled}) {
  const btn=(dir,cls,label,Icon)=><button disabled={disabled} className={cls} aria-label={label}
    onPointerDown={e=>{e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}onPress(`pad:${e.pointerId}`,dir);}}
    onPointerUp={e=>onRelease(`pad:${e.pointerId}`)} onPointerCancel={e=>onRelease(`pad:${e.pointerId}`)} onLostPointerCapture={e=>onRelease(`pad:${e.pointerId}`)}
    onContextMenu={e=>e.preventDefault()}
    onClick={e=>{if(e.detail===0)onAction(dir);}}><Icon/></button>;
  return <div className="heist-dpad" aria-label="Kontrol arah">
    {btn('U','d-u','Atas',ArrowUp)}{btn('L','d-l','Kiri',ArrowLeft)}<div className="d-mid"><span/></div>{btn('R','d-r','Kanan',ArrowRight)}{btn('D','d-d','Bawah',ArrowDown)}
  </div>;
}
function CellToken({kind}) {
  if(kind==='L')return <div className="h-token h-relic"><Gem size="68%" strokeWidth={2.5}/><i/></div>;
  if(kind==='o')return <div className="h-token h-coin"><Star size="62%" fill="currentColor" strokeWidth={1.8}/></div>;
  if(kind==='K')return <div className="h-token h-key"><KeyRound size="68%" strokeWidth={2.6}/></div>;
  if(kind==='S')return <div className="h-token h-switch"><Zap size="61%" fill="currentColor" strokeWidth={2.8}/></div>;
  if(kind==='T')return <div className="h-token h-stone"><span/></div>;
  if(kind==='D')return <div className="h-object h-door"><LockKeyhole size="57%" strokeWidth={2.5}/></div>;
  if(kind==='G')return <div className="h-object h-gate"><span className="h-bars">III</span></div>;
  if(kind==='H')return <div className="h-hide"><EyeOff size="55%" strokeWidth={2.2}/></div>;
  if(kind==='E')return <div className="h-exit"><DoorOpen size="65%" strokeWidth={2.1}/></div>;
  return null;
}
function GameBoard({mission,state,runKey}) {
  const seenCells=new Set(state.guards.flatMap(g=>visibleCells(mission,state,g).map(c=>`${c.x},${c.y}`)));
  const mood=new Map(state.guards.map((g,i)=>[i,sees(mission,state,g,state.player)?'!':g.alert?'?':'']));
  const things=mission.things;
  const getItem=(pos)=>{
    const k=`${pos.x},${pos.y}`;
    if(things.loot.some(p=>p.x===pos.x&&p.y===pos.y)&&!state.loot.includes(k))return 'L';
    if(things.bonus.some(p=>p.x===pos.x&&p.y===pos.y)&&!state.bonus.includes(k))return 'o';
    if(things.key.some(p=>p.x===pos.x&&p.y===pos.y)&&!state.keys.includes(k))return 'K';
    if(things.switch.some(p=>p.x===pos.x&&p.y===pos.y)&&!state.switches.includes(k))return 'S';
    if(things.decoy.some(p=>p.x===pos.x&&p.y===pos.y)&&!state.collectedDecoys.includes(k))return 'T';
    return null;
  };
  const hidden=tileAt(mission,state.player)==='H';
  return <div className="heist-board-shell">
    <div className={`heist-board ${state.exposure?'is-danger':''}`} style={{gridTemplateColumns:`repeat(${mission.width},minmax(0,1fr))`,aspectRatio:`${mission.width}/${mission.height}`,'--cols':mission.width,'--rows':mission.height}} role="img" aria-label={`Peta level ${mission.title}. Pemain di ${state.player.x},${state.player.y}. Artefak ${state.loot.length} dari ${mission.goalCount}.`}>
      {mission.tiles.map((row,y)=>row.map((t,x)=>{
        const p={x,y},k=`${x},${y}`;
        const code=things.exit.x===x&&things.exit.y===y?'E':getItem(p)||t;
        const opened=(code==='D'&&state.keys.length>0)||(code==='G'&&state.switches.length>0);
        const danger=seenCells.has(k);
        return <div key={k} className={`heist-cell ${t==='#'?'is-wall':'is-floor'} ${danger?'in-sight':''} ${t==='H'?'is-hide':''} ${code==='E'?'is-exit':''}`} title={t==='#'?'Dinding':code==='H'?'Persembunyian':code==='E'?'Pintu keluar':undefined}>
          {t!=='#'&& <span className="heist-floor-detail"/>}
          {t!=='#'&&<span className={`heist-sight-shade ${danger?'on':''}`}/>}
          {code!=='.'&&code!=='#'&&!opened&&<CellToken kind={code}/>}
          {opened&&<div className="heist-opened"><Check size="48%"/></div>}
          {state.noise && state.noise.x===x && state.noise.y===y && <div className="heist-noise"><Volume2 size="65%"/></div>}
        </div>;
      }))}
      <div className="heist-entities" key={runKey}>
        {state.guards.map((g,i)=><div key={`g${i}`} className="heist-ent heist-ent-guard" style={{'--x':g.pos.x,'--y':g.pos.y}}>
          <div className={`heist-guard ${g.alert?'is-alert':''}`} data-dir={g.dir}>
            <i className="heist-beam"/>
            <div className="heist-helmet"><b/><span className="heist-eyes"/></div><span className="heist-guard-shadow"/>
            {mood.get(i)&&<span className={`heist-bubble ${mood.get(i)==='!'?'is-seen':'is-curious'}`}>{mood.get(i)}</span>}
          </div>
        </div>)}
        <div className="heist-ent heist-ent-player" style={{'--x':state.player.x,'--y':state.player.y}}>
          <div className={`heist-player ${state.exposure?'is-spotted':''} ${hidden?'is-hidden':''}`}>
            <span className="heist-flip" style={{transform:state.facing==='L'?'scaleX(-1)':undefined}}>
              <span className="heist-hop" key={`${state.player.x},${state.player.y}`}><img src="/assets/game/mascot-idle.png" alt="" draggable={false}/></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
export default function DungeonPage() {
  const [progress,setProgress]=useState(EMPTY);
  const [index,setIndex]=useState(0);
  const [game,setGame]=useState(()=>({state:initialState(MISSIONS[0]),history:[]}));
  const gameRef=useRef(game);
  const [paused,setPaused]=useState(false);
  const [drawer,setDrawer]=useState(false);
  const [sound,setSound]=useState(true);
  const [toast,setToast]=useState('');
  const audioRef=useRef(null);
  const [runId,setRunId]=useState(0);
  const [settled,setSettled]=useState(false);
  const liveRef=useRef({});
  const inputRef=useRef(null);
  useEffect(()=>{const data=loadProgress();setProgress(data);},[]);
  const mission=MISSIONS[index], state=game.state;
  const openLevel=useCallback((i)=>{if(i<0||i>=MISSIONS.length)return;const reset={state:initialState(MISSIONS[i]),history:[]};gameRef.current=reset;setIndex(i);setRunId(n=>n+1);setGame(reset);setPaused(false);setDrawer(false);setToast('');},[]);
  const playSound=useCallback((freq=420)=>{
    if(!sound)return;
    try{ const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!audioRef.current)audioRef.current=new AC(); const ctx=audioRef.current;
      const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ctx.currentTime);
      gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.10);
    }catch{}
  },[sound]);
  const act=useCallback((action)=>{
    if(paused||drawer)return;
    const current=gameRef.current;
    const result=step(mission,current.state,action);
    if(!result.moved){setToast(result.reason);return;}
    const next={state:result.state,history:[...current.history,current.state]};
    gameRef.current=next;
    setGame(next);
    setToast('');
    if(result.state.status==='won')playSound(740);
    else if(result.state.status==='lost')playSound(185);
    else if(result.state.exposure)playSound(520);
  },[paused,drawer,mission,playSound]);
  const undo=useCallback(()=>{
    if(paused||drawer)return;
    const current=gameRef.current;
    if(current.state.status!=='playing'||!current.history.length)return;
    const next={state:current.history.at(-1),history:current.history.slice(0,-1)};
    gameRef.current=next;setGame(next);setToast('');
  },[paused,drawer]);
  const restart=useCallback(()=>openLevel(index),[openLevel,index]);
  liveRef.current={act,paused,drawer};
  if(!inputRef.current){
    inputRef.current=createDirectionInput({
      stepMode:()=>true,
      enabled:()=>{const l=liveRef.current;return !l.paused&&!l.drawer&&gameRef.current.state.status==='playing';},
      send:(_player,x,y,opts)=>{
        const dir=DIR_BY_VECTOR[`${x},${y}`];if(!dir)return;
        // Tahan tombol berhenti otomatis begitu terlihat penjaga: harus ketuk lagi untuk kabur.
        if(opts?.repeat&&gameRef.current.state.exposure>0){inputRef.current.clear();return;}
        liveRef.current.act(dir);
      },
    });
  }
  const pressDir=useCallback((key,dir)=>{const v=VECTOR_BY_DIR[dir];inputRef.current.press(key,0,v[0],v[1]);},[]);
  const releaseDir=useCallback((key)=>inputRef.current.release(key),[]);
  useEffect(()=>{
    const norm=e=>e.key.length===1?e.key.toLowerCase():e.key;
    const onKey=e=>{
      const k=norm(e),dir=KEY_DIR[k];
      if(dir){e.preventDefault();if(!e.repeat)pressDir(`key:${k}`,dir);}
      else if(k===' '){e.preventDefault();if(!e.repeat)act('W');}
      else if(k==='q'){e.preventDefault();if(!e.repeat)act('Q');}
      else if(k==='z'){e.preventDefault();if(!e.repeat)undo();}
      else if(k==='r'){e.preventDefault();if(!e.repeat)restart();}
      else if(e.key==='Escape'&&!e.repeat){e.preventDefault();if(drawer)setDrawer(false);else setPaused(v=>!v);}
    };
    const onUp=e=>{const k=norm(e);if(KEY_DIR[k])releaseDir(`key:${k}`);};
    const onBlur=()=>inputRef.current.clear();
    window.addEventListener('keydown',onKey);window.addEventListener('keyup',onUp);window.addEventListener('blur',onBlur);
    return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',onBlur);inputRef.current?.clear();};
  },[act,undo,restart,drawer,pressDir,releaseDir]);
  useEffect(()=>{if(paused||drawer||state.status!=='playing')inputRef.current?.clear();},[paused,drawer,state.status]);
  // Beri jeda singkat agar langkah terakhir (tertangkap / keluar) sempat terlihat sebelum panel hasil muncul.
  useEffect(()=>{
    if(state.status==='playing'){setSettled(false);return;}
    const t=setTimeout(()=>setSettled(true),480);return()=>clearTimeout(t);
  },[state.status,runId]);
  useEffect(()=>{
    if(state.status!=='won')return;
    setProgress(current=>{
      const stars=grade(mission,state),old=current.records[mission.id],record={stars:Math.max(stars,old?.stars||0),best:Math.min(state.turns,old?.best??Infinity)};
      if(old&&record.stars===old.stars&&record.best===old.best&&current.unlocked>=Math.min(MISSIONS.length,index+2))return current;
      const next={unlocked:Math.max(current.unlocked,Math.min(MISSIONS.length,index+2)),records:{...current.records,[mission.id]:record}};
      try{localStorage.setItem(STORAGE,JSON.stringify(next));}catch{}return next;
    });
  },[state.status,state.turns,mission,state,index]);
  const totalStars=Object.values(progress.records).reduce((n,r)=>n+(Number(r.stars)||0),0);
  const won=state.status==='won',lost=state.status==='lost';
  const three=Array.from({length:3},(_,i)=>i<grade(mission,state));
  return <main className="heist-page">
    <div className="heist-glow" aria-hidden="true"/>
    <header className="heist-topbar">
      <Link href="/" className="heist-back"><ArrowLeft size={17}/> K-SNAKE <span>/ DUNGEON</span></Link>
      <div className="heist-top-actions"><span className="heist-status-dot"/> <span className="heist-top-caption">STEALTH PUZZLE</span><button aria-label="Pilih level" className="heist-square" onClick={()=>setDrawer(true)}><MapIcon size={20}/></button><button aria-label={sound?'Matikan suara':'Nyalakan suara'} className="heist-square" onClick={()=>setSound(!sound)}><Volume2 size={20} opacity={sound?1:.35}/></button></div>
    </header>
    <section className="heist-hero">
      <div className="heist-intro"><div className="heist-eyebrow"><span className="heist-chapter">{mission.chapter}</span><span className="heist-dot"/> MISSION {String(index+1).padStart(2,'0')} / {String(MISSIONS.length).padStart(2,'0')}</div><h1>{mission.title}<span className="heist-asterisk">*</span></h1><p>{mission.subtitle}</p></div>
      <div className="heist-progress"><div><Star size={19} fill="currentColor"/><strong>{totalStars}</strong><small> / {MISSIONS.length*3} BINTANG</small></div><span>{Object.keys(progress.records).length} / {MISSIONS.length} misi selesai</span><div className="heist-meter"><i style={{width:`${Object.keys(progress.records).length / MISSIONS.length *100}%`}}/></div></div>
    </section>
    <div className="heist-layout">
      <section className={`heist-arena ${state.exposure?'is-danger':''}`} aria-label="Arena Dungeon">
        <div className="heist-arena-head"><span className="heist-onair"><span/> {state.exposure?'BAHAYA':'MENYELINAP'}</span><div><span><Gem size={15}/> {state.loot.length}/{mission.goalCount}</span><span><Clock3 size={15}/> {state.turns} giliran</span></div></div>
        <GameBoard mission={mission} state={state} runKey={`${index}-${runId}`}/>
        <div className={`heist-message ${state.exposure?'urgent':''}`} role="status"><ShieldAlert size={19}/><span>{toast||state.message}</span></div>
        <div className="heist-mobile-controls">
          <Dpad disabled={paused||drawer||state.status!=='playing'} onAction={act} onPress={pressDir} onRelease={releaseDir}/>
          <div className="heist-touch-actions"><button onClick={()=>act('W')} disabled={paused||drawer||state.status!=='playing'}><Clock3/>TUNGGU</button><button onClick={()=>act('Q')} disabled={paused||drawer||state.status!=='playing'||state.decoys===0}><Zap/>UMPAN {state.decoys}</button><button onClick={undo} disabled={paused||drawer||!game.history.length||state.status!=='playing'}><Undo2/>UNDO</button></div>
        </div>
      </section>
      <aside className="heist-sidebar">
        <div className="heist-panel h-brief"><div className="heist-section-head"><span>BRIEF MISI</span><Flag size={18}/></div><h2>Ambil. Sembunyi. Kabur.</h2><p>Infiltrasi ruangan, ambil semua relik biru, lalu kembali ke pintu keluar hijau. Hindari tertangkap penjaga.</p><div className="heist-goals"><div><Gem size={20}/><span>Relik utama</span><strong>{state.loot.length}/{mission.goalCount}</strong></div><div><Star size={20}/><span>Harta bonus</span><strong>{state.bonus.length}/{mission.things.bonus.length}</strong></div><div><Eye size={20}/><span>Terlihat</span><strong>{state.exposure?'BAHAYA':'AMAN'}</strong></div><div><KeyRound size={20}/><span>Kunci / sakelar</span><strong>{state.keys.length} / {state.switches.length}</strong></div></div></div>
        <div className="heist-panel h-guide"><div className="heist-section-head"><span>CARA MAIN</span><BookOpen size={18}/></div><div className="heist-guide-row"><kbd>W A S D</kbd><span>Jalan (tahan = jalan terus)</span></div><div className="heist-guide-row"><kbd>SPACE</kbd><span>Tunggu patroli</span></div><div className="heist-guide-row"><kbd>Q</kbd><span>Lempar batu (jika ada)</span></div><div className="heist-guide-row"><kbd>Z / R</kbd><span>Undo / ulang</span></div><p><EyeOff size={16}/> Bersembunyi di ubin gelap memutus penglihatan, tetapi penjaga masih bisa mendatangi petakmu.</p></div>
        <div className="heist-panel h-utilities"><div className="heist-section-head"><span>KONTROL MISI</span></div><div className="heist-utils"><button onClick={undo} disabled={!game.history.length||state.status!=='playing'}><Undo2 size={18}/> Undo</button><button onClick={restart}><RotateCcw size={18}/> Ulang</button><button onClick={()=>setPaused(v=>!v)} disabled={state.status!=='playing'}>{paused?<Play size={18}/>:<Pause size={18}/>} {paused?'Lanjut':'Jeda'}</button></div></div>
      </aside>
    </div>
    <div className="heist-footnote"><span>K-SNAKE / DUNGEON HEIST</span><span>Stealth berbasis giliran · Tanpa RNG · Tahan arah untuk berjalan</span></div>
    {((settled&&(won||lost))||paused)&&<div className="heist-overlay" role="dialog" aria-modal="true"><div className="heist-result"><div className={`heist-result-figure ${lost?'failed':'success'}`}><img src={`/assets/game/mascot-${lost?'dizzy':won?'win':'idle'}.png`} alt="Maskot K-Snake"/></div><div className="heist-eyebrow">{won?'MISSION COMPLETE':lost?'MISSION FAILED':'PERMAINAN DIJEDA'}</div><h2>{won?'Kabur dengan Selamat!':lost?'Ketahuan Penjaga!':'Istirahat sebentar?'}</h2><p>{won?`Misi ${index+1} diselesaikan dalam ${state.turns} giliran. ${state.bonus.length} bonus dikumpulkan.`:lost?'Coba amati area merah dan jalur patroli. Tidak perlu berkelahi dengan penjaga.':'Progres di level ini tetap aman.'}</p>{won&&<div className="heist-result-stars">{three.map((b,i)=><Star key={i} size={32} fill={b?'currentColor':'none'}/>)}</div>}
      <div className="heist-result-actions">{paused?<button className="primary" onClick={()=>setPaused(false)}><Play/>Lanjut bermain</button>:won&&index<MISSIONS.length-1?<button className="primary" onClick={()=>openLevel(index+1)}>Misi berikutnya <ChevronRight/></button>:<button className="primary" onClick={restart}><RotateCcw/>Coba lagi</button>}<button onClick={()=>setDrawer(true)}><MapIcon/>Pilih misi</button><Link href="/"><ArrowLeft/>Menu utama</Link></div></div></div>}
    {drawer&&<div className="heist-overlay heist-drawer-overlay" role="dialog" aria-modal="true" aria-label="Pemilihan misi"><div className="heist-drawer"><div className="heist-drawer-heading"><div><div className="heist-eyebrow">DUNGEON HEIST</div><h2>Pilih Misi</h2></div><button onClick={()=>setDrawer(false)} aria-label="Tutup"><X/></button></div><div className="heist-missions">{MISSIONS.map((m,i)=>{const locked=i>=progress.unlocked,rec=progress.records[m.id];return <button key={m.id} disabled={locked} className={`heist-mission-card ${i===index?'active':''}`} onClick={()=>openLevel(i)}><div className="heist-mission-num">{locked?<LockKeyhole size={20}/>:String(i+1).padStart(2,'0')}</div><div><small>{m.chapter}</small><strong>{m.title}</strong><span>{locked?'Selesaikan misi sebelumnya':rec?'Terbaik: '+rec.best+' giliran':'Belum dimainkan'}</span></div><div className="heist-mission-stars">{rec?Array.from({length:3},(_,j)=><Star key={j} size={13} fill={j<rec.stars?'currentColor':'none'}/>):<ChevronRight size={18}/>}</div></button>})}</div><p className="heist-drawer-note">Misi terbuka secara berurutan. Progress disimpan di browser ini.</p></div></div>}
  </main>;
}
