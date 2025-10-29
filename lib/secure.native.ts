import * as SecureStore from "expo-secure-store";

export async function get(key: string) {
  return await SecureStore.getItemAsync(key);
}

export async function set(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function remove(key: string) {
  await SecureStore.deleteItemAsync(key);
}

export async function getJSON<T=any>(key: string, fallback?: T) {
  const v = await get(key);
  if (!v) return fallback as T;
  try { return JSON.parse(v) as T; } catch { return fallback as T; }
}

export async function setJSON(key: string, value: any) {
  await set(key, JSON.stringify(value));
}
