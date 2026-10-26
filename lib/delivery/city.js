// Normal prioritizes room to steer; Hard preserves the original precision map.
export function cityLayout(mission, seed=1) {
 return mission.difficulty === 'hard' ? hardCity(mission,seed) : normalCity(mission,seed);
}
function normalCity(mission,seed) {
 const w=25,h=23,flip=(seed>>>0)%2===1;
 const rows=[{at:2,lo:1,hi:3},{at:8,lo:7,hi:9},{at:14,lo:13,hi:14},{at:20,lo:19,hi:21}];
 const columns=[{at:2,lo:1,hi:3},{at:8,lo:7,hi:9},{at:16,lo:15,hi:16},{at:22,lo:21,hi:23}];
 const map=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x>0&&x<w-1&&y>0&&y<h-1&&(rows.some(r=>y>=r.lo&&y<=r.hi)||columns.some(c=>x>=c.lo&&x<=c.hi))?'.':'#'));
 // Wider junctions also provide safe staging space before a timed crossing.
 for(const row of rows)for(const col of columns)for(let y=row.at-1;y<=row.at+1;y++)for(let x=col.at-1;x<=col.at+1;x++)if(x>0&&y>0&&x<w-1&&y<h-1)map[y][x]='.';
 const rawSites={A:{x:6,y:2},B:{x:22,y:6},C:{x:13,y:20}},point=p=>({...p,x:flip?w-1-p.x:p.x});
 for(const [type,q]of Object.entries(rawSites))map[q.y][q.x]=type;
 if(flip)for(const row of map)row.reverse();
 const gates=mission.features>=3?[13,14].map(y=>({...point({x:8,y}),id:'crossing',period:8500,closed:2600,phase:1700})):[];
 const blocks=mission.features>=4?[7,8,9].map(x=>({...point({x,y:8}),id:'works',period:11000,closed:2800,phase:3900})):[];
 const traffic=mission.features>=3?[{id:'tram',route:[17,18,19,20].map(x=>point({x,y:8})),period:9000,phase:2500,warn:1000,stepMs:400}]:[];
 const lanes=mission.features>=2?[10,11,12,13].map(x=>({...point({x,y:14}),dx:flip?-1:1,dy:0})):[];
 const bumps=mission.features>=1?[point({x:16,y:14})]:[];
 return {map:map.map(r=>r.join('')),start:{snake:[[6,20],[5,20],[4,20]].map(([x,y])=>[point({x,y}).x,y]),dir:flip?'L':'R'},features:{gates,blocks,traffic,lanes,bumps},district:['Taman Apel','Pasar Pelangi','Terminal Kota','Pusat Malam'][Math.floor((mission.number-1)/3)],seed,difficulty:'normal'};
}
// The perimeter is an always-open route. All timed obstacles are optional
// shortcuts, never destinations, so a closed crossing cannot seal an order.
function hardCity(mission, seed=1) {
 const w=17,h=15,flip=(seed>>>0)%2===1,columns=(seed>>>1)%2?[3,8,13]:[4,8,12];
 const rows=[1,4,7,10,13],map=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x>0&&x<w-1&&y>0&&y<h-1&&(rows.includes(y)||x===1||x===15||columns.includes(x))?'.':'#'));
 const rawSites={A:{x:3,y:1},B:{x:15,y:5},C:{x:8,y:13}};
 const point=p=>({...p,x:flip?w-1-p.x:p.x});
 for(const [type,p] of Object.entries(rawSites))map[p.y][p.x]=type;
 if(flip)for(const row of map)row.reverse();
 const gate={...point({x:8,y:7}),id:'crossing',period:8500,closed:2600,phase:1700};
 const block={...point({x:columns[0],y:10}),id:'works',period:11000,closed:2800,phase:3900};
 const traffic={id:'tram',route:[10,11,12,13].map(x=>point({x,y:4})),period:9000,phase:2500,warn:1000,stepMs:400};
 const lanes=mission.features>=2?[5,6,7].map(x=>({...point({x,y:7}),dx:flip?-1:1,dy:0})):[];
 const bumps=mission.features>=1?[point({x:columns.at(-1),y:10})]:[];
 return {map:map.map(r=>r.join('')),start:{snake:[[6,13],[5,13],[4,13]].map(([x,y])=>[point({x,y}).x,y]),dir:flip?'L':'R'},
  features:{gates:mission.features>=3?[gate]:[],blocks:mission.features>=4?[block]:[],traffic:mission.features>=3?[traffic]:[],lanes,bumps},
  district:['Taman Apel','Pasar Pelangi','Terminal Kota','Pusat Malam'][Math.floor((mission.number-1)/3)],seed,difficulty:'hard'};
}
export function barrierState(barrier,t) {
 const phase=(t+barrier.phase)%barrier.period;
 return phase<barrier.closed?'closed':phase>barrier.period-900?'warning':'open';
}
export function trafficState(car,t) {
 const at=(t+car.phase)%car.period,active=at>=car.warn&&at<car.warn+car.route.length*car.stepMs;
 return {warning:at<car.warn,active,cell:active?car.route[Math.min(car.route.length-1,Math.floor((at-car.warn)/car.stepMs))]:null};
}
