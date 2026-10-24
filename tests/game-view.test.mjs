import test from 'node:test';
import assert from 'node:assert/strict';
import { gameView, registry, makeWorld, ICONS } from './helpers/env.mjs';
const { arenaLayout, WORLD_RATIO } = gameView;

test('Dungeon fills the surface; fixed-board modes retain their whole world', () => {
  for (const [w,h] of [[344,724],[724,344],[828,374],[916,414],[752,1008],[1008,752],[1350,752],[1904,1064],[667,368]]) {
    for (const touch of [true,false]) for (const actions of [true,false]) {
      const r=arenaLayout(w,h,{touch,actions});
      assert.ok(r.left>=0 && r.top>=0 && r.left+r.width<=w+.01 && r.top+r.height<=h+.01);
      if(actions){assert.deepEqual(r,{rail:false,left:0,top:0,width:w,height:h});continue;}
      assert.ok(Math.abs(r.width/r.height-WORLD_RATIO)<1e-9);
      if(r.rail || (touch && w>h) || (actions && w>=1100)) {
        assert.ok(r.left>=160, `${w}x${h} has clear thumb rail`);
      } else if(touch) assert.ok(r.top+r.height<=h-154+.01);
      else if(actions) assert.ok(r.top+r.height<=h-116+.01);
    }
  }
});

test('every registered mode has a compact score or meaningful live context', () => {
  for(const mode of registry.MODES) assert.ok(gameView.gameView(mode.id,{score:0,effects:[]}).stats.length);
  const v=gameView.gameView('mayhemduo',{mpHud:{p1Label:'P1: 12',p1Lives:3,p2Label:'P2: 6',p2Lives:2}});
  assert.deepEqual(v.stats.map(x=>x.value),['P1: 12','P2: 6']);
  assert.match(v.stats[1].label,/2 nyawa/);
  assert.equal(gameView.gameView('classic',{score:8,timerText:'0:30'}).stats.length,1);
  assert.equal(gameView.gameView('timeattack',{score:8,timerText:'0:05'}).stats[1].danger,true);
});

test('critical cargo, detection, effects and boss windows remain in live HUD', () => {
  const cargo=[{type:'A',secs:2},null,{type:'C',secs:8}];
  assert.deepEqual(gameView.gameView('delivery',{delivery:{timeText:'1:00',delivered:2,target:5,cargo}}).cargo,cargo);
  const p=gameView.gameView('puzzle',{puzzle:{levelNo:35,levelCount:50,artifacts:2,artifactsTotal:2,time:'1:10',coins:4,coinTotal:40,cameraAlarm:true,suspicion:100,statusText:'ALARM'}});
  assert.equal(p.suspicion,100);assert.equal(p.signals[0].danger,true);assert.match(p.signals[1].label,/keluar/);
  const b=gameView.gameView('boss',{boss:{round:10,rounds:10,lives:5,energy:3,need:3,isBoss:true,phase:2,phaseHp:4,phaseMaxHp:5,weak:{status:'open',secs:3,ready:true},stage:'Peringatan'},effects:[{type:'fast',label:'Cepat',t:'4s'}]});
  assert.match(b.signals[0].label,/Serang/);assert.match(b.signals.at(-1).label,/4s/);
});

test('resizing arcade backing store does not reset run, timer or save data', () => {
  const w=makeWorld('timeattack');w.eng.startRun();w.eng.setDir(1,0);w.advance(120);
  const before={state:w.eng.getState(),score:w.last('score'),timer:w.last('timerText'),store:{...w.store},snake:JSON.stringify(w.x.snake)};
  w.canvas.width=1360;w.canvas.height=1200;w.eng.resize();
  assert.equal(w.eng.getState(),before.state);assert.equal(w.last('score'),before.score);assert.equal(w.last('timerText'),before.timer);assert.deepEqual(w.store,before.store);assert.equal(JSON.stringify(w.x.snake),before.snake);
  w.eng.destroy();
});

test('all new controls use existing verified icon constructors', () => {
  for(const name of ['info','settings','fullscreen','exitFullscreen','close','play']) assert.ok(ICONS[name],name);
});
