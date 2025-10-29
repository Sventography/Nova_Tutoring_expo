import AsyncStorage from "@react-native-async-storage/async-storage";

export async function get(key: string) {
  return await AsyncStorage.getItem(key);
}

export async function set(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
}

export async function remove(key: string) {
  await AsyncStorage.removeItem(key);
}

export async function getJSON<T=any>(key: string, fallback?: T) {
  const v = await get(key);
  if (!v) return fallback as T;
  try { return JSON.parse(v) as T; } catch { return fallback as T; }
}

export async function setJSON(key: string, value: any) {
  await set(key, JSON.stringify(value));
}
