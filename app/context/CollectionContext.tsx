// app/context/CollectionContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listCollections,
  addToCollections as addItem,
  removeCollection as removeItem,
  clearCollections as clearAll,
  type CollectionItem
} from "@/lib/collections";

export type CollectionContextValue = {
  collections: CollectionItem[];
  refresh: () => Promise<void>;
  add: (c: { id: string; front: string; back: string; topic?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CollectionContext = createContext<CollectionContextValue | undefined>(undefined);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);

  const refresh = async () => {
    try {
      const items = await listCollections();
      setCollections(items);
    } catch {
      setCollections([]);
    }
  };

  const add = async (c: { id: string; front: string; back: string; topic?: string }) => {
    await addItem(c);
    await refresh();
  };

  const remove = async (id: string) => {
    await removeItem(id);
    await refresh();
  };

  const clear = async () => {
    await clearAll();
    await refresh();
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ collections, refresh, add, remove, clear }), [collections]);
  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollections() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollections must be used within CollectionProvider");
  return ctx;
}

