// An early turn may wait up to two cells for an opening in Normal. This only
// selects an input; stepSim still owns every wall/body/hazard collision.
export function resolveDeliveryTurn(s, requested) {
 const current=s.dir,head=s.snake[0],arena=s.arena;
 const open=p=>p.x>=0&&p.y>=0&&p.x<arena.w&&p.y<arena.h&&!arena.obstacle[p.y*arena.w+p.x];
 if(!requested)return {direction:current,pending:false};
 if(!s.cfg.turnLead||current.x*requested.x+current.y*requested.y!==0||open({x:head.x+requested.x,y:head.y+requested.y}))return {direction:requested,pending:false};
 for(let n=1;n<=s.cfg.turnLead;n++){
  const ahead={x:head.x+current.x*n,y:head.y+current.y*n};if(!open(ahead))break;
  if(open({x:ahead.x+requested.x,y:ahead.y+requested.y}))return {direction:current,pending:true};
 }
 return {direction:requested,pending:false};
}
