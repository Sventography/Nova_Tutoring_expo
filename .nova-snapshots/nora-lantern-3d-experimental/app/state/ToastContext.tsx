import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
type Toast = { id: string; title?: string; message?: string; type?: "success"|"error"|"info"; };
type Value = { toasts: Toast[]; show: (t: Omit<Toast,"id">)=>void; remove: (id: string)=>void; };
const Ctx = createContext<Value | null>(null);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = (t: Omit<Toast,"id">)=> setToasts(x=>[{ id: "t_"+Date.now(), ...t }, ...x]);
  const remove = (id: string)=> setToasts(x=>x.filter(t=>t.id!==id));
  const value = useMemo(()=>({ toasts, show, remove }),[toasts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useToast(): Value { const v = useContext(Ctx); if(!v) throw new Error("useToast must be inside ToastProvider"); return v; }
export default Ctx;
