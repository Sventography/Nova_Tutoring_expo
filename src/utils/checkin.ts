import { getJSON, setJSON } from "../_lib/storage";
export type CheckIn = { date: string };
const KEY = "checkins:v1";
export async function all(): Promise<CheckIn[]> { return getJSON(KEY, [] as CheckIn[]); }
export async function add(dateISO: string) { const list = await all(); const next=[{date:dateISO}, ...list.filter(c=>c.date!==dateISO)]; await setJSON(KEY,next); return next; }
export async function since(dateISO: string) { const list = await all(); return list.filter(c => c.date >= dateISO); }
