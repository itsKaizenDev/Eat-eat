// Offline repair: preserve accepted geometry; reject a placement unless the real
// fixed-step mission (including keys/lever order, guards and wildlife) is replayable.
// --fast bounds solver search, never relaxes replay/placement acceptance checks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--prepared')) await import('../tests/helpers/env.mjs');
const base = root + '/node_modules/.cache/snake-tests/puzzle/';
const { CAMPAIGN_VARIANTS } = await import(base + 'campaignData.mjs');
const { generateRound } = await import(base + 'rounds.mjs');
const { missionSpec, levelPlan } = await import(base + 'generator.mjs');
const { arrangeRound } = await import(base + 'placement.mjs');
const Q = await import(base + 'quality.mjs'), V = await import(base + 'validation.mjs');
const hash=createHash('sha256');
for(const file of ['scripts/quality-campaign.mjs','lib/puzzle/campaignData.js',...['generator','rounds','placement','navigation','geometry','sim','threats','boss','quality','validation'].map(n=>'lib/puzzle/'+n+'.js')]) hash.update(fs.readFileSync(root+'/'+file));
hash.update(process.argv.includes('--fast')?'bounded-search':'deep-search');
const directory=root+'/node_modules/.cache/dungeon-quality-'+hash.digest('hex').slice(0,16); fs.mkdirSync(directory,{recursive:true});
const workers = Number(process.argv.find(a => a.startsWith('--workers='))?.split('=')[1] || 0);
if (workers) {
 const result = await Promise.all(Array.from({ length: workers }, (_, i) => new Promise(resolve => { const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--prepared', ...(process.argv.includes('--fast') ? ['--fast'] : []), `--shard=${i}/${workers}`], { cwd: root, stdio: 'inherit' }); child.on('exit', resolve); })));
 if (result.some(Boolean)) process.exit(1);
 const bank = CAMPAIGN_VARIANTS.map((vs, i) => vs.map((_, j) => JSON.parse(fs.readFileSync(`${directory}/${i+1}-${j}.json`))));
 fs.writeFileSync(root + '/lib/puzzle/campaignData.js', '// Verified geometry and temporal mission bank. Rebuild quality with node scripts/quality-campaign.mjs --workers=4.\nexport const CAMPAIGN_VARIANTS = '+JSON.stringify(bank)+';\nexport const CAMPAIGN_SPECS = CAMPAIGN_VARIANTS.slice(5).map(v => v[0]);\n');
 console.log('400/400 quality placements written.'); process.exit(0);
}
const [shard, count] = (process.argv.find(a => a.startsWith('--shard='))?.split('=')[1] || '0/1').split('/').map(Number);
for (let n = 1; n <= 50; n++) if ((n - 1) % count === shard) for (let j = 0; j < 8; j++) {
 const dest = `${directory}/${n}-${j}.json`; if (fs.existsSync(dest)) continue;
 const original = CAMPAIGN_VARIANTS[n - 1][j], l = JSON.parse(JSON.stringify(original)), plan = levelPlan(n);
 const wanted = [...plan.roles];
 // Preserve posts that make wildlife relevant; dropping a random access guard
 // can strand a monster even when the remaining roster count is correct.
 const importance = g => (g.fast ? 20 : 0) + (l.beasts || []).reduce((sum,b) => {
   const at=b.kind==='mimic'?b.mouth:b;return sum+Math.max(0,8-Math.min(...[g,...g.route].map(p=>Math.hypot(at.x-p.x,at.y-p.y))));
 },0);
 const kept = new Set();
 for (const role of new Set(wanted)) {
   const count=wanted.filter(r=>r===role).length;
   l.guards.filter(g=>g.role===role).sort((a,b)=>importance(b)-importance(a)).slice(0,count).forEach(g=>kept.add(g));
 }
 l.guards=l.guards.filter(g=>kept.has(g));
 let excessFast=l.guards.filter(g=>g.fast).length-plan.fast; for(const g of l.guards.filter(g=>g.fast)) if(excessFast-->0){g.fast=false;g.kind='warden';g.speed/=1.18;}
 let missingFast = plan.fast - l.guards.filter(g => g.fast).length;
 for (const g of l.guards.filter(g => !g.fast).reverse()) if (missingFast-- > 0) { g.fast = true; g.kind = 'runner'; g.speed *= 1.18; }
 if (n >= 25) l.guards.find(g => g.role === 'relic').specialty = 'warden';
 l.plan = plan;
 const before = Q.mapQuality(l), candidates = Q.entryCandidates(l).filter(p => p.distance > before.separation + 2).slice(0, 5);
 let accepted = null, proof = null, last = null;
 for (const p of before.errors.length ? [...candidates, l.spawn] : [l.spawn, ...candidates]) {
   const candidate = { ...l, par: 9999, spawn: { x: p.x, y: p.y }, exit: { x: p.x, y: p.y } };
   const quality = Q.mapQuality(candidate); if (quality.errors.length) { last = quality.errors; continue; }
   const errors = [...V.validatePlan(candidate), ...V.validateLevel(candidate)]; if (errors.length) { last = errors; continue; }
   const idle = V.idleSurvival(candidate, 45); if (!idle.ok) { last = idle; continue; }
   let replay;
   for (const wait of (process.argv.includes('--fast') ? [0] : [0, 1.5, 3])) { replay = V.verifyMission(candidate, { horizon: process.argv.includes('--fast') ? 70 : 170, maxNodes: process.argv.includes('--fast') ? 100 : 1000, bonus: n < 16, wait }); if (replay.ok) { replay.initialWait = wait; break; } }
   if (!replay.ok) { last = { errors: replay.errors, checkpoints: replay.checkpoints }; continue; }
   accepted = candidate; proof = replay; break;
 }
 if (!accepted) {
   const entries = Q.entryCandidates(l, { security: false }).filter(p => p.distance >= before.minimum).slice(0, 12);
   for (let attempt = 1; attempt <= 200 && !accepted; attempt++) {
     if (attempt % 5 === 1) console.log(`REPAIR ${n}-${j} attempt ${attempt}`);
     const p = entries[(attempt - 1) % Math.max(1, entries.length)] || l.spawn;
     const seed = 200000000 + n * 1000000 + j * 10000 + attempt;
     const raw = attempt <= 16 ? { ...l, par: 9999, spawn: { x: p.x, y: p.y }, exit: { x: p.x, y: p.y } } : generateRound(missionSpec(n), seed, original.shape, { deferPlacement: true });
     if (!raw) continue;
     const candidate = arrangeRound(raw, attempt, null, { keepSecurity: attempt <= 16 && attempt % 2 === 0 });
     if (candidate && n >= 25) candidate.guards.find(g => g.role === 'relic').specialty = 'warden';
     if (!candidate || Q.mapQuality(candidate).errors.length || V.validatePlan(candidate).length || V.validateLevel(candidate).length || !V.idleSurvival(candidate).ok) continue;
     let replay;
     for (const wait of (process.argv.includes('--fast') ? [0] : [0, 1.5])) { replay = V.verifyMission(candidate, { horizon: process.argv.includes('--fast') ? 70 : 170, maxNodes: process.argv.includes('--fast') ? 100 : 1000, bonus: n < 16, wait }); if (replay.ok) { replay.initialWait = wait; break; } }
     if (replay.ok) { accepted = candidate; proof = replay; accepted.qualityRepair = attempt; accepted.qualityReplacedFootprint = attempt > 16; }
   }
 }
 if (!accepted) throw Error(`${original.variantId}: ${JSON.stringify(last)}`);
 accepted.placementProof = { attempt: accepted.qualityRepair || 0, replacedFootprint: !!accepted.qualityReplacedFootprint, time: Math.round(proof.time * 100) / 100, bonus: n < 16 };
 accepted.quality = { ...Q.mapQuality(accepted), beforeSeparation: before.separation };
 accepted.par = Math.max(original.par, Math.ceil((proof.time * 1.5 + 10) / 5) * 5);
 accepted.qualityProof = { time: Math.round(proof.time * 100) / 100, initialWait: proof.initialWait, solverHorizon: proof.solverHorizon, bonus: n < 16, idleSeconds: 45 };
 if (!fs.existsSync(dest)) { fs.writeFileSync(dest + '.' + process.pid + '.tmp', JSON.stringify(accepted)); fs.renameSync(dest + '.' + process.pid + '.tmp', dest); } console.log(`PASS ${n}-${j} ${original.roundSeed} path ${before.separation}→${accepted.quality.separation} score ${accepted.quality.score}`);
}
