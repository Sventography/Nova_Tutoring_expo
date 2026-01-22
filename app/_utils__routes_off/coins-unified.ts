import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "@nova/coins.v1";

export async function getCoinsUnified(): Promise<number> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? parseInt(raw, 10) : 0; } catch { return 0; }
}

export async function setCoinsUnified(n: number) {
  const v = Math.max(0, Math.floor(n || 0));
  await AsyncStorage.setItem(KEY, String(v));
}

export async function addCoinsUnified(delta: number) {
  const cur = await getCoinsUnified();
  await setCoinsUnified(cur + (delta || 0));
}

export async function spendCoinsUnified(amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const cur = await getCoinsUnified();
  if (cur < amount) return false;
  await setCoinsUnified(cur - amount);
  return true;
}
