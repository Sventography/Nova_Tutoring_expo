import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Certificate = { id: string; title: string; issuedBy?: string; issuedAt?: string; badgeUrl?: string };
type Value = { certificates: Certificate[]; add: (c: Certificate)=>Promise<void>; remove: (id: string)=>Promise<void>; refresh: ()=>Promise<void> };
const KEY="certificates:v1";
const Ctx = createContext<Value | null>(null);
async function read(): Promise<Certificate[]>{ const raw=await AsyncStorage.getItem(KEY); if(!raw) return []; try{return JSON.parse(raw) as Certificate[];}catch{return[];} }
async function write(list: Certificate[]){ await AsyncStorage.setItem(KEY, JSON.stringify(list)); }
export function CertificatesProvider({ children }: { children: React.ReactNode }) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const refresh = async()=> setCertificates(await read());
  const add = async(c: Certificate)=>{ const cur=await read(); const next=[c, ...cur.filter(x=>x.id!==c.id)]; await write(next); setCertificates(next); };
  const remove = async(id: string)=>{ const cur=await read(); const next=cur.filter(x=>x.id!==id); await write(next); setCertificates(next); };
  useEffect(()=>{ refresh(); },[]);
  const value = useMemo(()=>({ certificates, add, remove, refresh }),[certificates]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCertificates(): Value { const v=useContext(Ctx); if(!v) throw new Error("useCertificates must be inside CertificatesProvider"); return v; }
export default Ctx;
