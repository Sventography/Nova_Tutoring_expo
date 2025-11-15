import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PurchaseMap = Record<string, true>;

type PurchasesCtx = {
  purchases: PurchaseMap;
  isOwned: (id: string) => boolean;
  grant: (id: string | string[]) => Promise<void>;
  revoke: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clearAll: () => Promise<void>; // dev helper
};

const KEY = "@nova/purchases";
const Ctx = createContext<PurchasesCtx | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = useState<PurchaseMap>({});

  // Load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") setPurchases(parsed as PurchaseMap);
        }
      } catch {}
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(purchases)).catch(() => {});
  }, [purchases]);

  const isOwned = useCallback((id: string) => !!purchases[id], [purchases]);

  const grant = useCallback(async (id: string | string[]) => {
    setPurchases(prev => {
      const next = { ...prev };
      const arr = Array.isArray(id) ? id : [id];
      for (const k of arr) if (k) next[k] = true;
      return next;
    });
  }, []);

  const revoke = useCallback(async (id: string) => {
    setPurchases(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setPurchases(parsed as PurchaseMap);
      }
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    setPurchases({});
    await AsyncStorage.setItem(KEY, JSON.stringify({}));
  }, []);

  const value = useMemo(() => ({ purchases, isOwned, grant, revoke, reload, clearAll }), [purchases, isOwned, grant, revoke, reload, clearAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePurchases() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePurchases must be used inside PurchasesProvider");
  return v;
}
