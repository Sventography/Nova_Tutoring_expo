import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type WalletAPI = {
  coins: number;
  addCoins: (n: number) => Promise<void>;
  setCoins: (n: number) => Promise<void>;
};
const WalletCtx = createContext<WalletAPI>({
  coins: 0,
  addCoins: async () => {},
  setCoins: async () => {},
});
export const useWallet = () => useContext(WalletCtx);

const KEY = "coins_balance";

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoinsState] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY);
        if (v != null) setCoinsState(Math.max(0, parseInt(v, 10) || 0));
      } catch {}
    })();
  }, []);

  const setCoins = useCallback(async (n: number) => {
    const safe = Math.max(0, Math.floor(n));
    setCoinsState(safe);
    try { await AsyncStorage.setItem(KEY, String(safe)); } catch {}
  }, []);

  const addCoins = useCallback(async (n: number) => setCoins(coins + n), [coins, setCoins]);

  return <WalletCtx.Provider value={{ coins, addCoins, setCoins }}>{children}</WalletCtx.Provider>;
}
