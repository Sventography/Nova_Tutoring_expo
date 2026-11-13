import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Settings = { theme?: "light"|"dark"; haptics?: boolean; sound?: boolean };
type Value = { settings: Settings; setSetting: <K extends keyof Settings>(k: K, v: Settings[K])=>Promise<void>; refresh: ()=>Promise<void> };
const KEY="settings:v1";
const Ctx = createContext<Value | null>(null);
async function read(): Promise<Settings>{ const raw=await AsyncStorage.getItem(KEY); if(!raw) return {}; try{return JSON.parse(raw) as Settings;}catch{return{};} }
async function write(s: Settings){ await AsyncStorage.setItem(KEY, JSON.stringify(s)); }
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const refresh = async()=> setSettings(await read());
  const setSetting = async(k: keyof Settings, v: any)=>{ const cur=await read(); const next={...cur, [k]: v}; await write(next); setSettings(next); };
  useEffect(()=>{ refresh(); },[]);
  const value = useMemo(()=>({ settings, setSetting, refresh }),[settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useSettings(): Value { const v=useContext(Ctx); if(!v) throw new Error("useSettings must be inside SettingsProvider"); return v; }
export default Ctx;
