import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@nova/coins";
type Ctx = {
  coins: number;
  setCoins: (n: number) => void;
  addCoins: (delta: number) => void;
  reload: () => Promise<void>;
};
const CoinsCtx = createContext<Ctx | null>(null);

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, _setCoins] = useState<number>(100);
  const loadingRef = useRef(false);
  // Load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw != null && !Number.isNaN(+raw)) _setCoins(Math.max(0, Math.floor(+raw)));
      } catch {}
    })();
  }, []);
  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(KEY, String(coins)).catch(() => {});
  }, [coins]);

  const setCoins = useCallback((n: number) => {
    _setCoins(Math.max(0, Math.floor(n)));
  }, []);
  const addCoins = useCallback((delta: number) => {
    _setCoins((c) => Math.max(0, Math.floor(c + delta)));
  }, []);
  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw != null && !Number.isNaN(+raw)) _setCoins(Math.max(0, Math.floor(+raw)));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const value = useMemo(() => ({ coins, setCoins, addCoins, reload }), [coins, setCoins, addCoins, reload]);
  return <CoinsCtx.Provider value={value}>{children}</CoinsCtx.Provider>;
}

export function useCoins() {
  const v = useContext(CoinsCtx);
  if (!v) throw new Error("useCoins must be used inside CoinsProvider");
  return v;
}
