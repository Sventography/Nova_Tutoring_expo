import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "coins:balance:v1";

export async function getBalance(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export async function setBalance(n: number): Promise<number> {
  const val = Math.max(0, Math.floor(n || 0));
  await AsyncStorage.setItem(KEY, String(val));
  return val;
}

export async function addCoins(delta: number): Promise<number> {
  const cur = await getBalance();
  return setBalance(cur + Math.max(0, Math.floor(delta || 0)));
}

export async function spendCoins(cost: number): Promise<{ ok: boolean; balance: number }> {
  const cur = await getBalance();
  const c = Math.max(0, Math.floor(cost || 0));
  if (cur < c) return { ok: false, balance: cur };
  const next = await setBalance(cur - c);
  return { ok: true, balance: next };
}

export async function resetCoins(): Promise<number> {
  await AsyncStorage.removeItem(KEY);
  return 0;
}

const coins = { getBalance, setBalance, addCoins, spendCoins, resetCoins };
export default coins;
