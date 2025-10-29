import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const TZ = "America/New_York";
const META = "@nova/streak.meta"; // { count:number,last:string|null }
const LOGS = "@nova/streak.logs"; // { [yyyy-mm-dd]: true }
type State = { loaded: boolean; count: number; todayChecked: boolean; lastDate: string|null; markToday: () => Promise<void> };
const C = createContext<State | null>(null);
const key = (d=new Date()) => new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const dDays = (a:string,b:string)=> Math.round((+new Date(`${b}T00:00:00-04:00`)-+new Date(`${a}T00:00:00-04:00`))/86400000);

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const [loaded,setLoaded]=useState(false);
  const [count,setCount]=useState(0);
  const [last,setLast]=useState<string|null>(null);
  const [todayChecked,setTodayChecked]=useState(false);

  useEffect(() => { (async () => {
    try{
      const [m,l] = await Promise.all([AsyncStorage.getItem(META), AsyncStorage.getItem(LOGS)]);
      const meta = m? JSON.parse(m): {count:0,last:null};
      const logs = l? JSON.parse(l): {};
      const today = key();
      setCount(meta.count||0);
      setLast(meta.last||null);
      setTodayChecked(!!logs[today]);
    } finally { setLoaded(true); }
  })(); }, []);

  const markToday = useCallback(async ()=>{
    const [m,l]= await Promise.all([AsyncStorage.getItem(META), AsyncStorage.getItem(LOGS)]);
    const meta = m? JSON.parse(m): {count:0,last:null};
    const logs = l? JSON.parse(l): {};
    const today = key();
    if (logs[today]) return;
    let next = meta.last ? (dDays(meta.last, today)===1 ? (meta.count||0)+1 : (dDays(meta.last, today)<=0 ? (meta.count||1) : 1)) : 1;
    const newMeta = { count: next, last: today };
    const newLogs = { ...logs, [today]: true };
    await Promise.all([AsyncStorage.setItem(META, JSON.stringify(newMeta)), AsyncStorage.setItem(LOGS, JSON.stringify(newLogs))]);
    setCount(next); setLast(today); setTodayChecked(true);
  },[]);

  const v = useMemo(()=>({ loaded, count, todayChecked, lastDate:last, markToday }),[loaded,count,todayChecked,last,markToday]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useStreak(){ const v = useContext(C); if(!v) throw new Error("useStreak must be used inside StreakProvider"); return v; }
