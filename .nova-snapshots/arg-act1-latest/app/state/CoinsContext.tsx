import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "coins:balance:v1";
type Value = { balance: number; add: (n: number)=>Promise<void>; spend: (n: number)=>Promise<boolean>; reset: ()=>Promise<void>; refresh: ()=>Promise<void> };
const Ctx = createContext<Value | null>(null);
async function read(): Promise<number> { const raw = await AsyncStorage.getItem(KEY); const n = Number(raw); return Number.isFinite(n)?n:0; }
async function write(n: number){ await AsyncStorage.setItem(KEY, String(Math.max(0, Math.floor(n||0)))); }
export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const refresh = async()=> setBalance(await read());
  const add = async(n:number)=>{ const cur=await read(); const next=cur+Math.max(0,Math.floor(n||0)); await write(next); setBalance(next); };
  const spend = async(n:number)=>{ const cur=await read(); const cost=Math.max(0,Math.floor(n||0)); if(cur<cost){ setBalance(cur); return false; } const next=cur-cost; await write(next); setBalance(next); return true; };
  const reset = async()=>{ await AsyncStorage.removeItem(KEY); setBalance(0); };
  useEffect(()=>{ refresh(); },[]);
  const value = useMemo(()=>({ balance, add, spend, reset, refresh }),[balance]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCoins(): Value { const v = useContext(Ctx); if(!v) throw new Error("useCoins must be inside CoinsProvider"); return v; }
export default Ctx;
