import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Ctx = { enabled: boolean; toggle: () => void; setEnabled: (v: boolean) => void };
const C = createContext<Ctx | null>(null);
const KEY = "@fx/enabled";

export function useFx() {
  return (useContext(C) as Ctx) || { enabled: false, toggle: () => {}, setEnabled: () => {} };
}

export function FxProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem(KEY); if (v != null) setEnabled(v === "1"); } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => { try { await AsyncStorage.setItem(KEY, enabled ? "1" : "0"); } catch {} })();
  }, [enabled]);
  const toggle = useCallback(() => setEnabled(v => !v), []);
  const value = useMemo(() => ({ enabled, toggle, setEnabled }), [enabled, toggle]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
