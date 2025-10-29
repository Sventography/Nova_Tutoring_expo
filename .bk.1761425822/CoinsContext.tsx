import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COINS_KEY = "@nova/coins"; // <-- THE ONLY KEY we use

type CoinsCtx = {
  coins: number;
  add: (n: number, meta?: string) => Promise<void>;
  spend: (n: number, meta?: string) => Promise<void>;
  set: (n: number, meta?: string) => Promise<void>;
};

const CoinsContext = createContext<CoinsCtx | null>(null);

async function readCoins(): Promise<number> {
  const v = await AsyncStorage.getItem(COINS_KEY);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}
async function writeCoins(n: number) {
  await AsyncStorage.setItem(COINS_KEY, String(n));
}

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState<number>(0);
  const hydrated = useRef(false);
  const writing = useRef<Promise<any> | null>(null);

  // hydrate once
  useEffect(() => {
    let alive = true;
    (async () => {
      const n = await readCoins();
      if (alive) {
        setCoins(n);
        hydrated.current = true;
      }
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback(async (n: number) => {
    setCoins(n);
    // queue last write (avoid races)
    writing.current = writeCoins(n);
    await writing.current;
  }, []);

  const add = useCallback(async (n: number) => {
    if (!Number.isFinite(n) || n === 0) return;
    const next = (hydrated.current ? coins : 0) + n;
    await persist(Math.max(0, next));
  }, [coins, persist]);

  const spend = useCallback(async (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    const next = (hydrated.current ? coins : 0) - n;
    await persist(Math.max(0, next));
  }, [coins, persist]);

  const set = useCallback(async (n: number) => {
    const next = Number.isFinite(n) ? n : 0;
    await persist(Math.max(0, next));
  }, [persist]);

  const value: CoinsCtx = { coins, add, spend, set };

  return <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>;
}

export function useCoins() {
  const ctx = useContext(CoinsContext);
  if (!ctx) throw new Error("useCoins must be used inside <CoinsProvider>");
  return ctx;
}
