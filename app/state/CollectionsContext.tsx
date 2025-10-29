import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Collection = { id: string; name: string; createdAt: string; items: string[] };
type Value = {
  collections: Collection[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  toggleItem: (collectionId: string, itemId: string) => Promise<void>;
};
const KEY = "collections:v1";
const Ctx = createContext<Value | null>(null);
async function read(): Promise<Collection[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return []; try { return JSON.parse(raw) as Collection[]; } catch { return []; }
}
async function write(list: Collection[]) { await AsyncStorage.setItem(KEY, JSON.stringify(list)); }
export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refresh = async () => { setIsLoading(true); try { setCollections(await read()); } finally { setIsLoading(false); } };
  const createCollection = async (name: string) => { const c: Collection = { id: "col_"+Date.now(), name, createdAt: new Date().toISOString(), items: [] }; const next=[c,...collections]; setCollections(next); await write(next); };
  const renameCollection = async (id: string, name: string) => { const next=collections.map(c=>c.id===id?{...c,name}:c); setCollections(next); await write(next); };
  const removeCollection = async (id: string) => { const next=collections.filter(c=>c.id!==id); setCollections(next); await write(next); };
  const toggleItem = async (collectionId: string, itemId: string) => {
    const next = collections.map(c => c.id!==collectionId?c: (c.items.includes(itemId)?{...c,items:c.items.filter(i=>i!==itemId)}:{...c,items:[itemId,...c.items]}));
    setCollections(next); await write(next);
  };
  useEffect(()=>{ refresh(); },[]);
  const value = useMemo(()=>({ collections,isLoading,refresh,createCollection,renameCollection,removeCollection,toggleItem }),[collections,isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCollections(): Value { const v = useContext(Ctx); if(!v) throw new Error("useCollections must be inside CollectionsProvider"); return v; }
export default Ctx;
