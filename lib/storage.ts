import AsyncStorage from "@react-native-async-storage/async-storage";

export async function get(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

export async function set(key: string, value: string): Promise<boolean> {
  try { await AsyncStorage.setItem(key, value); return true; } catch { return false; }
}

export async function del(key: string): Promise<boolean> {
  try { await AsyncStorage.removeItem(key); return true; } catch { return false; }
}

export async function getJSON<T=any>(key: string): Promise<T | null> {
  const raw = await get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setJSON(key: string, data: any): Promise<boolean> {
  try { return await set(key, JSON.stringify(data)); } catch { return false; }
}

export async function keys(): Promise<string[]> {
  try { return await AsyncStorage.getAllKeys(); } catch { return []; }
}

export default { get, set, del, getJSON, setJSON, keys };
