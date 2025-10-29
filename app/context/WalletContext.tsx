import React from "react";
export const WalletContext = React.createContext({});
export const WalletProvider: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;
export default WalletProvider;
