import React, { createContext, useContext, useState, useMemo } from "react";

type AppState = {
  coins: number; addCoins: (n: number) => void;
  username: string; setUsername: (n: string) => void;
  askedCount: number; incAsked: () => void; resetAsked: () => void;
};
const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(100);
  const [username, setUsername] = useState("Nova");
  const [askedCount, setAsked] = useState(0);
  const value = useMemo<AppState>(() => ({
    coins, addCoins: (n)=>setCoins(c=>c+n),
    username, setUsername,
    askedCount, incAsked: ()=>setAsked(c=>c+1), resetAsked: ()=>setAsked(0),
  }), [coins, username, askedCount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAppState = () => {
  const v = useContext(Ctx); if (!v) throw new Error("AppStateProvider missing");
  return v;
};
