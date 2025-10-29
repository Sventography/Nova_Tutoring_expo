import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "inventory:v1";
type MapNum = Record<string, number>;
async function read(): Promise<MapNum> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as MapNum; } catch { return {}; }
}
async function write(m: MapNum) { await AsyncStorage.setItem(KEY, JSON.stringify(m)); }
export async function getInventoryCount(sku: string): Promise<number> {
  const m = await read(); return Math.max(0, Math.floor(m[sku] || 0));
}
export async function setInventoryCount(sku: string, n: number): Promise<number> {
  const m = await read(); const v = Math.max(0, Math.floor(n||0)); m[sku]=v; await write(m); return v;
}
export default { getInventoryCount, setInventoryCount };
