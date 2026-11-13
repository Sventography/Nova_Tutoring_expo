import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isSSR = typeof window === "undefined";

export async function grantCoins(amount: number) {
  if (Platform.OS === "web" || isSSR) return;
  try {
    const raw = await AsyncStorage.getItem("@nova/coins");
    const cur = raw ? Number(raw) : 0;
    const next = cur + Number(amount || 0);
    await AsyncStorage.setItem("@nova/coins", String(next));
  } catch {}
}

// no default export needed
