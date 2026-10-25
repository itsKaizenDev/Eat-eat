import { puzzle as P, geometry as G, threats, createRng } from './env.mjs';
const {bossRules}=threats;
export function playBoss(level,{careless=false,limit=900,seed=null}={}){
  const s=P.createState(level),b=s.boss,tile=o=>`${Math.floor(o.x)},${Math.floor(o.y)}`;
  const dir=goal=>{const n=G.findPath(s,s.player,goal)?.[0];return n?{x:n.x-s.player.x,y:n.y-s.player.y}:{x:goal.x-s.player.x,y:goal.y-s.player.y};};
  const safe=()=>{const seen=new Set([tile(s.player)]),q=[{x:Math.floor(s.player.x),y:Math.floor(s.player.y)}];for(let i=0;i<q.length;i++){const c=q[i];if(!b.danger.has(`${c.x},${c.y}`))return{x:c.x+.5,y:c.y+.5};for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx,y:c.y+dy},k=`${n.x},${n.y}`;if(!seen.has(k)&&level.map[n.y]?.[n.x]==='.'){seen.add(k);q.push(n);}}}return s.player;};
  if(seed!==null)b.rng=createRng(seed);
  const skills=new Set(),phases=new Set();
  let defeatedAt=null;
  while(s.status==='playing'&&s.time<limit){
    phases.add(b.phase);if(b.attack)skills.add(b.attack.kind);
    const inDanger=b.danger.has(tile(s.player))&&(b.state==='TELE'||b.state==='ACTIVE');let goal;
    if(b.state==='WINDOW'){const remaining=b.targets.filter(i=>!b.used.includes(i)),ordered=['sequence','chains','finale'].includes(bossRules(s).mechanic);const open=ordered?remaining:remaining.sort((a,c)=>Math.hypot(level.boss.weak[a].x-s.player.x,level.boss.weak[a].y-s.player.y)-Math.hypot(level.boss.weak[c].x-s.player.x,level.boss.weak[c].y-s.player.y));goal=open.length?level.boss.weak[open[0]]:{x:level.boss.x,y:9.5};}
    else if(b.defeated)goal=s.artifacts?level.exit:level.artifacts[0];
    else if(inDanger||b.state==='TELE')goal=safe();else goal={x:level.boss.x,y:9.5};
    let v=Math.hypot(goal.x-s.player.x,goal.y-s.player.y)<.15?{x:0,y:0}:dir(goal);
    const next={x:s.player.x+Math.sign(v.x)*.3,y:s.player.y+Math.sign(v.y)*.3};
    if(!careless&&(b.state==='TELE'||b.state==='ACTIVE')&&b.danger.has(tile(next))&&!inDanger)v={x:0,y:0};
    P.step(s,{x:v.x,y:v.y,gait:'run'});if(b.defeated&&defeatedAt===null)defeatedAt=s.time;
  }
  return {s,defeatedAt,skills,phases};
}
