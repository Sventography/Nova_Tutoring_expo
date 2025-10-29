import React, { createContext, useCallback, useMemo, useState, useContext } from "react";

type CoinsCtx = {
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => void;
};

export const CoinsContext = createContext<CoinsCtx>({
  coins: 0,
  addCoins: () => {},
  spendCoins: () => {},
});

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState<number>(5000); // start balance shown in your screenshot

  const addCoins = useCallback((amount: number) => {
    setCoins((c) => Math.max(0, c + Math.max(0, Math.trunc(amount))));
  }, []);

  const spendCoins = useCallback((amount: number) => {
    setCoins((c) => Math.max(0, c - Math.max(0, Math.trunc(amount))));
  }, []);

  const value = useMemo(() => ({ coins, addCoins, spendCoins }), [coins, addCoins, spendCoins]);

  return <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>;
}

// Optional hook
export const useCoins = () => useContext(CoinsContext);
