// Generate a finite bank of random rounds, admitting only executable three-star routes.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, generator, rounds, validation as V } from '../tests/helpers/env.mjs';
// Persist only fully verified missions so an interrupted long build can resume.
// Any generation/simulation change invalidates the cached proof bank.
const sources=['scripts/build-campaign.mjs','lib/sim/rng.js',...['generator','rounds','sim','navigation','threats','geometry','validation'].map(n=>`lib/puzzle/${n}.js`)];
const hash=createHash('sha256');sources.forEach(f=>hash.update(fs.readFileSync(path.join(root,f))));
const signature=hash.digest('hex'),checkpoint=path.join(root,'node_modules/.cache/dungeon-campaign.json');
let bank=[];
if(fs.existsSync(checkpoint)) {
  try { const saved=JSON.parse(fs.readFileSync(checkpoint,'utf8'));if(saved.signature===signature&&Array.isArray(saved.bank)&&saved.bank.length<=50)bank=saved.bank; } catch {}
}
if(bank.length)console.log(`Melanjutkan setelah ${bank.length} misi tervalidasi.`);
for(let n=bank.length+1;n<=50;n++) {
  const base=generator.missionSpec(n), variants=[];
  for(let index=0;index<rounds.ROUND_VARIANT_SHAPES.length;index++) {
    const shape=rounds.ROUND_VARIANT_SHAPES[index];
    let accepted=null;
    for(let attempt=0;attempt<160;attempt++) {
      const seed=n*100000+index*1000+attempt;
      const level=rounds.generateRound(base,seed,shape);
      if(!level)continue;
      const proof=V.verifyMission(level,{maxNodes:650});
      if(!proof.ok)continue;
      if([2,16,20,27,30,35,37,50].includes(n)&&!V.verifyMission(level,{maxNodes:900,wait:3}).ok)continue;
      accepted=level;break;
    }
    if(!accepted)throw new Error(`Tidak ada varian aman untuk ${base.id}, bentuk ${shape}, slot ${index}`);
    variants.push(accepted);
  }
  bank.push(variants);
  fs.mkdirSync(path.dirname(checkpoint),{recursive:true});
  fs.writeFileSync(checkpoint+'.tmp',JSON.stringify({signature,bank}));fs.renameSync(checkpoint+'.tmp',checkpoint);
  console.log(`Misi ${n}/50: 8 varian lolos geometri dan replay tiga bintang.`);
}
const body='// Verified random-round bank. Regenerate with npm run build:campaign.\nexport const CAMPAIGN_VARIANTS = [\n'+bank.map(variants=>'  '+JSON.stringify(variants)).join(',\n')+'\n];\nexport const CAMPAIGN_SPECS = CAMPAIGN_VARIANTS.slice(5).map(variants => variants[0]);\n';
const destination=path.join(root,'lib/puzzle/campaignData.js');
fs.writeFileSync(destination+'.tmp',body);fs.renameSync(destination+'.tmp',destination);
console.log('50 misi, 400 varian tervalidasi. Enam bentuk termasuk dua abstrak, posisi acak, dan ID lama dipertahankan.');
