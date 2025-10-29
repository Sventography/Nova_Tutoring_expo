// app/context/CoinsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "coins_balance";

type Ctx = {
  coins: number;
  add: (delta: number) => Promise<void>;
  set: (value: number) => Promise<void>;
};

const CoinsContext = createContext<Ctx | null>(null);

// --- internal ref so non-React code (e.g., helpers) can update coins ---
const coinsApiRef: { current: Ctx | null } = { current: null };

// --- public helpers (usable anywhere) ---
export async function addCoins(delta: number) {
  if (!delta) return;
  if (coinsApiRef.current) return coinsApiRef.current.add(delta);
  // if provider not mounted yet, persist and let provider hydrate it in
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const prev = raw ? Number(raw) : 0;
  const next = prev + delta;
  await AsyncStorage.setItem(STORAGE_KEY, String(next));
}

export async function setCoins(value: number) {
  if (coinsApiRef.current) return coinsApiRef.current.set(value);
  await AsyncStorage.setItem(STORAGE_KEY, String(value));
}

export function useCoins() {
  const ctx = useContext(CoinsContext);
  if (!ctx) throw new Error("useCoins must be used inside <CoinsProvider>");
  return ctx;
}

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, _setCoins] = useState<number>(0);
  const ready = useRef(false);

  // hydrate from storage once
  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem(STORAGE_KEY);
      _setCoins(s ? Number(s) : 0);
      ready.current = true;
    })();
  }, []);

  const persist = async (value: number) => {
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
  };

  const api = useMemo<Ctx>(() => ({
    coins,
    add: async (delta: number) => {
      if (!delta) return;
      _setCoins((prev) => {
        const next = prev + delta;
        // fire-and-forget persist
        persist(next);
        return next;
      });
    },
    set: async (value: number) => {
      _setCoins(value);
      await persist(value);
    },
  }), [coins]);

  // expose to helpers
  useEffect(() => {
    coinsApiRef.current = api;
    return () => { if (coinsApiRef.current === api) coinsApiRef.current = null; };
  }, [api]);

  return <CoinsContext.Provider value={api}>{children}</CoinsContext.Provider>;
}
