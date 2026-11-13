import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nova/coins.v1";
const origSetItem = AsyncStorage.setItem.bind(AsyncStorage);

AsyncStorage.setItem = async (k: string, v: string) => {
  const r = await origSetItem(k, v);
  if (k && typeof k === "string" && k.toLowerCase().includes("coin")) {
    try { await origSetItem(KEY, v); } catch {}
  }
  return r;
};

(async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const coinKeys = (keys || []).filter(k => k && k.toLowerCase().includes("coin"));
    if (coinKeys.length === 0) return;
    const pairs = await AsyncStorage.multiGet(coinKeys);
    const first = pairs.find(p => p && p[1] != null);
    if (!first) return;
    const v = first[1] as string;
    if (v != null) await AsyncStorage.setItem(KEY, v);
  } catch {}
})();
