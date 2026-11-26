// A single revision contains the placement identities from both providers.
// The store must perform compare-and-swap atomically, including rollback metadata.
import type {Item,Move} from "./placement";
type Layout={revision:number;items:Item[];prior:Item[]|null};
export interface LayoutStore {
 read(owner:string):Promise<Layout|null>;
 swap(owner:string,revision:number,next:Layout):Promise<boolean>;
}
function key(item:{provider:string;id:string}){return JSON.stringify([item.provider,item.id]);}
export async function applyMoves(store:LayoutStore,owner:string,revision:number,moves:Move[],
 valid:(items:Item[])=>boolean){
 const current=await store.read(owner);
 if(!current||current.revision!==revision||!moves.length)return false;
 const pending=new Map(moves.map(m=>[key(m),m]));
 if(pending.size!==moves.length)return false;
 const items=current.items.map(item=>{
   const m=pending.get(key(item));
   if(!m||!item.movable||item.x!==m.from[0]||item.z!==m.from[1]||!m.to.every(Number.isFinite))return item;
   pending.delete(key(item));return {...item,x:m.to[0],z:m.to[1]};
 });
 if(pending.size||!valid(items))return false;
 return store.swap(owner,revision,{revision:revision+1,items,prior:current.items});
}
export async function restore(store:LayoutStore,owner:string,revision:number,valid:(items:Item[])=>boolean){
 const current=await store.read(owner);
 if(!current||current.revision!==revision||!current.prior||!valid(current.prior))return false;
 return store.swap(owner,revision,{revision:revision+1,items:current.prior,prior:null});
}
// Prototype web storage. No writes to legacy inventories. Native providers require an
// equivalent atomic backing store before a relocation plan can be applied to real items.
type Request<T>={result:T;error:unknown;onsuccess:(()=>void)|null;onerror:(()=>void)|null};
type BrowserDB={
 createObjectStore(name:string):unknown;close():void;
 transaction(name:string,mode?:"readwrite"):{
  objectStore(name:string):{get(owner:string):Request<Layout|undefined>;put(next:Layout,owner:string):unknown};
  oncomplete:(()=>void)|null;onabort:(()=>void)|null;error:unknown;
 };
};
export async function openLayoutJournal():Promise<LayoutStore & {close():void}>{
 const db=await new Promise<BrowserDB>((resolve,reject)=>{
  const browser=globalThis as typeof globalThis & {indexedDB:{open(name:string,version:number):Request<BrowserDB> & {onupgradeneeded:(()=>void)|null}}};
  const request=browser.indexedDB.open("nova-living-layout-preview-v1",1);
  request.onupgradeneeded=()=>request.result.createObjectStore("layouts");
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 return {
  read:owner=>new Promise((resolve,reject)=>{
   const r=db.transaction("layouts").objectStore("layouts").get(owner);
   r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);
  }),
  swap:(owner,revision,next)=>new Promise((resolve,reject)=>{
   const tx=db.transaction("layouts","readwrite"),s=tx.objectStore("layouts"),r=s.get(owner);
   let written=false;
   r.onsuccess=()=>{if((r.result?.revision??-1)!==revision||next.revision!==revision+1)return;
    s.put(next,owner);written=true;};
   tx.oncomplete=()=>resolve(written);tx.onabort=()=>reject(tx.error??Error("Layout save interrupted"));
  }),
  close:()=>db.close()
 };
}
