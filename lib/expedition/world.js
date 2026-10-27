// Authored traversal graph. No random trap placement or moving targets on reload.
export const WORLD_REVISION = 1;
export const DT = 1 / 60;
export const THEMES = [
 {id:'root',name:'Hutan Akar',ground:'#c9bb83',edge:'#35563b',leaf:'#6d9945',ink:'#21392c',accent:'#f6c979',boss:'Penjaga Akar',minis:[['boar','Babi Hutan Berzirah'],['mantis','Belalang Pemburu']]},
 {id:'spore',name:'Rawa Spora',ground:'#8fae91',edge:'#294c51',leaf:'#6c8d9e',ink:'#183e43',accent:'#cfb7f1',boss:'Ratu Spora',minis:[['frog','Katak Rawa'],['fungus','Jamur Parasit']]},
 {id:'vine',name:'Reruntuhan Sulur',ground:'#b9b4a1',edge:'#434b50',leaf:'#6f8972',ink:'#2e3940',accent:'#e3b98f',boss:'Jantung Sulur',minis:[['centipede','Kelabang Batu'],['cocoon','Kepompong Sulur']]},
];
function makeWorld(region) {
 const width=48,height=38,map=Array.from({length:height},()=>Array(width).fill('#'));
 const carve=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy][xx]='.';};
 const rooms=[{x:4,y:17,w:14,h:11},{x:28,y:17,w:15,h:11},{x:18,y:3,w:19,h:11}];
 for(const r of rooms)carve(r.x,r.y,r.w,r.h);
 carve(4,31,12,5);carve(6,27,3,8);carve(17,21,12,3);carve(31,13,3,5);
 carve(18,29,8,6);carve(13,31,10,3); // Supply clearing, with its own safe approach.
 carve(3,4,10,9);carve(7,12,3,6); // Optional lever trail and cache.
 if(region===1){carve(23,31,13,3);carve(33,27,3,7);} // Swamp: either miniboss may be first.
 if(region===2){carve(40,8,5,15);carve(36,8,8,3);carve(40,21,4,3);} // Ruin loop, gated until two seals.
 // Pillars have generous routes on both sides and serve as charge targets.
 for(const [x,y] of [[7,20],[13,19],[15,24],[32,20],[39,24],[22,6],[33,6]])map[y][x]='#';
 const prefix=THEMES[region].id;
 const encounters=rooms.map((arena,i)=>({id:prefix+'-'+i,region,arena,
  kind:i===2?'boss':'mini',type:i===2?prefix:THEMES[region].minis[i][0],name:i===2?THEMES[region].boss:THEMES[region].minis[i][1],
  x:[11.5,35.5,27.5][i],y:[21.5,21.5,7.5][i],
  shrine:{x:[10.5,35.5,31.5][i],y:[26,26,12][i]},
  hp:i===2?[140+region*25,165+region*25,190+region*25]:[90+region*12,105+region*12],index:i}));
 const line=(id,axis,at,lo,hi,offset)=>({id:prefix+'-'+id,axis,at,lo,hi,offset,period:10,warning:1.5,active:.85,rest:7.65,damage:12+region*2,
  tiles:Array.from({length:hi-lo+1},(_,i)=>axis==='row'?{x:lo+i,y:at}:{x:at,y:lo+i})});
 const traps=[line('crossing','row',29,6,8,0),line('bridge','column',23,21,23,3)];
 if(region===1)traps.push(line('swamp-pass','column',27,31,33,5));
 if(region===2)traps.push(line('ruin-pass','row',16,40,44,6));
 const camps=[{id:prefix+'-entry',x:7.5,y:33.5,name:'Liang Penjelajah'},
  {id:prefix+'-mini0',x:5.5,y:26.5,name:'Singgah Barat',requires:[prefix+'-0']},
  {id:prefix+'-mini1',x:41.5,y:26.5,name:'Singgah Timur',requires:[prefix+'-1']},
  {id:prefix+'-boss',x:32.5,y:16.5,name:'Bekal Terakhir',requires:[prefix+'-0',prefix+'-1']}];
 const loot=[{id:prefix+'-cache',x:22.5,y:32.5,kind:'cache'},
  {id:prefix+'-secret',x:5.5,y:6.5,kind:'relic',requires:prefix+'-lever'},
  {id:prefix+'-food0',x:12.5,y:34.5,kind:'food'},{id:prefix+'-food1',x:17.5,y:22.5,kind:'food'},
  {id:prefix+'-herb',x:29.5,y:25.5,kind:'herb'}];
 const mobs=[{id:prefix+'-scout0',x:14.5,y:32.5,hp:24,type:'crawler'},
  {id:prefix+'-scout1',x:22.5,y:30.5,hp:28,type:'crawler'},
  {id:prefix+'-scout2',x:8.5,y:14.5,hp:28,type:'spitter'}];
 return {region,id:prefix,width,height,map:map.map(r=>r.join('')),rooms,encounters,traps,camps,loot,mobs,
  lever:{id:prefix+'-lever',x:11.5,y:8.5},start:{x:7.5,y:33.5},exit:{x:27.5,y:4.5},back:{x:5.5,y:34.5}};
}
export const WORLDS=THEMES.map((_,i)=>makeWorld(i));
export const encounterById=id=>WORLDS.flatMap(w=>w.encounters).find(e=>e.id===id);
export function trapStage(trap,time) {
 const p=((time+trap.offset)%trap.period+trap.period)%trap.period;
 return p<trap.rest?'safe':p<trap.rest+trap.warning?'warning':'active';
}
export const cleared=(s,id)=>s.defeated.includes(id);
export function doorsFor(s) {
 const w=WORLDS[s.region],active=s.active?encounterById(s.active):null,doors=[];
 const add=(id,x,y,axis,n)=>{for(let i=0;i<n;i++)doors.push({id:id+'-'+i,x:x+.5+(axis==='row'?i:0),y:y+.5+(axis==='column'?i:0)});};
 if(s.region!==1&&!cleared(s,w.encounters[0].id))add('west-seal',19,21,'column',3);
 const seals=w.encounters.slice(0,2).every(e=>cleared(s,e.id));
 if(!seals||active?.index===2)add('boss-seal',31,14,'row',3);
 if(s.region===2&&active?.index===2)add('boss-loop',37,8,'column',3);
 if(s.region===2&&!seals)add('ruin-seal',40,14,'row',5);
 if(active?.index===0){add('west-entry',6,28,'row',3);add('west-exit',18,21,'column',3);add('west-secret',7,16,'row',3);}
 if(active?.index===1){add('east-entry',33,28,'row',3);add('east-exit',27,21,'column',3);add('east-north',31,16,'row',3);if(s.region===2)add('east-loop',40,16,'row',5);}
 return doors;
}
export function bindGeometry(s) {
 const w=WORLDS[s.region];
 return {level:{map:w.map,width:w.width,height:w.height,doors:doorsFor(s)},opened:new Set(),smoke:[],beasts:[]};
}
export function availableCamp(s,camp){return !camp.requires||camp.requires.every(id=>cleared(s,id));}
export function objective(s) {
 const w=WORLDS[s.region],a=s.active&&s.enemies.find(e=>e.id===s.active);
 if(a)return a.stage==='transition'?a.name+' berubah wujud':a.name+' · baca tanda serangan';
 if(s.offer?.length)return 'Pilih satu kemampuan perjalanan';
 const n=w.encounters.slice(0,2).filter(e=>cleared(s,e.id)).length;
 return n<2?`Dapatkan dua segel wilayah · ${n}/2`:!cleared(s,w.encounters[2].id)?'Singgah, lalu hadapi '+THEMES[s.region].boss:s.region<2?'Jalur wilayah berikutnya terbuka':'Kembali ke gerbang sarang untuk menuntaskan perjalanan';
}
