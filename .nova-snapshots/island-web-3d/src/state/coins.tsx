import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CoinsContextType = {
  coins: number;
  ready: boolean;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  setCoins: (amount: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CoinsContext = createContext<CoinsContextType | null>(null);
const KEY = "nova.coins.balance.v1";

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoinsState] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const val = raw ? parseInt(raw, 10) : 0;
      setCoinsState(Number.isFinite(val) ? val : 0);
      setReady(true);
    } catch {
      setCoinsState(0);
      setReady(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const persist = async (val: number) => {
    setCoinsState(val);
    await AsyncStorage.setItem(KEY, String(val));
  };

  const api = useMemo<CoinsContextType>(
    () => ({
      coins,
      ready,
      addCoins: async (amount: number) => {
        const next = Math.max(0, coins + amount);
        await persist(next);
      },
      spendCoins: async (amount: number) => {
        if (coins < amount) return false;
        const next = coins - amount;
        await persist(next);
        return true;
      },
      setCoins: async (amount: number) => {
        await persist(Math.max(0, amount));
      },
      refresh: load,
    }),
    [coins, ready],
  );

  return <CoinsContext.Provider value={api}>{children}</CoinsContext.Provider>;
}

export function useCoins() {
  const ctx = useContext(CoinsContext);
  if (!ctx) throw new Error("useCoins must be used inside <CoinsProvider>");
  return ctx;
}
