import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Wallet = { coins: number };
type Ctx = {
  wallet: Wallet;
  add: (n: number) => void;
  spend: (n: number) => boolean;
  refresh: () => void;
};

const C = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState<number>(0);

  const add = useCallback((n: number) => setCoins((c) => Math.max(0, c + (Number(n) || 0))), []);
  const spend = useCallback((n: number) => {
    const v = Number(n) || 0;
    let ok = false;
    setCoins((c) => {
      ok = c >= v;
      return ok ? c - v : c;
    });
    return ok;
  }, []);
  const refresh = useCallback(() => setCoins((c) => c), []);

  const value = useMemo<Ctx>(() => ({ wallet: { coins }, add, spend, refresh }), [coins, add, spend, refresh]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useWallet(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
