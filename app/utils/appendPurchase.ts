// app/utils/appendPurchase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const PURCHASES_KEY = "@nova/purchases";
type PurchaseMap = Record<string, true>;

function toArray(input: any): string[] {
  if (Array.isArray(input)) return input.slice();
  if (input && typeof input === "object") return Object.keys(input);
  return [];
}
function toMap(arr: string[]): PurchaseMap {
  const m: PurchaseMap = {};
  for (const id of arr) m[id] = true;
  return m;
}

export async function safeAppendPurchase(id: string): Promise<string[]> {
  try {
    const raw = (await AsyncStorage.getItem(PURCHASES_KEY)) || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const arr = toArray(parsed);
    const filtered = arr.filter((x) => x !== id);
    filtered.unshift(id);
    const map = toMap(filtered);
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(map));
    return filtered;
  } catch {
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify({ [id]: true }));
    return [id];
  }
}
