import React, { createContext, useContext, useEffect, useState } from "react";
import {
  addCoins,
  getCoins,
  getEquipped,
  getOwned,
  isOwned,
  own,
  setCoins,
  setEquipped,
} from "../lib/wallet";

type Ctx = {
  coins: number;
  refresh: () => Promise<void>;
  grant: (n: number) => Promise<void>;
  spend: (n: number) => Promise<boolean>;
  owned: Set<string>;
  purchase: (id: string, price: number) => Promise<boolean>;
  checkOwned: (id: string) => Promise<boolean>;
  equipped: { theme?: string; cursor?: string; avatar?: string };
  equip: (slot: "theme" | "cursor" | "avatar", id: string) => Promise<void>;
};

const WalletContext = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoinsState] = useState(0);
  const [owned, setOwnedState] = useState<Set<string>>(new Set());
  const [equipped, setEquippedState] = useState<{
    theme?: string;
    cursor?: string;
    avatar?: string;
  }>({});

  const refresh = async () => {
    setCoinsState(await getCoins());
    setOwnedState(await getOwned());
    setEquippedState(await getEquipped());
  };

  useEffect(() => {
    refresh();
  }, []);

  const grant = async (n: number) => {
    await addCoins(n);
    await refresh();
  };
  const spend = async (n: number) => {
    const cur = await getCoins();
    if (cur < n) return false;
    await setCoins(cur - n);
    await refresh();
    return true;
  };

  const purchase = async (id: string, price: number) => {
    if (await isOwned(id)) return true;
    const ok = await spend(price);
    if (!ok) return false;
    await own(id);
    await refresh();
    return true;
  };

  const checkOwned = (id: string) => isOwned(id);

  const equip = async (slot: "theme" | "cursor" | "avatar", id: string) => {
    const cur = await getEquipped();
    const next = { ...cur, [slot]: id };
    await setEquipped(next);
    await refresh();
  };

  return (
    <WalletContext.Provider
      value={{
        coins,
        refresh,
        grant,
        spend,
        owned,
        purchase,
        checkOwned,
        equipped,
        equip,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
