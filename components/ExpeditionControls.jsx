'use client';
import GameButton from './GameButton';
import { ICONS } from '@/lib/icons';
export default function ExpeditionControls({data:r,onAction,editing=false,dragProps={}}){
 if(!r)return null;
 return <div className={`dungeon-controls expedition-controls no-swipe ${editing?'editing':''}`} {...dragProps} role="group" aria-label="Aksi Ekspedisi">
  <GameButton immediate onActivate={()=>onAction('dash')} disabled={r.dashWait>0} aria-label={`Dash (Spasi)${r.dashWait>0?', pulih '+Math.ceil(r.dashWait)+' detik':''}`}><ICONS.fast size={22}/><small>{r.dashWait>0?Math.ceil(r.dashWait)+'d':'Dash'}</small></GameButton>
  <GameButton immediate onActivate={()=>onAction('skill')} disabled={r.skillWait>0} aria-label={`Semburan bisa (Q)${r.skillWait>0?', pulih '+Math.ceil(r.skillWait)+' detik':''}`}><ICONS.flask size={22}/><small>{r.skillWait>0?Math.ceil(r.skillWait)+'d':'Bisa'}</small></GameButton>
  <GameButton immediate onActivate={()=>onAction('food')} disabled={!r.food||r.hp>=r.maxHp} aria-label={`Makan bekal (F), ${r.food} tersisa`}><ICONS.normal size={21}/><small>Bekal {r.food}</small></GameButton>
  {r.poison&&<GameButton immediate onActivate={()=>onAction('antidote')} disabled={!r.antidote} aria-label={`Penawar (X), ${r.antidote} tersisa`}><ICONS.leaf size={20}/><small>Penawar {r.antidote}</small></GameButton>}
  {r.interaction&&<GameButton immediate className="expedition-interact" onActivate={()=>onAction('interact')} aria-label={r.interaction+' (E)'}><ICONS.key size={22}/><small>Interaksi</small></GameButton>}
 </div>;
}
