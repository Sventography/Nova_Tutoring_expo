import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * DEV ONLY helper.
 * IMPORTANT:
 * - Never touch AsyncStorage at import-time (breaks web bundling)
 * - Web: no-op (AsyncStorage web adapter can crash during bundling)
 */

const KEY = "wallet.coins.v1";

export async function grantCoins(amount: number = 5000) {
  // Only in dev, and never on web
  if (!__DEV__) return;
  if (Platform.OS === "web") return;

  try {
    const raw = await AsyncStorage.getItem(KEY);
    const cur = raw ? Number(raw) : 0;
    const next = (Number.isFinite(cur) ? cur : 0) + amount;
    await AsyncStorage.setItem(KEY, String(next));
    console.log(`[devCoins] granted +${amount}, total=${next}`);
  } catch (e) {
    console.warn("[devCoins] grantCoins failed", e);
  }
}

/**
 * Optional helper if you want to call it from somewhere.
 */
export async function seedDevCoinsOnce() {
  if (!__DEV__) return;
  if (Platform.OS === "web") return;

  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) {
      await AsyncStorage.setItem(KEY, "25000");
      console.log("[devCoins] seeded 25000 coins");
    }
  } catch (e) {
    console.warn("[devCoins] seedDevCoinsOnce failed", e);
  }
}
