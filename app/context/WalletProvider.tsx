import React from "react";

type Wallet = { coins: number; add: (n: number) => void; spend: (n: number) => void };
export const WalletContext = React.createContext<Wallet>({ coins: 0, add: () => {}, spend: () => {} });

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = React.useState(0);
  const add = (n: number) => setCoins((c) => c + n);
  const spend = (n: number) => setCoins((c) => Math.max(0, c - n));
  return <WalletContext.Provider value={{ coins, add, spend }}>{children}</WalletContext.Provider>;
}

export const useWallet = () => React.useContext(WalletContext);
