// app/context/WalletContext.tsx
import React from "react";
import {
  WalletProvider as InnerWalletProvider,
  useWallet,
} from "../providers/WalletProvider";

// This is only kept so older imports like "@/context/WalletContext"
// or the safe provider loader keep working.
export const WalletContext = React.createContext({});

export const WalletProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => <InnerWalletProvider>{children}</InnerWalletProvider>;

export { useWallet };

export default WalletProvider;
