// app/utils/coins-autoboot.ts
import { Platform } from "react-native";

// IMPORTANT:
// Do not import AsyncStorage at the top level.
// Web bundling runs in Node where "window" is undefined, and AsyncStorage's web impl touches window.

export async function coinsAutoBoot() {
  // Only run on the client (browser) or native runtime
  if (Platform.OS === "web" && typeof window === "undefined") return;

  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");

    const KEY = "@nova/coins.v1";
    const origSetItem = AsyncStorage.setItem.bind(AsyncStorage);

    // Patch setItem to also mirror coin-ish writes to the canonical key
    // (runs only after runtime starts, never during bundling)
    // @ts-ignore
    AsyncStorage.setItem = async (k: string, v: string) => {
      const r = await origSetItem(k, v);
      if (k && typeof k === "string" && k.toLowerCase().includes("coin")) {
        try { await origSetItem(KEY, v); } catch {}
      }
      return r;
    };

    // On boot, attempt to migrate the first coin-ish key we find into KEY
    try {
      const keys = await AsyncStorage.getAllKeys();
      const coinKeys = (keys || []).filter(k => k && String(k).toLowerCase().includes("coin"));
      if (coinKeys.length === 0) return;

      const pairs = await AsyncStorage.multiGet(coinKeys);
      const first = (pairs || []).find(p => p && p[1] != null);
      if (!first) return;

      const v = String(first[1]);
      if (v != null) await origSetItem(KEY, v);
    } catch {}
  } catch (e) {
    // keep this silent in prod
    try { console.warn("coinsAutoBoot failed", e); } catch {}
  }
}
