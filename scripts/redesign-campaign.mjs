// Offline authoring: no bank is published without placement, idle-survival and
// real fixed-step mission proofs. Results are cached against source content.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(isMainThread){
  const {campaign}=await import('../tests/helpers/env.mjs');
  const hash=createHash('sha256');
  for(const name of ['campaignData','tactics','placement','rounds','validation','quality','generator','geometry','navigation','sim','threats','injuries','boss'])hash.update(fs.readFileSync(root+'/lib/puzzle/'+name+'.js'));
  hash.update(fs.readFileSync(fileURLToPath(import.meta.url)));
  const out=root+'/node_modules/.cache/tactics-'+hash.digest('hex').slice(0,16);fs.mkdirSync(out,{recursive:true});
  const bank=structuredClone(campaign.CAMPAIGN_VARIANTS),failures=[];let done=0;
  const queue=bank.flatMap((row,i)=>row.map((level,j)=>({i,j,level,keepLayout:process.argv.includes('--keep-layout')||level.tacticsRevision===1}))).filter(t=>{
    const file=out+'/'+t.i+'-'+t.j+'.json';if(!fs.existsSync(file))return true;
    const r=JSON.parse(fs.readFileSync(file));if(!r.ok)return true;bank[t.i][t.j]=r.level;done++;return false;
  });
  console.log(JSON.stringify({resumed:done,pending:queue.length,output:out}));
  await Promise.all(Array.from({length:Math.min(4,queue.length)},()=>new Promise((resolve,reject)=>{
    const w=new Worker(new URL(import.meta.url),{workerData:{cache:root+'/node_modules/.cache/snake-tests/puzzle/'}});
    const next=()=>queue.length?w.postMessage(queue.shift()):w.terminate().then(resolve);
    w.on('error',reject);w.on('message',r=>{
      fs.writeFileSync(out+'/'+r.i+'-'+r.j+'.json',JSON.stringify(r));
      if(r.ok)bank[r.i][r.j]=r.level;else failures.push(r);
      console.log(JSON.stringify({done:++done,id:bank[r.i][r.j].variantId,ok:r.ok,repair:r.repair,errors:r.errors}));next();
    });next();
  })));
  if(failures.length){console.error(JSON.stringify({failures}));process.exitCode=1;}
  else{
    fs.writeFileSync(root+'/lib/puzzle/campaignData.js','// 400 tactical variants accepted by placement, idle and executable mission checks.\n// Rebuild with npm run build:campaign.\nexport const CAMPAIGN_VARIANTS = '+JSON.stringify(bank)+';\nexport const CAMPAIGN_SPECS = CAMPAIGN_VARIANTS.slice(5).map(v=>v[0]);\n');
    console.log(JSON.stringify({accepted:400,extraction:bank.flat().filter(l=>l.flow==='extraction').length}));
  }
}else{
  const load=n=>import(workerData.cache+n+'.mjs');
  const V=await load('validation'),Q=await load('quality');
  const {arrangeTactics,arrangeSpikes,arrangePatrols,shadowPlacements,tacticalTip}=await load('tactics');
  const {arrangeRound}=await load('placement');const {CAMPAIGN_REVISION,missionSpec}=await load('generator');
  const {generateRound}=await load('rounds');
  function valid(level){
    if(level.guards.length>6||level.number>=25&&!level.guards.some(g=>g.specialty==='warden'))return false;
    if([...V.validatePlan(level),...V.validateLevel(level),...Q.mapQuality(level).errors].length)return false;
    const props=['keys','levers','artifacts','loot','hides','plates','doors','portals','crystals','torches','bells','hazards','guards','dogs'].flatMap(k=>level[k]);
    for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++)if(Math.hypot(props[i].x-props[j].x,props[i].y-props[j].y)<.95)return false;
    return true;
  }
  function safePlacement(source){
    // Re-generated footprints must keep the campaign's unlocked roster. Apply
    // this before simulation: adding a Warden after the proof would invalidate it.
    if(source.number>=25){
      const relicGuard=source.guards.find(g=>g.role==='relic');
      if(!relicGuard)return null;
      relicGuard.specialty='warden';
    }
    if(valid(source)&&V.idleSurvival(source).ok)return source;
    for(let i=0;i<4;i++){try{const l=arrangeSpikes(source,i);if(valid(l)&&V.idleSurvival(l).ok)return l;}catch{}}
    for(const l of shadowPlacements(source))if(valid(l)&&V.idleSurvival(l).ok)return l;
    for(let i=0;i<6;i++){try{const l=arrangePatrols(source,i);if(valid(l)&&V.idleSurvival(l).ok)return l;}catch{}}
    return null;
  }
  function proof(level,wait){return V.verifyMission({...level,par:9999},{maxNodes:1000,horizon:170,bonus:level.number<16,wait});}
  parentPort.on('message',task=>{
    try{
      const source=task.keepLayout?structuredClone(task.level):arrangeTactics(task.level);
      let accepted=null,result=null,repair=0,last=['no-accepted-placement'];
      for(let attempt=task.repairOnly?1:0;attempt<=160&&!accepted;attempt++){
        let candidate=source;
        if(attempt){
          const shift=source.flow==='extraction'&&attempt<=8;
          const generated=attempt>48||task.repairOnly&&!shift;
          let fresh=generated?generateRound(missionSpec(source.number),300000000+source.number*100000+task.j*1000+attempt,source.shape,{deferPlacement:true}):source;
          if(generated&&fresh){const entries=Q.entryCandidates(fresh,{security:false});const p=entries[(attempt-1)%Math.min(4,entries.length)];if(p){fresh={...fresh,spawn:{x:p.x,y:p.y},exit:{x:p.x,y:p.y}};}}
          const raw=shift?source:fresh&&arrangeRound(fresh,attempt);if(!raw)continue;
          candidate=arrangeTactics(raw,{exitRank:shift?attempt*13:attempt,keepPortals:!generated});
        }
        const level=safePlacement(candidate);if(!level)continue;
        for(const wait of attempt?[0]:[...new Set([task.level.qualityProof?.initialWait||0,0,3])]){
          const r=proof(level,wait);last=r.errors;
          if(r.ok){accepted=level;result={...r,initialWait:wait};repair=attempt;break;}
        }
      }
      if(!accepted){parentPort.postMessage({i:task.i,j:task.j,ok:false,errors:last});return;}
      accepted.revision=CAMPAIGN_REVISION;accepted.tacticsRevision=1;accepted.tip=tacticalTip(accepted);
      accepted.par=Math.max(task.level.par,Math.ceil((result.time*1.5+10)/5)*5);
      accepted.quality=Q.mapQuality(accepted);
      accepted.qualityProof={time:Math.round(result.time*100)/100,initialWait:result.initialWait,solverHorizon:result.solverHorizon,solverStrategy:result.solverStrategy,bonus:accepted.number<16,idleSeconds:45};
      accepted.placementProof={...accepted.placementProof,time:accepted.qualityProof.time,bonus:accepted.number<16};
      parentPort.postMessage({i:task.i,j:task.j,ok:true,level:accepted,repair});
    }catch(e){parentPort.postMessage({i:task.i,j:task.j,ok:false,errors:[e.stack]});}
  });
}
