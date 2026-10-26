// Deliberate mechanic introduction; replay changes placements, not the rules.
export const PACKAGE_KINDS = {
  standard: { label:'Reguler', short:'REG', size:1, reward:18, margin:2, grace:14000 },
  express: { label:'Ekspres', short:'EXP', size:1, reward:30, margin:1.45, grace:6500 },
  fragile: { label:'Rapuh', short:'FRG', size:1, reward:28, margin:2, grace:14000 },
  heavy: { label:'Berat', short:'HVT', size:2, reward:34, margin:2.1, grace:15000 },
  multi: { label:'Multi-stop', short:'2×', size:1, reward:42, margin:2, grace:14000 },
};
const stage=(number,name,tier,pool,target,seconds,capacity,features)=>({id:'courier-'+number,number,name,tier,pool,target,shiftMs:seconds*1000,capacity,maxOrders:number<3?1:2,features,mayhem:true,revision:2});
export const MISSIONS = [
 stage(1,'Rute Pertama','Belajar',['standard'],3,90,2,0),
 stage(2,'Jam Kirim','Belajar',['standard','express'],4,100,2,0),
 stage(3,'Jangan Dibanting','Perencanaan',['standard','express','fragile'],4,110,3,1),
 stage(4,'Muatan Besar','Perencanaan',['standard','heavy','fragile'],5,120,3,1),
 stage(5,'Dua Alamat','Perencanaan',['standard','multi','express'],5,125,3,2),
 stage(6,'Lampu Kota','Tekanan',['express','fragile','heavy'],5,130,4,3),
 stage(7,'Pasar Bergerak','Tekanan',['standard','fragile','multi'],6,135,4,3),
 stage(8,'Simpang Sibuk','Tekanan',['express','multi','heavy'],6,140,4,4),
 stage(9,'Kurir Andal','Ahli',['fragile','heavy','multi'],7,145,4,4),
 stage(10,'Kejar Sempurna','Ahli',['express','fragile','multi'],7,150,4,4),
 stage(11,'Lintas Distrik','Ahli',['standard','express','fragile','heavy','multi'],8,155,4,4),
 stage(12,'Delivery Mayhem','Ahli',['express','fragile','heavy','multi'],8,160,4,4),
];
export const missionAt = i => MISSIONS[Math.max(0,Math.min(MISSIONS.length-1,i))];
