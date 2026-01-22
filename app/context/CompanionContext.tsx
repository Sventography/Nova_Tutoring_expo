import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Ctx = {
  equippedCompanionId: string | null;
  toggleCompanion: (id: string) => void;
  setEquippedCompanionId: (id: string | null) => void;
};

const KEY = "companion.equipped.v1";
const CompanionContext = createContext<Ctx | null>(null);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [equippedCompanionId, setEquippedCompanionId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY);
        if (!alive) return;
        setEquippedCompanionId(v ? v : null);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (equippedCompanionId) await AsyncStorage.setItem(KEY, equippedCompanionId);
        else await AsyncStorage.removeItem(KEY);
      } catch {}
    })();
  }, [equippedCompanionId]);

  const toggleCompanion = (id: string) => {
    setEquippedCompanionId((cur) => (cur === id ? null : id));
  };

  const value = useMemo(
    () => ({ equippedCompanionId, toggleCompanion, setEquippedCompanionId }),
    [equippedCompanionId]
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used inside <CompanionProvider>");
  return ctx;
}
