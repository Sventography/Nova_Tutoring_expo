import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "@/state/wallet";

/** Minimal fetch wrapper returning {ok, json, text} */
async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, json, text };
}

/** Resolve backend like checkout.ts (copy of the safe bit) */
function getBackend(): string {
  const env = (process?.env?.EXPO_PUBLIC_BACKEND_URL as string) || "";
  if (env) return env.replace(/\/+$/g, "");
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const h = window.location.hostname;
    const isLan = /^\d+\.\d+\.\d+\.\d+$/.test(h) || /^(localhost|127\.0\.0\.1)$/i.test(h);
    const host = isLan ? h : "127.0.0.1";
    return `http://${host}:8788`;
  }
  const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  return `http://${host}:8788`;
}

/**
 * Buy an item with coins (optimistic):
 * - Deduct locally so Header + Shop update immediately
 * - Call backend to persist
 * - Roll back if server says no
 */
export async function buyWithCoins(params: {
  itemId: string;
  title?: string;
  priceUSD?: number;   // optional if you keep USD around
  priceCoins?: number; // preferred exact coin cost
  meta?: Record<string, any>;
}) {
  const { itemId, title, priceCoins, priceUSD, meta } = params;
  const wallet = useWallet.getState();
  const cost = typeof priceCoins === "number" ? priceCoins :
               typeof priceUSD === "number" ? Math.round(priceUSD * 1000) : 0;

  if (cost <= 0) {
    Alert.alert("Purchase failed", "Missing or invalid coin price.");
    return { ok: false, error: "invalid_price" };
  }
  if (wallet.coins < cost) {
    Alert.alert("Not enough coins", "Earn or buy more to get this item.");
    return { ok: false, error: "insufficient_funds" };
  }

  // Optimistic update
  const before = wallet.coins;
  wallet.setPending(true);
  wallet.spendLocal(cost);

  const BACKEND = getBackend();
  const { ok, json, text } = await postJSON(`${BACKEND}/wallet/spend`, {
    itemId,
    amount: cost,
    meta,
  }).catch((e) => ({ ok: false, json: null, text: String(e) }));

  wallet.setPending(false);

  if (!ok || json?.ok === false) {
    // Roll back
    useWallet.getState().addCoins(cost);
    const msg = json?.error || text || "Unknown error";
    Alert.alert("Purchase failed", msg);
    return { ok: false, error: msg };
  }

  // If server returns authoritative balance, sync to it
  const newBal = typeof json?.balance === "number" ? json.balance : null;
  if (typeof newBal === "number") {
    useWallet.getState().setCoins(newBal);
  }

  // Success UX
  Alert.alert("Purchased!", title ? `${title} unlocked.` : "Checkout complete.");
  return { ok: true, balance: newBal ?? useWallet.getState().coins };
}
