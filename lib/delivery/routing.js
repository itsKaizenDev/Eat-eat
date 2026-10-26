// A* proposes real input steps. Nodes carry the ordered snake body, cargo,
// direction, deadlines and simulated clock; every edge uses the real transition.
const DIRECTIONS=['U','R','D','L','W'];
class Heap {
 a=[];
 push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=v.cost)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,root=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=v.cost)break;a[i]=a[c];i=c;}a[i]=v;}return root;}
}
export function findDeliveryRoute(initial,goal,{clone,move,interval,maxNodes=850,maxSteps=100}={}) {
 const w=initial.arena.w,h=initial.arena.h,dist=new Int16Array(w*h).fill(-1),q=[goal.y*w+goal.x];dist[q[0]]=0;
 for(let i=0;i<q.length;i++){const p=q[i],x=p%w,y=(p-x)/w;for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w+nx;if(nx>=0&&ny>=0&&nx<w&&ny<h&&!initial.arena.obstacle[k]&&dist[k]<0){dist[k]=dist[p]+1;q.push(k);}}}
 if(dist[initial.snake[0].y*w+initial.snake[0].x]<0)return null;
 const heap=new Heap(),seen=new Set(),stale=initial.stale;heap.push({s:clone(initial),depth:0,path:[],cost:0});let visited=0;
 while(heap.a.length&&visited++<maxNodes){
  const n=heap.pop(),s=n.s,head=s.snake[0];
  if(head.x===goal.x&&head.y===goal.y)return n.path;
  if(n.depth>=maxSteps||s.t>=s.cfg.shiftMs)continue;
  const key=s.snake.map(p=>p.y*w+p.x).join(',')+'|'+s.dir.x+','+s.dir.y+'|'+s.t+'|'+Math.max(s.t,s.delayUntil||0)+'|'+Object.entries(s.incidents).filter(([,until])=>until>s.t).sort(([a],[b])=>a.localeCompare(b)).map(([id,until])=>id+':'+until).join(',')+'|'+s.cargo.map(c=>c.id+':'+(c.remaining||[c.type]).join('')+':'+c.integrity).join(',');
  if(seen.has(key))continue;seen.add(key);
  for(const d of DIRECTIONS){
   const next=clone(s),at=s.t+interval(s);move(next,d,at,{planning:true});
   if(next.status==='lost'||next.stale>stale)continue;
   const p=next.snake[0],distance=dist[p.y*w+p.x];if(distance<0)continue;
   const didMove=p.x!==head.x||p.y!==head.y;if(!didMove&&d!=='W')continue;
   const damage=next.cargo.some(c=>c.kind==='fragile'&&c.integrity<100)?10:0;
   heap.push({s:next,depth:n.depth+1,path:[...n.path,d],cost:n.depth+1+distance*1.001+damage+(d==='W'?.25:0)});
  }
 }
 return null;
}
