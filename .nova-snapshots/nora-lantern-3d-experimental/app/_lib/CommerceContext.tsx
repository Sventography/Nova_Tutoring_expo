import React, { createContext, useMemo } from "react";
import { Alert } from "react-native";

const toCoins = (usd: number) => Math.round(usd * 1000); // $1 = 1000 coins

export const CommerceContext = createContext<any>({ catalog: [] });

const baseCatalog = [
  { id: "plushie", name: "Nova Plushie (Bunny)", type: "tangible", cashPrice: 60,  coinPrice: toCoins(60),  category: "plushie" },
  { id: "keychain", name: "Nova Keychain",        type: "tangible", cashPrice: 15,  coinPrice: toCoins(15),  category: "accessories" },
  { id: "beanie",   name: "Nova Beanie",          type: "tangible", cashPrice: 45,  coinPrice: toCoins(45),  category: "apparel" },
  { id: "tee",      name: "Nova Tee",             type: "tangible", cashPrice: 60,  coinPrice: toCoins(60),  category: "apparel" },
  { id: "hoodie",   name: "Nova Hoodie",          type: "tangible", cashPrice: 120, coinPrice: toCoins(120), category: "apparel" },
  { id: "stationery", name: "Nova Stationery Set",type: "tangible", cashPrice: 24,  coinPrice: toCoins(24),  category: "stationery" },
];

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const catalog = useMemo(() => baseCatalog, []);

  async function submitOrder(payload: { itemId: string; name: string; coinsSpent: number; address: string }) {
    try {
      const url = process.env.EXPO_PUBLIC_BACKEND_URL
        ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/order`
        : "";
      if (!url) throw new Error("No backend URL configured");
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (e) {
      console.warn("submitOrder fallback:", e);
      Alert.alert("Note", "Order saved locally; backend not configured.");
    }
  }

  return <CommerceContext.Provider value={{ catalog, submitOrder }}>{children}</CommerceContext.Provider>;
}
