// Rebuild all 400 placements; no unverified or missing-monster fallback is allowed.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--prepared')) await import('../tests/helpers/env.mjs');
const campaign = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/campaign.mjs').href);
const rounds = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/rounds.mjs').href);
const generator = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/generator.mjs').href);
const V = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/validation.mjs').href);
const { arrangeRound } = await import(pathToFileURL(root + '/node_modules/.cache/snake-tests/puzzle/placement.mjs').href);
const hash = createHash('sha256');
for (const name of ['navigation','placement','layout','rounds','generator','sim','threats','boss','geometry','validation']) hash.update(fs.readFileSync(path.join(root,`lib/puzzle/${name}.js`)));
hash.update(fs.readFileSync(path.join(root,'lib/puzzle/campaignData.js')));
hash.update(fs.readFileSync(fileURLToPath(import.meta.url)));
const signature=hash.digest('hex'),directory=path.join(root,'node_modules/.cache/dungeon-arranged-'+signature.slice(0,16)+'-v11');
fs.mkdirSync(directory,{recursive:true});
const readDone=()=>Object.fromEntries(fs.readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>[f.slice(0,-5),JSON.parse(fs.readFileSync(path.join(directory,f),'utf8'))]));
let done=readDone();
const workers=process.argv.find(a=>a.startsWith('--workers='));
if(workers){
 const count=Number(workers.split('=')[1]);
 const results=await Promise.all(Array.from({length:count},(_,i)=>new Promise(resolve=>{
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--prepared',`--shard=${i}/${count}`],{cwd:root,stdio:'inherit'});
  child.on('exit',code=>resolve(code));
 })));
 if(results.some(c=>c!==0))process.exit(1);
}
const shard=process.argv.find(a=>a.startsWith('--shard='));
const [worker,count]=shard?shard.split('=')[1].split('/').map(Number):[0,1];
const select=process.argv.find(a=>a.startsWith('--level='));
const levels=workers?[]:select?[Number(select.split('=')[1])]:Array.from({length:50},(_,i)=>i+1);
for(const n of levels.filter(n=>(n-1)%count===worker))for(let index=0;index<8;index++){
 const id=`${n}-${index}`;if(done[id])continue;
 const original=campaign.CAMPAIGN_VARIANTS[n-1][index];let accepted=null,last;
 const attemptFile=path.join(directory,id+'.attempt');
 const start=fs.existsSync(attemptFile)?Number(fs.readFileSync(attemptFile,'utf8')):0;
 for(let attempt=start;attempt<2000;attempt++){
  fs.writeFileSync(attemptFile,String(attempt));
  const raw=attempt===0?original:rounds.generateRound(generator.missionSpec(n),100000000+n*1000000+index*10000+attempt,original.shape,{grow:(original.compact?.sourceWidth??original.width)>generator.levelPlan(n).width?1:0,deferPlacement:true});
  if(!raw){last='new-footprint';continue;}
  const diag={},l=arrangeRound(raw,attempt,diag);if(!l){last=diag.reason;continue;}
  const errors=[...V.validatePlan(l),...V.validateLevel(l)];if(errors.length){last=errors;continue;}
  const idle=V.idleSurvival(l);if(!idle.ok){last=idle;continue;}
  const proof=V.verifyMission(l,{maxNodes:100,bonus:n<16});if(!proof.ok){last=proof.errors;if(attempt%20===0)console.log(`TRY ${id} #${attempt}: ${last}`);continue;}
  if([2,10,16,20,27,30,36,40,45,50].includes(n)&&!V.verifyMission(l,{maxNodes:1000,wait:3,bonus:n<16}).ok){last='delayed';continue;}
  accepted={...l,par:Math.max(l.par===9999?0:l.par,Math.ceil((proof.time*1.5+10)/5)*5),placementProof:{attempt,replacedFootprint:l.roundSeed!==original.roundSeed,time:Math.round(proof.time*100)/100,bonus:n<16}};
  break;
 }
 if(!accepted)throw Error(`${id} ${original.variantId}: ${JSON.stringify(last)}`);
 done[id]=accepted;const destination=path.join(directory,id+'.json');fs.writeFileSync(destination+'.tmp',JSON.stringify(accepted));fs.renameSync(destination+'.tmp',destination);console.log(`PASS ${id} ${original.shape} attempt ${accepted.placementProof.attempt} (${Object.keys(done).length}/400)`);
}
done=readDone();
if(shard){console.log('Worker complete.');process.exit(0);}
if(Object.keys(done).length!==400){console.log('Checkpoint saved; bank not changed yet.');process.exit(0);}
const bank=Array.from({length:50},(_,i)=>Array.from({length:8},(_,j)=>({...done[`${i+1}-${j}`],plan:generator.levelPlan(i+1),par:done[`${i+1}-${j}`].par===9999?Math.ceil((done[`${i+1}-${j}`].placementProof.time*1.5+10)/5)*5:done[`${i+1}-${j}`].par})));
const body='// Verified round bank. Rebuild placements with npm run build:campaign -- --arrange.\nexport const CAMPAIGN_VARIANTS = [\n'+bank.map(v=>'  '+JSON.stringify(v)).join(',\n')+'\n];\nexport const CAMPAIGN_SPECS = CAMPAIGN_VARIANTS.slice(5).map(variants => variants[0]);\n';
const destination=path.join(root,'lib/puzzle/campaignData.js');fs.writeFileSync(destination+'.tmp',body);fs.renameSync(destination+'.tmp',destination);
console.log('400/400 placements verified and written.');
