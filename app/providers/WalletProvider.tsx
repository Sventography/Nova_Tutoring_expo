import React, { createContext, useContext, useState } from "react";

type WalletState = {
  address?: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletCtx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    // TODO: integrate real wallet; placeholder just sets a mock address
    setAddress("0xDEADBEEF...NOVA");
  };

  const disconnect = () => setAddress(null);

  return (
    <WalletCtx.Provider value={{ address, connect, disconnect }}>
      {children}
    </WalletCtx.Provider>
  );
}

export const useWallet = () => {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
