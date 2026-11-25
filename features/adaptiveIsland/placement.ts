// Horizontal oriented footprint, in world units. Compound models supply multiple boxes.
// The adapter must measure the entire model, including off-centre children and clearance.
export type Box={x:number;z:number;w:number;d:number;angle:number};
export type Item={id:string;provider:string;x:number;z:number;scale:number;angle:number;parts:Box[];movable:boolean;surface:string};
export type Land={surface:string;bounds:Box};
export type Move={id:string;provider:string;from:[number,number];to:[number,number]};
const EPS=1e-7;
function axes(a:number){return [[Math.cos(a),Math.sin(a)],[-Math.sin(a),Math.cos(a)]];}
function corners(b:Box){
 const [u,v]=axes(b.angle);
 return [-1,1].flatMap(i=>[-1,1].map(j=>[b.x+i*b.w*u[0]/2+j*b.d*v[0]/2,b.z+i*b.w*u[1]/2+j*b.d*v[1]/2]));
}
function valid(b:Box){return [b.x,b.z,b.w,b.d,b.angle].every(Number.isFinite)&&b.w>0&&b.d>0;}
export function overlap(a:Box,b:Box){
 const ca=corners(a), cb=corners(b);
 return [...axes(a.angle),...axes(b.angle)].every(([x,z])=>{
   const pa=ca.map(p=>p[0]*x+p[1]*z),pb=cb.map(p=>p[0]*x+p[1]*z);
   return Math.max(...pa)>Math.min(...pb)+EPS && Math.max(...pb)>Math.min(...pa)+EPS;
 });
}
function inside(a:Box,b:Box){
 const [u,v]=axes(b.angle);
 return corners(a).every(([x,z])=>Math.abs((x-b.x)*u[0]+(z-b.z)*u[1])<=b.w/2+EPS &&
 Math.abs((x-b.x)*v[0]+(z-b.z)*v[1])<=b.d/2+EPS);
}
export function footprint(item:Item,x=item.x,z=item.z):Box[]{
 const [u,v]=axes(item.angle);
 return item.parts.map(p=>({x:x+item.scale*(p.x*u[0]+p.z*v[0]),z:z+item.scale*(p.x*u[1]+p.z*v[1]),
 w:p.w*item.scale,d:p.d*item.scale,angle:item.angle+p.angle}));
}
// Returns a whole plan or null. Fixed reserves include paths, water, future sites and collector clearances.
export function plan(items:Item[],reserves:Box[],plots:Box[],land:Land[]):Move[]|null{
 if(![...reserves,...plots,...land.map(l=>l.bounds)].every(valid))return null;
 if(plots.some((p,i)=>[...reserves,...plots.slice(i+1)].some(b=>overlap(p,b)) || !land.some(l=>inside(p,l.bounds))))return null;
 const occupied=[...reserves,...plots], affected:Item[]=[],keys=new Set<string>();
 for(const item of items){
   const key=JSON.stringify([item.provider,item.id]);
   if(keys.has(key)||!item.id||!item.parts.length||!(item.scale>0)||!item.parts.every(valid))return null;
   keys.add(key);
   const parts=footprint(item);
   if(!parts.every(valid))return null;
   if(parts.some(p=>plots.some(q=>overlap(p,q)))){
     if(!item.movable)return null;
     affected.push(item);
   }else occupied.push(...parts);
 }
 const moves:Move[]=[];
 for(const item of affected.sort((a,b)=>a.provider.localeCompare(b.provider)||a.id.localeCompare(b.id))){
   let best:{x:number;z:number;dist:number;parts:Box[]}|undefined;
   for(const patch of land.filter(l=>l.surface===item.surface)){
     const bounds=corners(patch.bounds);
     const xs=bounds.map(p=>p[0]),zs=bounds.map(p=>p[1]);
     for(let x=Math.ceil(Math.min(...xs));x<=Math.max(...xs);x++)for(let z=Math.ceil(Math.min(...zs));z<=Math.max(...zs);z++){
       const dist=(x-item.x)**2+(z-item.z)**2;
       if(best && dist>=best.dist)continue;
       const parts=footprint(item,x,z);
       if(parts.every(p=>inside(p,patch.bounds)&&occupied.every(q=>!overlap(p,q))))best={x,z,dist,parts};
     }
   }
   if(!best)return null;
   occupied.push(...best.parts);moves.push({id:item.id,provider:item.provider,from:[item.x,item.z],to:[best.x,best.z]});
 }
 return moves;
}
