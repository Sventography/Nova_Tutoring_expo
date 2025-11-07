import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_V2 = "coins.balance.v2";
const LEGACY_KEYS = ["@nova/coins", "@nova/coins.v1", "coins.balance", "coins.balance.v1"];

type CoinsContextType = {
  coins: number;
  setCoins: (value: number | ((prev: number) => number)) => void;
  addCoins: (delta: number) => void;
  spendCoins: (amount: number) => boolean;
  reload: () => Promise<void>;
};

const CoinsCtx = createContext<CoinsContextType | null>(null);

async function readInitialCoins(): Promise<number> {
  // Try v2 first
  const v2 = await AsyncStorage.getItem(KEY_V2);
  if (v2 != null) {
    const n = Number(v2);
    return Number.isFinite(n) ? n : 0;
  }
  // Fallback to legacy keys
  for (const k of LEGACY_KEYS) {
    const val = await AsyncStorage.getItem(k);
    if (val != null) {
      const n = Number(val);
      const safe = Number.isFinite(n) ? n : 0;
      await AsyncStorage.setItem(KEY_V2, String(safe));
      return safe;
    }
  }
  return 0;
}

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, _setCoins] = useState<number>(0);
  const loadingRef = useRef(false);

  // Load once
  useEffect(() => {
    (async () => {
      const n = await readInitialCoins();
      _setCoins(n);
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(KEY_V2, String(coins)).catch(() => {});
  }, [coins]);

  const setCoins = useCallback(
    (value: number | ((prev: number) => number)) => {
      _setCoins(prev => {
        const next = typeof value === "function" ? (value as (p: number) => number)(prev) : value;
        const safe = Math.max(0, Math.floor(next || 0));
        AsyncStorage.setItem(KEY_V2, String(safe)).catch(() => {});
        return safe;
      });
    },
    []
  );

  const addCoins = useCallback((delta: number) => {
    if (!Number.isFinite(delta)) return;
    _setCoins(prev => {
      const next = Math.max(0, Math.floor(prev + delta));
      AsyncStorage.setItem(KEY_V2, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const spendCoins = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    let success = false;
    _setCoins(prev => {
      if (prev < amount) return prev;
      const next = prev - amount;
      success = true;
      AsyncStorage.setItem(KEY_V2, String(next)).catch(() => {});
      return next;
    });
    return success;
  }, []);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(KEY_V2);
      const n = Number(raw);
      _setCoins(Number.isFinite(n) ? n : 0);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ coins, setCoins, addCoins, spendCoins, reload }),
    [coins, setCoins, addCoins, spendCoins, reload]
  );

  return <CoinsCtx.Provider value={value}>{children}</CoinsCtx.Provider>;
}

export function useCoins() {
  const ctx = useContext(CoinsCtx);
  if (!ctx) throw new Error("useCoins must be used inside CoinsProvider");
  return ctx;
}
