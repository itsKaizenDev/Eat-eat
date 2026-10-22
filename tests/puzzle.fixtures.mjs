import { puzzle as P } from './helpers/env.mjs';
export const pt=(x,y)=>({x:x+.5,y:y+.5});
export function guard(x=8,y=4,extra={}) {return {...pt(x,y),facing:Math.PI,range:4,fov:Math.PI/2,speed:1,dwell:.5,pause:0,route:[pt(x,y),pt(x,6)],kind:'scout',...extra};}
export function room(extra={}) {
  return {id:'test-room',number:1,name:'Ruang Uji',revision:5,tier:'Uji',tutorial:false,width:13,height:9,
    map:['#############',...Array(7).fill('#...........#'),'#############'],spawn:pt(2,2),exit:pt(1,1),
    keys:[],doors:[],levers:[],plates:[],artifacts:[{id:'relic',...pt(11,7),kind:'artifact'}],loot:[],hides:[],shadows:[],guards:[],crystals:[],torches:[],bells:[],portals:[],
    gadgets:{stone:2,smoke:1},par:90,goal:'Ambil relik, lalu keluar.',tip:'Amati penjaga.',...extra};
}
export function advance(s,seconds,input={}) {for(let i=0;i<Math.round(seconds*60);i++)P.step(s,input,P.FIXED_DT);return s;}
export function withWall(level,x,y,char='#') {const map=level.map.map(r=>r.split(''));map[y][x]=char;return {...level,map:map.map(r=>r.join(''))};}
