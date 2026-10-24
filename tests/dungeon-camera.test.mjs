import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {root,makePuzzleWorld,campaign} from './helpers/env.mjs';
const {cameraView}=await import(pathToFileURL(root+'/node_modules/.cache/snake-tests/puzzle/view.mjs').href);
test('camera: large missions retain readable tile sizes in portrait, landscape and desktop',()=>{
 for(const [w,h]of[[360,740],[390,844],[844,390],[1366,768],[1920,1080]])for(const dpr of[1,2]){
  const screen={width:w*dpr,height:h*dpr,cssWidth:w,cssHeight:h};
  const values=[1,20,30,40,50].map(n=>cameraView(campaign.CAMPAIGN_LEVELS[n-1],screen,{x:2.5,y:2.5}));
  assert.ok(values.every(v=>v.tileCSS>=32));assert.ok(values.every(v=>v.tileCSS===values[0].tileCSS));
  for(const v of values){const y=(2.5*v.size+v.oy)/dpr;assert.ok(y>=(w<600?118:100),'player below HUD');assert.ok(y<h-90,'player above controls');}
 }
});
test('camera: zoom and overview change only presentation and preserve a paused mission',()=>{
 const w=makePuzzleWorld({levels:[campaign.CAMPAIGN_LEVELS[39]]});w.eng.startRun();w.advance(300);w.eng.pauseRun();
 const before=structuredClone(w.x.world);assert.deepEqual(w.last('puzzle').camera,{zoom:1,overview:false});
 for(const value of['in','in','toggle','out','toggle','toggle'])w.eng.setCamera(value);
 assert.deepEqual(w.x.world,before);assert.equal(w.eng.getState(),'paused');
 assert.deepEqual(w.last('puzzle').camera,{zoom:1.3,overview:false});w.eng.destroy();
});

test('camera: abstract-map edges cannot push the followed player down under the controls',()=>{
 const level=campaign.CAMPAIGN_LEVELS[49], screen={width:780,height:1688,cssWidth:390,cssHeight:844};
 const ys=[2.5,12.5,22.5].map(y=>{const v=cameraView(level,screen,{x:15.5,y});return (y*v.size+v.oy)/2;});
 assert.ok(ys.every(y=>y>118&&y<696));assert.ok(Math.max(...ys)-Math.min(...ys)<.01);
});

test('camera: a new random round returns to the readable follow view',()=>{
 const w=makePuzzleWorld({levels:campaign.CAMPAIGN_LEVELS});w.eng.startRun();w.eng.setCamera('toggle');assert.equal(w.last('puzzle').camera.overview,true);
 w.eng.restartLevel();assert.equal(w.last('puzzle').camera.overview,false);w.eng.destroy();
});
