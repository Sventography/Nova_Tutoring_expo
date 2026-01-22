import AsyncStorage from "@react-native-async-storage/async-storage";
const PURCHASES_KEY = "@nova/purchases";
type PurchaseMap = Record<string, true>;
export async function migratePurchasesToMap() {
  const raw = (await AsyncStorage.getItem(PURCHASES_KEY)) ?? "{}";
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  if (Array.isArray(parsed)) {
    const map: PurchaseMap = {};
    for (const id of parsed) map[String(id)] = true;
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(map));
    return { migrated: true, count: parsed.length };
  }
  return { migrated: false, count: Object.keys(parsed || {}).length };
}
