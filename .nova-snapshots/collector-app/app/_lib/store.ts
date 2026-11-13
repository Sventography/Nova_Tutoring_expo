import AsyncStorage from "@react-native-async-storage/async-storage";
const INV="store:inventory:v1", EQ="store:equipped:v1", NOTES="store:notes:v1";
type Inv = Record<string, number>;
async function read<T>(k:string, f:T){ const raw=await AsyncStorage.getItem(k); if(!raw) return f; try{return JSON.parse(raw) as T;}catch{return f;} }
async function write<T>(k:string, v:T){ await AsyncStorage.setItem(k, JSON.stringify(v)); }
export async function getInventory(sku:string){ const inv=await read<Inv>(INV,{}); return Math.max(0, Math.floor(inv[sku]||0)); }
export async function isOwned(sku:string){ return (await getInventory(sku))>0; }
export async function equip(sku:string){ await AsyncStorage.setItem(EQ, JSON.stringify({ cursor: sku })); return sku; }
export async function getEquipped(){ return read<{cursor?:string}>(EQ,{}); }
export async function purchase(sku:string, qty=1){ const inv=await read<Inv>(INV,{}); inv[sku]=(inv[sku]||0)+Math.max(0,qty); await write(INV,inv); return inv[sku]; }
export async function getNote(id:string){ const m=await read<Record<string,string>>(NOTES,{}); return m[id]||""; }
export async function setNote(id:string, text:string){ const m=await read<Record<string,string>>(NOTES,{}); m[id]=text; await write(NOTES,m); return true; }
export default { getInventory, isOwned, equip, getEquipped, purchase, getNote, setNote };
