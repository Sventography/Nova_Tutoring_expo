import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Achievement = { id: string; title: string; coins?: number; earnedAt?: string };
type Value = { achievements: Achievement[]; earn: (a: Achievement)=>Promise<void>; refresh: ()=>Promise<void> };
const KEY="achievements:v1";
const Ctx = createContext<Value | null>(null);
async function read(): Promise<Achievement[]>{ const raw=await AsyncStorage.getItem(KEY); if(!raw) return []; try{return JSON.parse(raw) as Achievement[];}catch{return[];} }
async function write(list: Achievement[]){ await AsyncStorage.setItem(KEY, JSON.stringify(list)); }
export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const refresh = async()=> setAchievements(await read());
  const earn = async(a: Achievement)=>{ const cur=await read(); if(cur.find(x=>x.id===a.id)) return; const next=[{...a, earnedAt:new Date().toISOString()}, ...cur]; await write(next); setAchievements(next); };
  useEffect(()=>{ refresh(); },[]);
  const value = useMemo(()=>({ achievements, earn, refresh }),[achievements]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAchievements(): Value { const v=useContext(Ctx); if(!v) throw new Error("useAchievements must be inside AchievementsProvider"); return v; }
export default Ctx;
