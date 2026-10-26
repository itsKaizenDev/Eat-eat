export const NORMAL_PROGRESS_KEY='snake-delivery-normal-v3';
export const DELIVERY_DIFFICULTY_KEY='snake-delivery-difficulty';
export const DELIVERY_PROGRESS_KEY='snake-delivery-mayhem-v2';
export const emptyProgress=()=>({version:2,unlocked:1,missions:{}});
export function parseDeliveryProgress(raw){let p;try{p=JSON.parse(raw);}catch{}const out=emptyProgress();if(p?.version!==2)return out;out.unlocked=Math.max(1,Math.min(12,Math.floor(p.unlocked)||1));for(const [id,r]of Object.entries(p.missions||{}))if(/^courier-(?:[1-9]|1[0-2])$/.test(id)&&Number.isInteger(r.score)&&r.score>=0)out.missions[id]={score:r.score,stars:Math.max(0,Math.min(3,r.stars||0))};return out;}
const progressKey=difficulty=>difficulty==='hard'?DELIVERY_PROGRESS_KEY:NORMAL_PROGRESS_KEY;
export function loadDeliveryProgress(difficulty='normal'){try{return parseDeliveryProgress(localStorage.getItem(progressKey(difficulty)));}catch{return emptyProgress();}}
export function saveDeliveryProgress(p,difficulty='normal'){try{localStorage.setItem(progressKey(difficulty),JSON.stringify(p));return true;}catch{return false;}}
export function mergeDeliveryProgress(a,b){const p=emptyProgress();p.unlocked=Math.max(a.unlocked,b.unlocked);for(const id of new Set([...Object.keys(a.missions),...Object.keys(b.missions)])){const x=a.missions[id]||{score:0,stars:0},y=b.missions[id]||{score:0,stars:0};p.missions[id]={score:Math.max(x.score,y.score),stars:Math.max(x.stars,y.stars)};}return p;}

export function loadDeliveryDifficulty(){try{return localStorage.getItem(DELIVERY_DIFFICULTY_KEY)==='hard'?'hard':'normal';}catch{return 'normal';}}
export function saveDeliveryDifficulty(value){try{localStorage.setItem(DELIVERY_DIFFICULTY_KEY,value);return true;}catch{return false;}}
