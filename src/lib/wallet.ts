let coins=0;
let owned=new Set<string>();
let equipped:{ theme?:string; cursor?:string; avatar?:string }={};
export async function getCoins(){ return coins; }
export async function addCoins(n:number){ coins+=n; return coins; }
export async function spendCoins(n:number){ coins=Math.max(0,coins-n); return coins; }
export async function setCoins(n:number){ coins=n; return coins; }
export async function getOwned(){ return Array.from(owned); }
export async function isOwned(id:string){ return owned.has(id); }
export async function own(id:string){ owned.add(id); return true; }
export async function getEquipped(){ return equipped; }
export async function setEquipped(next:{ theme?:string; cursor?:string; avatar?:string }){ equipped=next; return true; }
