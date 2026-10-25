// Give a remote optional room a purpose without changing mandatory objectives.
import fs from 'node:fs';
import { root, campaign, geometry as G, validation as V } from '../tests/helpers/env.mjs';
const { mapQuality } = await import(root+'/node_modules/.cache/snake-tests/puzzle/quality.mjs');
let changed=0;
const bank=campaign.CAMPAIGN_VARIANTS.map(vs=>vs.map(original=>{
 const l=JSON.parse(JSON.stringify(original));l.revision=8;
 if(l.number>=25&&!l.tip.includes('Warden:'))l.tip+=' Warden: keluar ke samping jalur saat ia bersiap, lalu manfaatkan jeda pulihnya.';
 if(l.number>=16){
  const geo={level:l,opened:new Set(l.doors.map(d=>d.id)),gateTimers:{},crossed:new Set(),smoke:[],time:0};
  const goals=[l.spawn,...l.keys,...l.levers,...l.artifacts,l.exit], route=[];
  for(let i=1;i<goals.length;i++)route.push(...(G.findPath(geo,goals[i-1],goals[i])||[]));
  const props=[...l.keys,...l.levers,...l.artifacts,...l.doors,...l.loot.slice(0,-1),...l.hides,...l.portals,...l.plates,...l.hazards,...l.torches,...l.crystals,...l.bells,...l.guards,...l.dogs];
  const spots=[];
  for(let y=1;y<l.height-1;y++)for(let x=1;x<l.width-1;x++)if(l.map[y][x]==='.'){
   const p={x:x+.5,y:y+.5};if(props.some(q=>G.distance(p,q)<1.1)||l.beasts.some(b=>G.distance(p,b.kind==='mimic'?b.mouth:b)<2.2))continue;
   const detour=Math.min(...route.map(q=>G.distance(p,q)));
   if(detour>=3.2&&G.findPath(geo,l.spawn,p))spots.push({...p,detour});
  }
  const p=spots.sort((a,b)=>b.detour-a.detour||a.y-b.y||a.x-b.x)[0];
  if(p){l.loot[l.loot.length-1]={...l.loot.at(-1),x:p.x,y:p.y};l.optionalCache={x:p.x,y:p.y,detour:Math.round(p.detour*10)/10};changed++;}
 }
 // Bonus detours need time too; the temporal certificate covers mandatory goals.
 const geo={level:l,opened:new Set(l.doors.map(d=>d.id)),gateTimers:{},crossed:new Set(),smoke:[],time:0};
 const start=l.artifacts.at(-1), oldExit=G.findPath(geo,start,l.exit)?.length||0;
 let at=start, optionalSteps=0;for(const goal of [...l.loot,l.exit]){optionalSteps+=G.findPath(geo,at,goal)?.length||0;at=goal;}
 const extraSeconds=Math.max(0,optionalSteps-oldExit)/1.45;
 l.par=Math.max(l.par,Math.ceil(((l.qualityProof.time+extraSeconds)*1.5+10)/5)*5);
 l.qualityProof.optionalTravelBudget=Math.round(extraSeconds*100)/100;
 const errors=[...V.validatePlan(l),...V.validateLevel(l)];if(errors.length)throw Error(l.variantId+': '+errors);
 l.quality={...l.quality,...mapQuality(l)};
 return l;
}));
fs.writeFileSync(root+'/lib/puzzle/campaignData.js','// 400 quality-scored, temporally verified mission variants. See scripts/quality-campaign.mjs and reward-campaign.mjs.\nexport const CAMPAIGN_VARIANTS = '+JSON.stringify(bank)+';\nexport const CAMPAIGN_SPECS = CAMPAIGN_VARIANTS.slice(5).map(v=>v[0]);\n');
console.log(JSON.stringify({optionalCaches:changed,count:bank.flat().length}));
