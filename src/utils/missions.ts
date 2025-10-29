import { getJSON, setJSON } from "../_lib/storage";
export type Mission = { id: string; title: string; done?: boolean; points?: number };
const KEY = "missions:v1";
export async function list(): Promise<Mission[]> { return getJSON(KEY, [] as Mission[]); }
export async function saveAll(list: Mission[]) { return setJSON(KEY, list); }
export async function toggle(id: string) { const ms = await list(); const next = ms.map(m => m.id===id?{...m,done:!m.done}:m); await saveAll(next); return next; }
export async function upsert(m: Mission) { const ms = await list(); const next=[m, ...ms.filter(x=>x.id!==m.id)]; await saveAll(next); return next; }
