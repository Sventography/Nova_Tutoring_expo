import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type StreakCtx = {
  days: number;
  setDays: (n: number) => void;
};
const KEY = "@nova/streak-days";
const Ctx = createContext<StreakCtx | null>(null);

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw != null) {
          const n = parseInt(raw, 10);
          if (!Number.isNaN(n)) setDays(n);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, String(days)).catch(() => {});
  }, [days]);

  const value = useMemo(() => ({ days, setDays }), [days]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStreak() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStreak must be used inside StreakProvider");
  return v;
}
